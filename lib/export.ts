import { getDebts, getLoans, getReminders } from './storage'

// Client-side backup: downloads the signed-in user's own data as a JSON file.
// No server, no secret — a quick manual safety net alongside the daily Sheet backup.
export async function exportMyData(email?: string | null): Promise<void> {
  const [debts, loans, reminders] = await Promise.all([
    getDebts(),
    getLoans(),
    getReminders(),
  ])

  const payload = {
    app: 'LifeTrack',
    exportedAt: new Date().toISOString(),
    account: email || null,
    counts: { debts: debts.length, loans: loans.length, reminders: reminders.length },
    debts,
    loans,
    reminders,
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
