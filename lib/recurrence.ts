import type { Reminder } from './types'

// Client-side recurrence helpers (device-local wall clock). The server twin
// lives in lib/reminder-shared.ts and works on the +06:00 wall clock — keep
// the stepping rules in sync when editing either.

// datetime-local expects a LOCAL time string; toISOString() is UTC, so we
// shift by the timezone offset before slicing to avoid an off-by-hours default.
export const toLocalDateTimeValue = (date: Date = new Date()): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

// Advance a repetitive reminder to its next future occurrence.
// Supports every-N days/weeks/months plus fixed weekday sets (0=Sun … 6=Sat).
export const nextOccurrenceLocal = (
  scheduledTime: string,
  interval: number,
  type: 'days' | 'weeks' | 'months' | 'weekdays',
  weekdays?: number[]
): string => {
  const step = Math.max(1, interval || 1)
  const d = new Date(scheduledTime)
  if (isNaN(d.getTime())) return toLocalDateTimeValue()
  const days = type === 'weekdays' && weekdays && weekdays.length > 0 ? weekdays : null
  let guard = 0
  while (d.getTime() <= Date.now() && guard < 500) {
    if (type === 'weekdays') {
      do {
        d.setDate(d.getDate() + 1)
        guard++
      } while (days && !days.includes(d.getDay()) && guard < 500)
    } else if (type === 'days') d.setDate(d.getDate() + step)
    else if (type === 'weeks') d.setDate(d.getDate() + step * 7)
    else d.setMonth(d.getMonth() + step)
    guard++
  }
  return toLocalDateTimeValue(d)
}

// Advance a reminder after completion. Returns the next scheduledTime, or
// null when the repeat has ended (past repeatUntil) and it should be finished.
export const advanceReminder = (r: Reminder): string | null => {
  if (!r.isRepetitive || !r.repeatType) return null
  const next = nextOccurrenceLocal(r.scheduledTime, r.repeatInterval || 1, r.repeatType, r.repeatWeekdays)
  if (r.repeatUntil && next.slice(0, 10) > r.repeatUntil) return null
  return next
}

// Current completion streak in days for a repetitive reminder: consecutive
// calendar days (ending today or yesterday) that have at least one completion.
export const completionStreakDays = (r: Reminder): number => {
  const occ = r.occurrences || []
  if (occ.length === 0) return 0
  const days = new Set(
    occ
      .map((o) => new Date(o.completedTime))
      .filter((d) => !isNaN(d.getTime()))
      .map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime())
  )
  const DAY = 24 * 60 * 60 * 1000
  const now = new Date()
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  // A streak may end yesterday (today's completion not done yet).
  if (!days.has(cursor)) cursor -= DAY
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor -= DAY
  }
  return streak
}
