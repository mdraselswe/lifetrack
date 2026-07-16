import { createHmac } from 'crypto'

// Server-side helpers shared by /api/notify and /api/reminder-action.

// scheduledTime is stored in mixed formats: bare "YYYY-MM-DDTHH:mm" strings
// come from datetime-local inputs (Bangladesh wall-clock time), reschedules
// store full ISO with Z. Bare strings are interpreted as +06:00.
export const parseScheduled = (s?: string): number => {
  if (!s) return NaN
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(s)
  // A date-only "YYYY-MM-DD" has no time — "2026-06-15+06:00" is Invalid Date,
  // so pad it to midnight before appending the zone.
  const withTime = s.includes('T') ? s : `${s}T00:00`
  const d = new Date(hasZone ? s : `${withTime}+06:00`)
  return d.getTime()
}

// Render a timestamp as a bare +06:00 wall-clock "YYYY-MM-DDTHH:mm" string —
// the same shape the app's datetime-local inputs produce.
export const toDhakaLocalString = (ms: number): string =>
  new Date(ms + 6 * 60 * 60 * 1000).toISOString().slice(0, 16)

// Next occurrence of a repetitive reminder, advanced until it is in the future.
export const nextOccurrence = (
  scheduledTime: string,
  interval: number,
  type: 'days' | 'weeks' | 'months',
  now = Date.now()
): string => {
  const step = Math.max(1, interval || 1)
  let ms = parseScheduled(scheduledTime)
  if (!Number.isFinite(ms)) ms = now
  // Work on the +06:00 wall clock so month steps land on the same date/time.
  const wall = new Date(ms + 6 * 60 * 60 * 1000)
  let guard = 0
  while (wall.getTime() - 6 * 60 * 60 * 1000 <= now && guard < 500) {
    if (type === 'days') wall.setUTCDate(wall.getUTCDate() + step)
    else if (type === 'weeks') wall.setUTCDate(wall.getUTCDate() + step * 7)
    else wall.setUTCMonth(wall.getUTCMonth() + step)
    guard++
  }
  return wall.toISOString().slice(0, 16)
}

// HMAC token embedded in the push payload so notification action buttons can
// authenticate without a user session. Bound to the doc + the scheduledTime
// the notification was sent for.
export const actionToken = (docPath: string, scheduledTime: string): string => {
  const secret = process.env.CRON_SECRET || ''
  return createHmac('sha256', secret).update(`${docPath}|${scheduledTime}`).digest('hex').slice(0, 32)
}
