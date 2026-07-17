import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAdminDb, getServiceAccountCredentials } from '@/lib/firebase-admin'
import { ADMIN_EMAIL } from '@/lib/admin'

// Admin-only: list every registered user (from Firebase Auth via the Identity
// Toolkit REST API — firebase-admin/auth breaks on Vercel serverless) plus
// per-user Firestore usage counts. Caller must present a verified ID token
// belonging to ADMIN_EMAIL.

export const maxDuration = 30

type AuthUser = {
  localId: string
  email?: string
  displayName?: string
  emailVerified?: boolean
  createdAt?: string // ms since epoch, as string
  lastLoginAt?: string // ms since epoch, as string
  providerUserInfo?: { providerId?: string }[]
  disabled?: boolean
}

// Verify the caller's Firebase ID token and return their email (or null).
async function callerEmail(idToken: string): Promise<{ email: string; verified: boolean } | null> {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!key) return null
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { users?: { email?: string; emailVerified?: boolean }[] }
    const u = data.users?.[0]
    if (!u?.email) return null
    return { email: u.email, verified: !!u.emailVerified }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const token = request.headers.get('x-firebase-token')
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const caller = await callerEmail(token)
  if (!caller || !caller.verified || caller.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set')

    // Service-account JWT: same credentials as the Sheets backup; the account
    // already holds the Firebase Authentication Viewer role.
    const creds = getServiceAccountCredentials()
    const jwt = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/identitytoolkit', 'https://www.googleapis.com/auth/cloud-platform'],
    })

    // Page through all auth users (500/page is plenty here).
    const users: AuthUser[] = []
    let pageToken: string | undefined
    for (let i = 0; i < 10; i++) {
      const url = new URL(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchGet`)
      url.searchParams.set('maxResults', '500')
      if (pageToken) url.searchParams.set('nextPageToken', pageToken)
      const res = await jwt.request<{ users?: AuthUser[]; nextPageToken?: string }>({ url: url.toString() })
      users.push(...(res.data.users || []))
      pageToken = res.data.nextPageToken
      if (!pageToken) break
    }

    // Firestore usage counts per uid (admin SDK bypasses rules; preferRest set).
    const db = getAdminDb()
    const usage = new Map<string, { debts: number; loans: number; reminders: number; expenses: number }>()
    const bump = (uid: string, k: 'debts' | 'loans' | 'reminders' | 'expenses') => {
      const u = usage.get(uid) || { debts: 0, loans: 0, reminders: 0, expenses: 0 }
      u[k]++
      usage.set(uid, u)
    }
    const [debtsSnap, loansSnap, remindersSnap, expensesSnap] = await Promise.all([
      db.collectionGroup('debts').get(),
      db.collectionGroup('loans').get(),
      db.collectionGroup('reminders').get(),
      db.collectionGroup('expenses').get(),
    ])
    debtsSnap.docs.forEach((d) => { const uid = d.ref.parent.parent?.id; if (uid) bump(uid, 'debts') })
    loansSnap.docs.forEach((d) => { const uid = d.ref.parent.parent?.id; if (uid) bump(uid, 'loans') })
    remindersSnap.docs.forEach((d) => { const uid = d.ref.parent.parent?.id; if (uid) bump(uid, 'reminders') })
    expensesSnap.docs.forEach((d) => { const uid = d.ref.parent.parent?.id; if (uid) bump(uid, 'expenses') })

    const list = users
      .map((u) => ({
        uid: u.localId,
        email: u.email || '',
        name: u.displayName || '',
        verified: !!u.emailVerified,
        disabled: !!u.disabled,
        provider: u.providerUserInfo?.[0]?.providerId || 'password',
        createdAt: Number(u.createdAt || 0),
        lastLoginAt: Number(u.lastLoginAt || 0),
        counts: usage.get(u.localId) || { debts: 0, loans: 0, reminders: 0, expenses: 0 },
      }))
      .sort((a, b) => b.lastLoginAt - a.lastLoginAt)

    return NextResponse.json({ ok: true, total: list.length, users: list })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'admin list failed'
    console.error('Admin users failed:', error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
