import { describe, it, expect } from 'vitest'
import { parseScheduled, nextOccurrence, actionToken } from './reminder-shared'

describe('parseScheduled', () => {
  it('interprets a bare YYYY-MM-DDTHH:mm string as +06:00', () => {
    const bare = '2026-07-05T09:30'
    const expected = Date.parse(`${bare}+06:00`)
    expect(parseScheduled(bare)).toBe(expected)
    expect(Number.isFinite(parseScheduled(bare))).toBe(true)
  })

  it('parses a full ISO string with Z as-is', () => {
    const iso = '2026-07-05T03:30:00Z'
    expect(parseScheduled(iso)).toBe(Date.parse(iso))
  })

  it('parses a string that already carries an explicit offset as-is', () => {
    const withOffset = '2026-07-05T09:30:00+06:00'
    expect(parseScheduled(withOffset)).toBe(Date.parse(withOffset))
  })

  it('returns NaN for empty or invalid input', () => {
    expect(parseScheduled()).toBeNaN()
    expect(parseScheduled('')).toBeNaN()
    expect(parseScheduled('not-a-date')).toBeNaN()
  })
})

describe('nextOccurrence', () => {
  // Fixed reference "now": 2026-06-05 12:00 Dhaka wall-clock.
  const now = Date.parse('2026-06-05T12:00:00+06:00')

  it('advances a past daily reminder until strictly in the future, preserving time-of-day', () => {
    const result = nextOccurrence('2026-01-01T09:30', 1, 'days', now)
    expect(parseScheduled(result)).toBeGreaterThan(now)
    // Time-of-day (Dhaka wall clock) is preserved.
    expect(result.endsWith('09:30')).toBe(true)
  })

  it('advances a past weekly reminder into the future', () => {
    const result = nextOccurrence('2026-01-01T09:30', 1, 'weeks', now)
    expect(parseScheduled(result)).toBeGreaterThan(now)
    expect(result.endsWith('09:30')).toBe(true)
  })

  it('advances monthly steps landing on the same day-of-month', () => {
    const result = nextOccurrence('2026-01-15T09:30', 1, 'months', now)
    expect(parseScheduled(result)).toBeGreaterThan(now)
    // Same day-of-month (15) and same time-of-day preserved.
    expect(result.slice(8, 10)).toBe('15')
    expect(result.endsWith('09:30')).toBe(true)
    // First occurrence after 2026-06-05 12:00 is 2026-06-15 09:30.
    expect(result).toBe('2026-06-15T09:30')
  })

  it('honors an interval greater than 1', () => {
    const result = nextOccurrence('2026-01-01T09:30', 3, 'days', now)
    expect(parseScheduled(result)).toBeGreaterThan(now)
    expect(result.endsWith('09:30')).toBe(true)
  })
})

describe('actionToken', () => {
  it('is deterministic for the same (docPath, scheduledTime) and secret', () => {
    process.env.CRON_SECRET = 'test-secret'
    const a = actionToken('users/u1/reminders/r1', '2026-07-05T09:30')
    const b = actionToken('users/u1/reminders/r1', '2026-07-05T09:30')
    expect(a).toBe(b)
  })

  it('produces a 32-character lowercase hex string', () => {
    process.env.CRON_SECRET = 'test-secret'
    const token = actionToken('users/u1/reminders/r1', '2026-07-05T09:30')
    expect(token).toMatch(/^[0-9a-f]{32}$/)
  })

  it('differs when the scheduledTime differs', () => {
    process.env.CRON_SECRET = 'test-secret'
    const a = actionToken('users/u1/reminders/r1', '2026-07-05T09:30')
    const b = actionToken('users/u1/reminders/r1', '2026-07-05T10:30')
    expect(a).not.toBe(b)
  })
})
