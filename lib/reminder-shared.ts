import { createHmac } from 'crypto'

// Server-side helpers shared by /api/notify and /api/reminder-action.

// scheduledTime is stored in mixed formats: bare "YYYY-MM-DDTHH:mm" strings
// come from datetime-local inputs (Bangladesh wall-clock time), reschedules
// store full ISO with Z. Bare strings are interpreted as +06:00.
export const parseScheduled = (s?: string): number => {
  if (!s) return NaN
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(s)
  const d = new Date(hasZone ? s : `${s}+06:00`)
  return d.getTime()
}

// Render a timestamp as a bare +06:00 wall-clock "YYYY-MM-DDTHH:mm" string —
// the same shape the app's datetime-local inputs produce.
export const toDhakaLocalString = (ms: number): string =>
  new Date(ms + 6 * 60 * 60 * 1000).toISOString().slice(0, 16)

export type RepeatType = 'days' | 'weeks' | 'months' | 'weekdays'

// Next occurrence of a repetitive reminder, advanced until it is in the future.
// 'weekdays' repeats on a fixed set of weekdays (0=Sun … 6=Sat, +06:00 wall clock).
export const nextOccurrence = (
  scheduledTime: string,
  interval: number,
  type: RepeatType,
  now = Date.now(),
  weekdays?: number[]
): string => {
  const step = Math.max(1, interval || 1)
  let ms = parseScheduled(scheduledTime)
  if (!Number.isFinite(ms)) ms = now
  // Work on the +06:00 wall clock so month steps land on the same date/time.
  const wall = new Date(ms + 6 * 60 * 60 * 1000)
  const days = type === 'weekdays' && weekdays && weekdays.length > 0 ? weekdays : null
  let guard = 0
  while (wall.getTime() - 6 * 60 * 60 * 1000 <= now && guard < 500) {
    if (type === 'weekdays') {
      // Step one day at a time until we land on an allowed weekday.
      do {
        wall.setUTCDate(wall.getUTCDate() + 1)
        guard++
      } while (days && !days.includes(wall.getUTCDay()) && guard < 500)
    } else if (type === 'days') wall.setUTCDate(wall.getUTCDate() + step)
    else if (type === 'weeks') wall.setUTCDate(wall.getUTCDate() + step * 7)
    else wall.setUTCMonth(wall.getUTCMonth() + step)
    guard++
  }
  return wall.toISOString().slice(0, 16)
}

// True when a repeat's end date (YYYY-MM-DD, +06:00 wall clock) is behind the
// given occurrence string — the reminder should stop repeating.
export const pastRepeatEnd = (occurrence: string, repeatUntil?: string): boolean => {
  if (!repeatUntil) return false
  return occurrence.slice(0, 10) > repeatUntil
}

// HMAC token embedded in the push payload so notification action buttons can
// authenticate without a user session. Bound to the doc + the scheduledTime
// the notification was sent for.
export const actionToken = (docPath: string, scheduledTime: string): string => {
  const secret = process.env.CRON_SECRET || ''
  return createHmac('sha256', secret).update(`${docPath}|${scheduledTime}`).digest('hex').slice(0, 32)
}
