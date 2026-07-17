// User-owned Google Sheet backup. Writes a readable copy of the user's data
// (Lent / Borrowed / Expenses / Reminders tabs) into a spreadsheet in the USER'S
// OWN Google Drive, so they always have an independent, human-readable copy that
// survives anything happening to this app.
//
// Access uses Google Identity Services (GIS) with the NON-SENSITIVE `drive.file`
// scope — the app can only touch the one file it creates, so Google requires no
// app verification. The access token is short-lived and kept in memory only;
// there is no server-side storage of the user's Google credentials.
//
// Requires NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID (a Web OAuth client id from the
// Google Cloud console). Without it the feature reports "not configured".

import { getDebts, getLoans, getReminders, getExpenses, getUserPrefs, setUserPrefs } from './storage'
import { round2, num } from './format'
import { t, fmtDate } from './i18n'
import type { Debt, Loan } from './types'

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || ''
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const GIS_SRC = 'https://accounts.google.com/gsi/client'

export const isBackupConfigured = (): boolean => !!CLIENT_ID

// ---- GIS script + token client ----

interface TokenResponse { access_token?: string; expires_in?: number; error?: string }
interface TokenClient { requestAccessToken: (opts?: { prompt?: string }) => void }

let gisLoaded: Promise<void> | null = null
let tokenClient: TokenClient | null = null
let cached: { token: string; expiresAt: number } | null = null
let pending: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null

const loadGis = (): Promise<void> => {
  if (gisLoaded) return gisLoaded
  gisLoaded = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('no window')); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.accounts?.oauth2) { resolve(); return }
    const el = document.createElement('script')
    el.src = GIS_SRC
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(el)
  })
  return gisLoaded
}

const ensureClient = async () => {
  await loadGis()
  if (tokenClient) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp: TokenResponse) => {
      if (resp.error || !resp.access_token) {
        pending?.reject(new Error(resp.error || 'No access token'))
      } else {
        cached = { token: resp.access_token, expiresAt: Date.now() + (resp.expires_in || 3600) * 1000 }
        pending?.resolve(resp.access_token)
      }
      pending = null
    },
  })
}

// Load the GIS script + init the token client ahead of any user click, so that
// requestAccessToken can fire SYNCHRONOUSLY inside the click handler. If we only
// loaded it after the click (awaiting the network), the browser would drop the
// user-gesture and block the OAuth popup. Safe/idempotent — call on mount.
export const preloadBackup = async (): Promise<void> => {
  if (!CLIENT_ID) return
  try { await ensureClient() } catch { /* ignore — retried on click */ }
}

// Get a valid access token. `interactive` shows the consent/account popup (needed
// the first time); afterwards a silent request refreshes it without a popup.
const getToken = async (interactive: boolean): Promise<string> => {
  if (!CLIENT_ID) throw new Error('Backup not configured')
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token
  await ensureClient()
  return new Promise<string>((resolve, reject) => {
    pending = { resolve, reject }
    tokenClient!.requestAccessToken({ prompt: interactive ? 'consent' : '' })
  })
}

// ---- Sheets REST helpers ----

