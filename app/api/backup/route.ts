import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAdminDb, getServiceAccountCredentials } from '@/lib/firebase-admin'
import type { DocumentReference } from 'firebase-admin/firestore'
import type { Debt, Loan, Reminder, Payment, AmountIncrease } from '@/lib/types'

export const maxDuration = 60

const sumAmounts = (items?: { amount: number }[]) =>
  (items || []).reduce((s, p) => s + (typeof p.amount === 'number' ? p.amount : 0), 0)

export async function GET(request: Request) {
  const url = new URL(request.url)
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Fast routing/env probe (no Firestore/Sheets work).
  if (url.searchParams.get('ping')) {
    return NextResponse.json({
      ok: true,
      ping: true,
      hasSheetId: !!process.env.BACKUP_SHEET_ID,
      hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    })
  }

  // Track progress so a stall reports WHERE it stalled (prod strips console.*).
  let step = 'start'
  const run = async () => {
    step = 'sheetId'
    const sheetId = process.env.BACKUP_SHEET_ID
    if (!sheetId) throw new Error('BACKUP_SHEET_ID env var is not set')

    step = 'init-db'
    const db = getAdminDb()

    step = 'read-firestore'
    const [debtsSnap, loansSnap, remindersSnap] = await Promise.all([
      db.collectionGroup('debts').get(),
      db.collectionGroup('loans').get(),
      db.collectionGroup('reminders').get(),
    ])

    step = 'build-rows'
    const uidOf = (ref: DocumentReference) => ref.parent.parent?.id || ''
    const debtDocs = debtsSnap.docs.map((d) => ({ uid: uidOf(d.ref), data: d.data() as Debt }))
    const loanDocs = loansSnap.docs.map((d) => ({ uid: uidOf(d.ref), data: d.data() as Loan }))
    const reminderDocs = remindersSnap.docs.map((d) => ({ uid: uidOf(d.ref), data: d.data() as Reminder }))
    const uids = Array.from(new Set([...debtDocs, ...loanDocs, ...reminderDocs].map((x) => x.uid).filter(Boolean)))

    const moneyRow = (uid: string, m: Debt | Loan) => {
      const total = (typeof m.amount === 'number' ? m.amount : 0) + sumAmounts(m.increases)
      const totalPaid = sumAmounts(m.payments)
      const remaining = Math.max(0, Math.round((total - totalPaid) * 100) / 100)
      return [uid, '', m.id ?? '', m.personName ?? '', m.amount ?? '', m.reason ?? '', m.date ?? '', m.returned ? 'হ্যাঁ' : 'না', totalPaid, remaining, m.createdAt ?? '', JSON.stringify((m.payments as Payment[]) || []), JSON.stringify((m.increases as AmountIncrease[]) || [])]
    }
    const moneyHeader = ['uid', 'email', 'id', 'personName', 'amount', 'reason', 'date', 'returned', 'totalPaid', 'remaining', 'createdAt', 'payments', 'increases']
    const debtRows = [moneyHeader, ...debtDocs.map((x) => moneyRow(x.uid, x.data))]
    const loanRows = [moneyHeader, ...loanDocs.map((x) => moneyRow(x.uid, x.data))]
    const reminderHeader = ['uid', 'email', 'id', 'title', 'description', 'scheduledTime', 'dismissed', 'isRepetitive', 'repeatInterval', 'repeatType', 'completionCount', 'createdAt', 'occurrences']
    const reminderRows = [
      reminderHeader,
      ...reminderDocs.map(({ uid, data: r }) => [uid, '', r.id ?? '', r.title ?? '', r.description ?? '', r.scheduledTime ?? '', r.dismissed ? 'হ্যাঁ' : 'না', r.isRepetitive ? 'হ্যাঁ' : 'না', r.repeatInterval ?? '', r.repeatType ?? '', r.completionCount ?? '', r.createdAt ?? '', JSON.stringify(r.occurrences || [])]),
    ]

    step = 'sheets-auth'
    const creds = getServiceAccountCredentials()
    const jwt = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const sheets = google.sheets({ version: 'v4', auth: jwt })

    step = 'sheets-get'
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
    const existing = new Set((meta.data.sheets || []).map((s) => s.properties?.title))
    const required = ['Debts', 'Loans', 'Reminders', 'Meta']
    const toAdd = required.filter((t) => !existing.has(t))
    if (toAdd.length) {
      step = 'add-tabs'
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: toAdd.map((title) => ({ addSheet: { properties: { title } } })) },
      })
    }

    const at = new Date().toISOString()
    const metaRows = [['lastBackup', at], ['debts', debtDocs.length], ['loans', loanDocs.length], ['reminders', reminderDocs.length], ['users', uids.length]]

    const write = async (tab: string, rows: (string | number)[][]) => {
      await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: tab })
      await sheets.spreadsheets.values.update({ spreadsheetId: sheetId, range: `${tab}!A1`, valueInputOption: 'RAW', requestBody: { values: rows } })
    }

    step = 'write-debts'; await write('Debts', debtRows)
    step = 'write-loans'; await write('Loans', loanRows)
    step = 'write-reminders'; await write('Reminders', reminderRows)
    step = 'write-meta'; await write('Meta', metaRows)

    return { ok: true, at, counts: { debts: debtDocs.length, loans: loanDocs.length, reminders: reminderDocs.length, users: uids.length } }
  }

  // Never hang the request: if a step stalls, report which one.
  let timer: ReturnType<typeof setTimeout> | undefined
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`STALLED at step: ${step}`)), 25000)
  })
  try {
    const result = await Promise.race([run(), guard])
    if (timer) clearTimeout(timer)
    return NextResponse.json(result)
  } catch (error) {
    if (timer) clearTimeout(timer)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, step, error: message }, { status: 500 })
  }
}
