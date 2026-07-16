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

    // ---- Monthly report: on the 1st of each month at 09:00 (Asia/Dhaka) send
    // every user a summary push of last month's money movement. Deduped per
    // month via users/{uid}.monthlyReportFor. Runs at most in the 09:xx hour
    // of day 1, so the extra collection reads happen ~60 cron hits per month.
    const DHAKA = 6 * 60 * 60 * 1000
    const dhakaNow = new Date(now + DHAKA)
    const monthlyWindow = dhakaNow.getUTCDate() === 1 && dhakaNow.getUTCHours() === 9
    type MonthlyReport = { uid: string; lent: number; received: number; borrowed: number; repaid: number }
    const monthly: MonthlyReport[] = []
    if (monthlyWindow) {
      // Previous month range in Dhaka wall clock.
      const mStart = Date.UTC(dhakaNow.getUTCFullYear(), dhakaNow.getUTCMonth() - 1, 1) - DHAKA
      const mEnd = Date.UTC(dhakaNow.getUTCFullYear(), dhakaNow.getUTCMonth(), 1) - DHAKA
      const monthKey = new Date(mStart + DHAKA).toISOString().slice(0, 7)
      const inMonth = (v?: string) => {
        if (!v) return false
        const ms = new Date(v).getTime()
        return Number.isFinite(ms) && ms >= mStart && ms < mEnd
      }
      const acc = new Map<string, MonthlyReport>()
      const bump = (uid: string, k: 'lent' | 'received' | 'borrowed' | 'repaid', amt: number) => {
        if (!amt) return
        const rec = acc.get(uid) || { uid, lent: 0, received: 0, borrowed: 0, repaid: 0 }
        rec[k] += amt
        acc.set(uid, rec)
      }
      type MoneyDoc = { amount?: number; date?: string; deletedAt?: string; payments?: { amount?: number; date?: string }[]; increases?: { amount?: number; date?: string }[] }
      const [debtsSnap, loansSnap] = await Promise.all([
        db.collectionGroup('debts').get(),
        db.collectionGroup('loans').get(),
      ])
      debtsSnap.docs.forEach((docSnap) => {
        const uid = docSnap.ref.parent.parent?.id
        if (!uid) return
        const d = docSnap.data() as MoneyDoc
        if (d.deletedAt) return
        if (inMonth(d.date)) bump(uid, 'lent', d.amount || 0)
        ;(d.increases || []).forEach((i) => { if (inMonth(i.date)) bump(uid, 'lent', i.amount || 0) })
        ;(d.payments || []).forEach((p) => { if (inMonth(p.date)) bump(uid, 'received', p.amount || 0) })
      })
      loansSnap.docs.forEach((docSnap) => {
        const uid = docSnap.ref.parent.parent?.id
        if (!uid) return
        const l = docSnap.data() as MoneyDoc
        if (l.deletedAt) return
        if (inMonth(l.date)) bump(uid, 'borrowed', l.amount || 0)
        ;(l.increases || []).forEach((i) => { if (inMonth(i.date)) bump(uid, 'borrowed', i.amount || 0) })
        ;(l.payments || []).forEach((p) => { if (inMonth(p.date)) bump(uid, 'repaid', p.amount || 0) })
      })
      // Dedupe: only users not yet reported for this month.
      const candidates = Array.from(acc.values()).filter((r) => r.lent || r.received || r.borrowed || r.repaid)
      const checks = await Promise.all(
        candidates.map(async (r) => {
          const uSnap = await db.doc(`users/${r.uid}`).get()
          const sentFor = (uSnap.data() as { monthlyReportFor?: string } | undefined)?.monthlyReportFor
          return sentFor === monthKey ? null : r
        })
      )
      checks.forEach((r) => { if (r) monthly.push(r) })
      // Stamp immediately so a crash mid-send doesn't re-spam next minute.
      await Promise.all(monthly.map((r) => db.doc(`users/${r.uid}`).set({ monthlyReportFor: monthKey }, { merge: true }).catch(() => {})))
    }

    if (due.length === 0 && monthly.length === 0) {
      return NextResponse.json({ ok: true, due: 0, sent: 0 })
    }

    // Load push subscriptions for the affected users only.
    const uids = Array.from(new Set([...due.map((d) => d.uid), ...monthly.map((m) => m.uid)]))
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

    // Monthly report pushes (already deduped + stamped above).
    const fmtT = (n: number) => `৳${Math.round(n).toLocaleString('en-IN')}`
    for (const m of monthly) {
      const subs = subsByUid.get(m.uid) || []
      const payload = JSON.stringify({
        title: 'গত মাসের হিসাব — LifeTrack',
        body: `দিয়েছি ${fmtT(m.lent)} · ফেরত পেয়েছি ${fmtT(m.received)} · নিয়েছি ${fmtT(m.borrowed)} · ফেরত দিয়েছি ${fmtT(m.repaid)}`,
        tag: `monthly-report`,
        data: { url: '/statement' },
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
              expired++
              await sub.ref.delete().catch(() => {})
            }
          }
        })
      )
    }

    return NextResponse.json({ ok: true, due: due.length, monthly: monthly.length, sent, expired })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'notify failed'
    console.error('Notify failed:', error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
