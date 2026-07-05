import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getAdminDb } from '@/lib/firebase-admin'
import type { Reminder } from '@/lib/types'
import { actionToken, nextOccurrence, toDhakaLocalString } from '@/lib/reminder-shared'

// Called by the service worker when the user taps a notification action
// (✓ সম্পন্ন / +১ ঘন্টা). Auth: HMAC token from the push payload — bound to
// the doc and the scheduledTime the notification was sent for, so it can't
// be forged or reused across reminders.

export const maxDuration = 30

const safeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { docPath?: string; token?: string; action?: string }
    const { docPath, token, action } = body
    if (!docPath || !token || (action !== 'done' && action !== 'snooze')) {
      return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 })
    }
    // Only reminder docs are actionable.
    if (!/^users\/[^/]+\/reminders\/[^/]+$/.test(docPath)) {
      return NextResponse.json({ ok: false, error: 'Bad path' }, { status: 400 })
    }

    const db = getAdminDb()
    const ref = db.doc(docPath)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    }
    const r = snap.data() as Reminder & { notifiedFor?: string }

    // The token was minted for the scheduledTime at send; repetitive reminders
    // may have auto-advanced since, in which case notifiedFor holds that value.
    const valid =
      safeEqual(token, actionToken(docPath, r.scheduledTime)) ||
      (r.notifiedFor ? safeEqual(token, actionToken(docPath, r.notifiedFor)) : false)
    if (!valid) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (action === 'snooze') {
      // +1 hour from now; clears nothing else — it will fire again then.
      const snoozed = toDhakaLocalString(Date.now() + 60 * 60 * 1000)
      await ref.update({ scheduledTime: snoozed })
      return NextResponse.json({ ok: true, action, scheduledTime: snoozed })
    }

    // action === 'done'
    if (r.isRepetitive && r.repeatType) {
      // Log a completed occurrence; scheduledTime already advanced at send,
      // but advance again defensively if it is somehow still in the past.
      const occurrence = {
        id: `occ_${Date.now().toString(36)}`,
        scheduledTime: r.notifiedFor || r.scheduledTime,
        completedTime: new Date().toISOString(),
      }
      const updates: Record<string, unknown> = {
        completionCount: (r.completionCount || 0) + 1,
        occurrences: [...(r.occurrences || []), occurrence],
      }
      const stillPast = new Date(r.scheduledTime).getTime() <= Date.now()
      if (stillPast) {
        updates.scheduledTime = nextOccurrence(r.scheduledTime, r.repeatInterval || 1, r.repeatType)
      }
      await ref.update(updates)
    } else {
      await ref.update({ dismissed: true })
    }
    return NextResponse.json({ ok: true, action })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'action failed'
    console.error('Reminder action failed:', error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
