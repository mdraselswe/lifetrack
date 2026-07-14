import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { getAdminDb } from '@/lib/firebase-admin'
import type { DocumentReference } from 'firebase-admin/firestore'
import type { Reminder } from '@/lib/types'
import { actionToken, nextOccurrence, parseScheduled, pastRepeatEnd } from '@/lib/reminder-shared'

// Hit by an external cron (cron-job.org) every minute with the CRON_SECRET.
// Finds due reminders across all users and delivers Web Push notifications,
// so reminders fire even when no tab is open. Also sends:
//  - lead notifications ("in X minutes") for reminders with leadMinutes set
//  - a daily 8am (Asia/Dhaka) digest push summarising the day's reminders

export const maxDuration = 60

type SubEntry = { ref: DocumentReference; endpoint: string; keys: Record<string, string> }

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000
const DIGEST_HOUR = 8 // 8am Dhaka

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    if (!vapidPublic || !vapidPrivate) throw new Error('VAPID keys are not set')
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@lifetrack.app', vapidPublic, vapidPrivate)

    const db = getAdminDb()
    const now = Date.now()
    const windowStart = now - 24 * 60 * 60 * 1000 // skip anything >24h stale

    // Dhaka wall clock for digest timing / day keys.
    const dhakaNow = new Date(now + DHAKA_OFFSET_MS)
    const dhakaDay = dhakaNow.toISOString().slice(0, 10)
    const digestWindow = dhakaNow.getUTCHours() === DIGEST_HOUR

    // Small dataset — read all reminders and filter in code.
    const snap = await db.collectionGroup('reminders').get()
    type Item = { uid: string; ref: DocumentReference; r: Reminder & { notifiedFor?: string; leadNotifiedFor?: string } }
    const due: Item[] = []
    const lead: Item[] = []
    // uid → active reminders scheduled today (Dhaka) — for the digest.
    const todays = new Map<string, (Reminder & { at: number })[]>()

    snap.docs.forEach((docSnap) => {
      const r = docSnap.data() as Item['r']
      const uid = docSnap.ref.parent.parent?.id
      if (!uid || r.dismissed) return
      const at = parseScheduled(r.scheduledTime)
      if (!Number.isFinite(at)) return

      // Digest bucket: anything scheduled later today (Dhaka wall clock).
      if (digestWindow && at > now) {
        const day = new Date(at + DHAKA_OFFSET_MS).toISOString().slice(0, 10)
        if (day === dhakaDay) {
          const list = todays.get(uid) || []
          list.push(Object.assign({}, r, { at }))
          todays.set(uid, list)
        }
      }

      // Lead notification: fire once inside the [at - lead, at) window.
      if (
        r.leadMinutes && r.leadMinutes > 0 && at > now &&
        at - r.leadMinutes * 60 * 1000 <= now &&
        r.leadNotifiedFor !== r.scheduledTime
      ) {
        lead.push({ uid, ref: docSnap.ref, r })
      }

      // Main notification.
      if (at > now || at < windowStart) return
      // Notify once per scheduledTime value; a reschedule/new occurrence re-arms it.
      if (r.notifiedFor === r.scheduledTime) return
      due.push({ uid, ref: docSnap.ref, r })
    })

    // Digest dedupe: one per user per Dhaka day.
    let digestUsers: { uid: string; items: (Reminder & { at: number })[] }[] = []
    if (digestWindow && todays.size > 0) {
      const checks = await Promise.all(
        Array.from(todays.entries()).map(async ([uid, items]) => {
          const userRef = db.doc(`users/${uid}`)
          const userSnap = await userRef.get()
          const sentFor = (userSnap.data() as { digestSentFor?: string } | undefined)?.digestSentFor
          return sentFor === dhakaDay ? null : { uid, items }
        })
      )
      digestUsers = checks.filter(Boolean) as typeof digestUsers
    }

    if (due.length === 0 && lead.length === 0 && digestUsers.length === 0) {
      return NextResponse.json({ ok: true, due: 0, sent: 0 })
    }

    // Load push subscriptions for the affected users only.
    const uids = Array.from(new Set([...due.map((d) => d.uid), ...lead.map((d) => d.uid), ...digestUsers.map((d) => d.uid)]))
    const subsByUid = new Map<string, SubEntry[]>()
    await Promise.all(
      uids.map(async (uid) => {
        const subsSnap = await db.collection(`users/${uid}/pushSubscriptions`).get()
        subsByUid.set(
          uid,
          subsSnap.docs
            .map((s) => {
              const data = s.data() as { endpoint?: string; keys?: Record<string, string> }
              return { ref: s.ref, endpoint: data.endpoint || '', keys: data.keys || {} }
            })
            .filter((s) => s.endpoint)
        )
      })
    )

    let sent = 0
    let expired = 0
    const sendToUser = async (uid: string, payload: string) => {
      const subs = subsByUid.get(uid) || []
      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
              payload
            )
            sent++
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode
            if (status === 404 || status === 410) {
              // Subscription expired/revoked — clean it up.
              expired++
              await sub.ref.delete().catch(() => {})
            } else {
              console.error('push send failed:', status, sub.endpoint.slice(0, 60))
            }
          }
        })
      )
    }

    // Lead ("upcoming") notifications — no action buttons, no advance.
    for (const item of lead) {
      const mins = Math.max(1, Math.round((parseScheduled(item.r.scheduledTime) - now) / 60000))
      await sendToUser(
        item.uid,
        JSON.stringify({
          title: item.r.title || 'LifeTrack',
          body: `${mins} মিনিট পরে`,
          tag: `lead-${item.r.id || item.ref.id}`,
          data: { url: '/reminders', reminderId: item.ref.id },
        })
      )
      await item.ref.update({ leadNotifiedFor: item.r.scheduledTime }).catch(() => {})
    }

    // Due notifications.
    for (const item of due) {
      const payload = JSON.stringify({
        title: item.r.title || 'LifeTrack',
        body: item.r.description || 'রিমাইন্ডার',
        // Same tag as the in-page scheduler so an open tab replaces (not doubles)
        tag: String(item.r.id || item.ref.id),
        data: {
          url: '/reminders',
          reminderId: item.ref.id,
          docPath: item.ref.path,
          // Lets the notification's done/snooze buttons authenticate.
          token: actionToken(item.ref.path, item.r.scheduledTime),
        },
      })
      await sendToUser(item.uid, payload)
      // Mark as notified for this scheduledTime regardless of per-device outcomes,
      // so a broken subscription doesn't cause repeat sends every minute.
      // Repetitive reminders auto-advance to their next occurrence so they
      // keep firing without the user manually completing each one; a repeat
      // whose end date has passed is finished (dismissed) instead.
      const updates: Record<string, string | boolean> = { notifiedFor: item.r.scheduledTime }
      if (item.r.isRepetitive && item.r.repeatType) {
        const next = nextOccurrence(
          item.r.scheduledTime,
          item.r.repeatInterval || 1,
          item.r.repeatType,
          now,
          item.r.repeatWeekdays
        )
        if (pastRepeatEnd(next, item.r.repeatUntil)) {
          updates.dismissed = true
        } else {
          updates.scheduledTime = next
        }
      }
      await item.ref.update(updates).catch(() => {})
    }

    // Daily digest.
    for (const { uid, items } of digestUsers) {
      const count = items.length
      const titles = items
        .sort((a, b) => a.at - b.at)
        .slice(0, 3)
        .map((r) => r.title)
        .join(', ')
      await sendToUser(
        uid,
        JSON.stringify({
          title: `আজ ${count}টি রিমাইন্ডার`,
          body: titles + (count > 3 ? '…' : ''),
          tag: `digest-${dhakaDay}`,
          data: { url: '/reminders' },
        })
      )
      await db.doc(`users/${uid}`).set({ digestSentFor: dhakaDay }, { merge: true }).catch(() => {})
    }

    return NextResponse.json({ ok: true, due: due.length, lead: lead.length, digest: digestUsers.length, sent, expired })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'notify failed'
    console.error('Notify failed:', error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