const api = async (url: string, token: string, init?: RequestInit) => {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text().catch(() => '')}`)
  return res.json()
}

const TABS = ['পাওনা', 'দেনা', 'খরচ', 'রিমাইন্ডার'] as const

const createSheet = async (token: string): Promise<{ id: string; url: string }> => {
  const body = {
    properties: { title: 'LifeTrack Backup' },
    sheets: TABS.map((title) => ({ properties: { title } })),
  }
  const json = await api('https://sheets.googleapis.com/v4/spreadsheets', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return { id: json.spreadsheetId, url: json.spreadsheetUrl }
}

// ---- Data → rows ----

const totalOf = (r: Debt | Loan) => round2(num(r.amount) + (r.increases || []).reduce((s, i) => s + num(i.amount), 0))
const paidOf = (r: Debt | Loan) => round2((r.payments || []).reduce((s, p) => s + num(p.amount), 0))

const buildRows = (debts: Debt[], loans: Loan[], reminders: Awaited<ReturnType<typeof getReminders>>, expenses: Awaited<ReturnType<typeof getExpenses>>) => {
  const moneyHead = (dateLabel: string) => ['নাম', 'মোট', 'পরিশোধিত', 'বাকি', dateLabel, 'ফেরতের তারিখ', 'অবস্থা', 'কারণ']
  const moneyRow = (r: Debt | Loan) => {
    const total = totalOf(r), paid = paidOf(r)
    return [
      r.personName,
      total,
      paid,
      round2(Math.max(0, total - paid)),
      r.date ? fmtDate(r.date) : '',
      r.dueDate ? fmtDate(r.dueDate) : '',
      r.returned ? 'পরিশোধিত' : 'বাকি',
      r.reason || '',
    ]
  }
  const lent = [moneyHead('দেওয়ার তারিখ'), ...debts.filter((d) => !d.deletedAt).map(moneyRow)]
  const borrowed = [moneyHead('নেওয়ার তারিখ'), ...loans.filter((l) => !l.deletedAt).map(moneyRow)]
  const exp = [
    ['তারিখ', 'ক্যাটাগরি', 'পরিমাণ', 'নোট'],
    ...expenses.map((e) => [e.date ? fmtDate(e.date) : '', t(`expenses.cat.${e.category}`), num(e.amount), e.note || '']),
  ]
  const rem = [
    ['শিরোনাম', 'সময়', 'অবস্থা'],
    ...reminders.map((r) => [r.title, r.scheduledTime ? fmtDate(r.scheduledTime, true) : '', r.dismissed ? 'সম্পন্ন' : 'সক্রিয়']),
  ]
  return [lent, borrowed, exp, rem]
}

// ---- Public API ----

export interface BackupResult { url: string; at: string }

// Full sync: ensure a sheet exists (create on first run), clear it, and write the
// current data. `interactive` triggers the consent popup — pass true for the
// user-initiated Connect / Sync-now, false for silent background syncs.
export const runBackup = async (interactive: boolean): Promise<BackupResult> => {
  const token = await getToken(interactive)
  const prefs = await getUserPrefs()

  let sheetId = prefs.backupSheetId
  let sheetUrl = prefs.backupSheetUrl || ''
  // Verify the stored sheet still exists (user may have deleted it); recreate if gone.
  if (sheetId) {
    try {
      const meta = await api(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=spreadsheetUrl`, token)
      sheetUrl = meta.spreadsheetUrl || sheetUrl
    } catch {
      sheetId = undefined
    }
  }
  if (!sheetId) {
    const created = await createSheet(token)
    sheetId = created.id
    sheetUrl = created.url
  }

  const [debts, loans, reminders, expenses] = await Promise.all([getDebts(), getLoans(), getReminders(), getExpenses()])
  const [lent, borrowed, exp, rem] = buildRows(debts, loans, reminders, expenses)

  // Clear old contents (rows may have shrunk) then write fresh values.
  await api(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchClear`, token, {
    method: 'POST',
    body: JSON.stringify({ ranges: TABS.map((tab) => `'${tab}'`) }),
  })
  const data = [
    { range: `'পাওনা'!A1`, values: lent },
    { range: `'দেনা'!A1`, values: borrowed },
    { range: `'খরচ'!A1`, values: exp },
    { range: `'রিমাইন্ডার'!A1`, values: rem },
  ]
  await api(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'RAW', data }),
  })

  const at = new Date().toISOString()
  await setUserPrefs({ backupSheetId: sheetId, backupSheetUrl: sheetUrl, lastBackupAt: at })
  return { url: sheetUrl, at }
}

// Disconnect: forget the sheet link locally (the file stays in the user's Drive).
export const disconnectBackup = async (): Promise<void> => {
  cached = null
  await setUserPrefs({
    backupSheetId: null as unknown as string,
    backupSheetUrl: null as unknown as string,
    lastBackupAt: null as unknown as string,
  })
}
