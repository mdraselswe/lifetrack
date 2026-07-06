// How far BEFORE a due date the auto-reminder should fire.
export const LEAD_OPTIONS = ['onTime', 'h1', 'h3', 'd1', 'd2', 'd3', 'w1'] as const
export type LeadKey = (typeof LEAD_OPTIONS)[number]

const HOUR = 3600000
const DAY = 86400000
const MS: Record<LeadKey, number> = {
  onTime: 0,
  h1: HOUR,
  h3: 3 * HOUR,
  d1: DAY,
  d2: 2 * DAY,
  d3: 3 * DAY,
  w1: 7 * DAY,
}

export const leadMs = (k: LeadKey): number => MS[k] ?? 0

// Given the due date as a local 'YYYY-MM-DDTHH:mm' string, return the local
// datetime string at which the reminder should fire (due minus the lead).
export const dueReminderTime = (dueLocal: string, k: LeadKey): string => {
  const ms = new Date(dueLocal).getTime() - leadMs(k)
  if (!Number.isFinite(ms)) return dueLocal
  const d = new Date(ms)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
