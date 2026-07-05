import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { getAdminDb } from '@/lib/firebase-admin'
import type { DocumentReference } from 'firebase-admin/firestore'
import type { Reminder } from '@/lib/types'
import { actionToken, nextOccurrence, parseScheduled } from '@/lib/reminder-shared'

// Hit by an external cron (cron-job.org) every minute with the CRON_SECRET.
// Finds due reminders across all users and delivers Web Push notifications,
// so reminders fire even when no tab is open.

export const maxDuration = 60

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

    // Small dataset — read all reminders and filter in code.
    const snap = await db.collectionGroup('reminders').get()
    type Due = { uid: string; ref: DocumentReference; r: Reminder }
    const due: Due[] = []
    snap.docs.forEach((docSnap) => {
      const r = docSnap.data() as Reminder & { notifiedFor?: string }
      const uid = docSnap.ref.parent.parent?.id
      if (!uid || r.dismissed) return
      const at = parseScheduled(r.scheduledTime)
      if (!Number.isFinite(at) || at > now || at < windowStart) return
      // Notify once per scheduledTime value; a reschedule/new occurrence re-arms it.
      if ((r as { notifiedFor?: string }).notifiedFor === r.scheduledTime) return
      due.push({ uid, ref: docSnap.ref, r })
    })

    if (due.length === 0) {
      return NextResponse.json({ ok: true, due: 0, sent: 0 })
    }

    // Load push subscriptions for the affected users only.
    const uids = Array.from(new Set(due.map((d) => d.uid)))
    const subsByUid = new Map<string, { ref: DocumentReference; endpoint: string; keys: Record<string, string> }[]>()
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
    for (const item of due) {
      const subs = subsByUid.get(item.uid) || []
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
      // Mark as notified for this scheduledTime regardless of per-device outcomes,
      // so a broken subscription doesn't cause repeat sends every minute.
      // Repetitive reminders auto-advance to their next occurrence so they
      // keep firing without the user manually completing each one.
      const updates: Record<string, string> = { notifiedFor: item.r.scheduledTime }
      if (item.r.isRepetitive && item.r.repeatType) {
        updates.scheduledTime = nextOccurrence(item.r.scheduledTime, item.r.repeatInterval || 1, item.r.repeatType)
      }
      await item.ref.update(updates).catch(() => {})
    }

    return NextResponse.json({ ok: true, due: due.length, sent, expired })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'notify failed'
    console.error('Notify failed:', error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
