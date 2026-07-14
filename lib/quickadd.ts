// Rule-based Bengali/English quick-add parser for reminders.
// "কাল সকাল ৯টায় ওষুধ" → { title: 'ওষুধ', when: tomorrow 09:00 }
// "bill friday 5pm"     → { title: 'bill', when: next Friday 17:00 }
// Best-effort: anything not recognized stays in the title.

const BN_DIGITS: Record<string, string> = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' }
const toLatinDigits = (s: string) => s.replace(/[০-৯]/g, (d) => BN_DIGITS[d])

// NOTE: \b does not work around Bengali letters (JS \b is ASCII-word based),
// so every word pattern is anchored on whitespace instead. The input text is
// padded with spaces, and matches consume their surrounding spaces — the
// replacement below puts a single space back.
const word = (alternatives: string) => new RegExp(`(?:^|\\s)(?:${alternatives})(?=\\s|$)`, 'i')

// Day words → offset in days (relative), resolved against today.
const DAY_WORDS: [RegExp, number][] = [
  [word('আজকে|আজ|today'), 0],
  [word('আগামীকাল|কালকে|কাল|tomorrow|tmrw|tmr'), 1],
  [word('পরশু'), 2],
]

// Weekday words → JS weekday index (0=Sun).
const WEEKDAYS: [RegExp, number][] = [
  [word('রবিবার|রবি|sunday|sun'), 0],
  [word('সোমবার|সোম|monday|mon'), 1],
  [word('মঙ্গলবার|মঙ্গল|tuesday|tues|tue'), 2],
  [word('বুধবার|বুধ|wednesday|wed'), 3],
  [word('বৃহস্পতিবার|বৃহস্পতি|thursday|thurs|thu'), 4],
  [word('শুক্রবার|শুক্র|friday|fri'), 5],
  [word('শনিবার|শনি|saturday|sat'), 6],
]

// Period words → default hour + am/pm interpretation for a bare hour number.
const PERIODS: [RegExp, { defaultHour: number; pm: boolean }][] = [
  [word('ভোরে|ভোর'), { defaultHour: 6, pm: false }],
  [word('সকালে|সকাল|morning'), { defaultHour: 9, pm: false }],
  [word('দুপুরে|দুপুর|noon'), { defaultHour: 13, pm: true }],
  [word('বিকালে|বিকাল|বিকেলে|বিকেল|afternoon'), { defaultHour: 16, pm: true }],
  [word('সন্ধ্যায়|সন্ধ্যা|evening'), { defaultHour: 19, pm: true }],
  [word('রাতে|রাত|night'), { defaultHour: 21, pm: true }],
]

export interface QuickAddResult {
  title: string
  when: Date | null // null → nothing time-like recognized
}

export function parseQuickAdd(inputRaw: string): QuickAddResult {
  let text = ` ${toLatinDigits(inputRaw.trim())} `
  const now = new Date()
  let dayOffset: number | null = null
  let weekday: number | null = null
  let hour: number | null = null
  let minute = 0
  let pmHint: boolean | null = null

  const strip = (re: RegExp) => {
    text = text.replace(re, ' ')
  }
  for (const [re, offset] of DAY_WORDS) {
    if (re.test(text)) {
      dayOffset = offset
      strip(re)
      break
    }
  }
  if (dayOffset === null) {
    for (const [re, wd] of WEEKDAYS) {
      if (re.test(text)) {
        weekday = wd
        strip(re)
        break
      }
    }
  }
  for (const [re, p] of PERIODS) {
    if (re.test(text)) {
      hour = p.defaultHour
      pmHint = p.pm
      strip(re)
      break
    }
  }

  // Explicit times: "9:30", "9.30", "9টা(য়)", "9pm", bare "9" only if a period/day word present.
  const timeMatch =
    text.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i) ||
    text.match(/(\d{1,2})\s*(?:টায়|টা|am|pm|ta)/i)
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10)
    if (h >= 0 && h <= 23) {
      hour = h
      minute = timeMatch[2] && /^\d{2}$/.test(timeMatch[2]) ? parseInt(timeMatch[2], 10) : 0
      const ampm = (timeMatch[3] || timeMatch[0].match(/am|pm/i)?.[0] || '').toLowerCase()
      if (ampm === 'pm' && hour < 12) hour += 12
      else if (ampm === 'am' && hour === 12) hour = 0
      // Bengali convention: "রাত ৯টা" = 21:00, "দুপুর ২টা" = 14:00.
      else if (!ampm && pmHint && hour < 12 && hour !== 0) {
        // Periods like দুপুর/বিকাল/সন্ধ্যা/রাত imply afternoon/evening hours.
        if (hour <= 11) hour += 12
      }
      if (minute > 59) minute = 0
      text = text.replace(timeMatch[0], ' ')
    }
  }

  const title = text.replace(/\s+/g, ' ').trim()
  if (dayOffset === null && weekday === null && hour === null) {
    return { title: title || inputRaw.trim(), when: null }
  }

  const when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour ?? 9, minute, 0, 0)
  if (dayOffset !== null) {
    when.setDate(when.getDate() + dayOffset)
  } else if (weekday !== null) {
    let diff = (weekday - when.getDay() + 7) % 7
    if (diff === 0 && when.getTime() <= now.getTime()) diff = 7 // "friday" on a Friday evening → next week
    when.setDate(when.getDate() + diff)
  }
  // A pure time today that already passed rolls to tomorrow.
  if (when.getTime() <= now.getTime() && dayOffset === null && weekday === null) {
    when.setDate(when.getDate() + 1)
  }

  return { title: title || inputRaw.trim(), when }
}
