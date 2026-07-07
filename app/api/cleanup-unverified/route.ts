import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAdminDb, getServiceAccountCredentials } from '@/lib/firebase-admin'

// Hit by an external cron (cron-job.org) — e.g. once a day. Deletes any account
// whose email is still UNVERIFIED and was created more than MAX_AGE_DAYS ago.
// Unverified accounts are treated as logged-out everywhere (see firebase-auth),
// so they hold no Firestore data — but we recursively delete users/{uid} anyway
// to be safe. Uses the Identity Toolkit REST admin API (firebase-admin/auth
// breaks on Vercel serverless). Auth via CRON_SECRET, same as /api/notify.

export const maxDuration = 60

const MAX_AGE_DAYS = 30
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000

type AuthUser = {
  localId: string
  email?: string
  emailVerified?: boolean
  createdAt?: string // ms since epoch, as string
  providerUserInfo?: { providerId?: string }[]
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set')

    const creds = getServiceAccountCredentials()
    const jwt = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/identitytoolkit', 'https://www.googleapis.com/auth/cloud-platform'],
    })

    // Page through all auth users.
    const users: AuthUser[] = []
    let pageToken: string | undefined
    for (let i = 0; i < 20; i++) {
      const url = new URL(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchGet`)
      url.searchParams.set('maxResults', '500')
      if (pageToken) url.searchParams.set('nextPageToken', pageToken)
      const res = await jwt.request<{ users?: AuthUser[]; nextPageToken?: string }>({ url: url.toString() })
      users.push(...(res.data.users || []))
      pageToken = res.data.nextPageToken
      if (!pageToken) break
    }

    const now = Date.now()
    // Only delete genuine unverified email/password accounts. Google accounts
    // arrive verified, so they never match; the provider guard is belt-and-braces.
    const stale = users.filter((u) => {
      if (u.emailVerified) return false
      const isGoogle = (u.providerUserInfo || []).some((p) => p.providerId === 'google.com')
      if (isGoogle) return false
      const created = Number(u.createdAt || 0)
      return created > 0 && now - created > MAX_AGE_MS
    })

    const db = getAdminDb()
    const deleted: string[] = []
    const failed: { uid: string; error: string }[] = []

    for (const u of stale) {
      try {
        // Delete the auth account (admin endpoint — needs Firebase Authentication Admin role).
        await jwt.request({
          url: `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`,
          method: 'POST',
          data: { localId: u.localId },
        })
        // Best-effort cleanup of any Firestore data under this uid.
        try {
          await db.recursiveDelete(db.collection('users').doc(u.localId))
        } catch (e) {
          console.warn('Firestore cleanup skipped for', u.localId, e)
        }
        deleted.push(u.email || u.localId)
      } catch (e) {
        failed.push({ uid: u.localId, error: e instanceof Error ? e.message : String(e) })
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: users.length,
      matched: stale.length,
      deleted,
      failed,
      olderThanDays: MAX_AGE_DAYS,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'cleanup failed'
    console.error('Cleanup unverified failed:', error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
