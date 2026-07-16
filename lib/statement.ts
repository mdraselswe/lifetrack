import { getDebts, getLoans } from './storage'
import { round2 } from './format'
import type { Debt, Loan } from './types'

// A statement summarises money movement over a custom date range, grouped by
// person. Four flows are tracked per person:
//   lent     — you gave them money (debt created + debt amount increases)
//   received — they returned money to you (debt payments)
//   borrowed — you took money from them (loan created + loan increases)
//   repaid   — you returned money to them (loan payments)
// net = money in − money out for that person in the period
//     = (received + borrowed) − (lent + repaid)

export type FlowKind = 'lent' | 'received' | 'borrowed' | 'repaid'

export interface StatementEvent {
  date: string
  kind: FlowKind
  amount: number
  note?: string
}

export interface PersonStatement {
  person: string
  lent: number
  received: number
  borrowed: number
  repaid: number
  net: number
  events: StatementEvent[]
}

export interface StatementSummary {
  lent: number
  received: number
  borrowed: number
  repaid: number
  moneyIn: number
  moneyOut: number
  net: number
  personCount: number
  eventCount: number
}

export interface Statement {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
  persons: PersonStatement[]
  summary: StatementSummary
}

// Inclusive range test on a stored ISO date string, compared date-only in the
// user's local timezone so "July 14" statements include events from any time
// that day regardless of the stored time component.
const makeRangeTest = (from: string, to: string) => {
  const start = new Date(`${from}T00:00:00`).getTime()
  const end = new Date(`${to}T23:59:59.999`).getTime()
  return (dateStr?: string): boolean => {
    if (!dateStr) return false
    const t = new Date(dateStr).getTime()
    return Number.isFinite(t) && t >= start && t <= end
  }
}

// Accumulator keyed by person name.
type Acc = Record<string, PersonStatement>

const ensure = (acc: Acc, name: string): PersonStatement => {
  const key = name || '—'
  if (!acc[key]) {
    acc[key] = { person: key, lent: 0, received: 0, borrowed: 0, repaid: 0, net: 0, events: [] }
  }
  return acc[key]
}

const addDebt = (acc: Acc, d: Debt, inRange: (s?: string) => boolean) => {
  const p = ensure(acc, d.personName)
  // Initial principal counts as "lent" on the debt's own date.
  if (inRange(d.date) && d.amount) {
    p.lent = round2(p.lent + d.amount)
    p.events.push({ date: d.date, kind: 'lent', amount: d.amount, note: d.reason })
  }
  ;(d.increases || []).forEach((inc) => {
    if (inRange(inc.date) && inc.amount) {
      p.lent = round2(p.lent + inc.amount)
      p.events.push({ date: inc.date, kind: 'lent', amount: inc.amount, note: inc.reason })
    }
  })
  ;(d.payments || []).forEach((pay) => {
    if (inRange(pay.date) && pay.amount) {
      p.received = round2(p.received + pay.amount)
      p.events.push({ date: pay.date, kind: 'received', amount: pay.amount, note: pay.note })
    }
  })
}

const addLoan = (acc: Acc, l: Loan, inRange: (s?: string) => boolean) => {
  const p = ensure(acc, l.personName)
  if (inRange(l.date) && l.amount) {
    p.borrowed = round2(p.borrowed + l.amount)
    p.events.push({ date: l.date, kind: 'borrowed', amount: l.amount, note: l.reason })
  }
  ;(l.increases || []).forEach((inc) => {
    if (inRange(inc.date) && inc.amount) {
      p.borrowed = round2(p.borrowed + inc.amount)
      p.events.push({ date: inc.date, kind: 'borrowed', amount: inc.amount, note: inc.reason })
    }
  })
  ;(l.payments || []).forEach((pay) => {
    if (inRange(pay.date) && pay.amount) {
      p.repaid = round2(p.repaid + pay.amount)
      p.events.push({ date: pay.date, kind: 'repaid', amount: pay.amount, note: pay.note })
    }
  })
}

export async function buildStatement(from: string, to: string): Promise<Statement> {
  const [debts, loans] = await Promise.all([getDebts(), getLoans()])
  const inRange = makeRangeTest(from, to)

  const acc: Acc = {}
  // Trashed (soft-deleted) records are excluded from statements.
  debts.filter((d) => !d.deletedAt).forEach((d) => addDebt(acc, d, inRange))
  loans.filter((l) => !l.deletedAt).forEach((l) => addLoan(acc, l, inRange))

  const persons = Object.values(acc)
    // Drop people with no activity in the window.
    .filter((p) => p.events.length > 0)
    .map((p) => {
      p.net = round2(p.received + p.borrowed - p.lent - p.repaid)
      p.events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      return p
    })
    // Largest absolute movement first.
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.person.localeCompare(b.person))

  const summary: StatementSummary = persons.reduce<StatementSummary>(
    (s, p) => {
      s.lent = round2(s.lent + p.lent)
      s.received = round2(s.received + p.received)
      s.borrowed = round2(s.borrowed + p.borrowed)
      s.repaid = round2(s.repaid + p.repaid)
      s.eventCount += p.events.length
      return s
    },
    { lent: 0, received: 0, borrowed: 0, repaid: 0, moneyIn: 0, moneyOut: 0, net: 0, personCount: persons.length, eventCount: 0 }
  )
  summary.moneyIn = round2(summary.received + summary.borrowed)
  summary.moneyOut = round2(summary.lent + summary.repaid)
  summary.net = round2(summary.moneyIn - summary.moneyOut)

  return { from, to, persons, summary }
}
