import { getDebts, getLoans, getReminders, getExpenses, saveDebt, saveLoan, saveReminder, saveExpense } from './storage'
import type { Debt, Loan, Reminder, Expense } from './types'

// Client-side backup: downloads the signed-in user's own data as a JSON file.
// No server, no secret — a quick manual safety net alongside the daily Sheet backup.
export async function exportMyData(email?: string | null): Promise<void> {
  const [debts, loans, reminders, expenses] = await Promise.all([
    getDebts(),
    getLoans(),
    getReminders(),
    getExpenses(),
  ])

  const payload = {
    app: 'LifeTrack',
    exportedAt: new Date().toISOString(),
    account: email || null,
    counts: { debts: debts.length, loans: loans.length, reminders: reminders.length, expenses: expenses.length },
    debts,
    loans,
    reminders,
    expenses,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `lifetrack-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Restore from a LifeTrack backup JSON. ADDITIVE: docs are re-created with new
// ids alongside whatever exists (no wipe, no merge-by-id) — safe to run on a
// fresh account after data loss, which is the scenario this exists for.
export interface ImportResult {
  debts: number
  loans: number
  reminders: number
  expenses: number
}

export async function importMyData(file: File): Promise<ImportResult> {
  const text = await file.text()
  const data = JSON.parse(text) as { app?: string; debts?: Debt[]; loans?: Loan[]; reminders?: Reminder[]; expenses?: Expense[] }
  if (data.app !== 'LifeTrack') throw new Error('not-a-lifetrack-backup')

  const debts = Array.isArray(data.debts) ? data.debts : []
  const loans = Array.isArray(data.loans) ? data.loans : []
  const reminders = Array.isArray(data.reminders) ? data.reminders : []
  const expenses = Array.isArray(data.expenses) ? data.expenses : []

  // Sequential writes: Firestore handles bursts fine, but sequencing keeps the
  // failure point obvious (partial import stops at the first bad record).
  for (const d of debts) await saveDebt(d)
  for (const l of loans) await saveLoan(l)
  for (const r of reminders) await saveReminder(r)
  for (const e of expenses) await saveExpense(e)

  return { debts: debts.length, loans: loans.length, reminders: reminders.length, expenses: expenses.length }
}
