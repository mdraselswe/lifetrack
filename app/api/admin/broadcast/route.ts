import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { google } from 'googleapis'
import { getAdminDb, getServiceAccountCredentials } from '@/lib/firebase-admin'
import { ADMIN_EMAIL } from '@/lib/admin'

// Admin-only: broadcast a Web Push notification to every subscribed device of
// the targeted users. Free — reuses the same VAPID + web-push stack as
// /api/notify and the per-user users/{uid}/pushSubscriptions collection.
// Caller must present a verified ID token belonging to ADMIN_EMAIL.

export const maxDuration = 60

type Target = 'all' | 'verified' | 'unverified'

type AuthUser = {
  localId: string
  emailVerified?: boolean
  providerUserInfo?: { providerId?: string }[]
}

// Verify the caller's Firebase ID token and return their email + verified flag.
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

export async function POST(request: Request) {
  const token = request.headers.get('x-firebase-token')
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const caller = await callerEmail(token)
  if (!caller || !caller.verified || caller.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const bodyJson = (await request.json()) as {
      title?: string
      body?: string
      url?: string
      target?: Target
    }
    const title = (bodyJson.title || '').trim()
    const message = (bodyJson.body || '').trim()
    const url = (bodyJson.url || '').trim() || '/'
    const target: Target = bodyJson.target || 'all'
    if (!title || !message) {
      return NextResponse.json({ ok: false, error: 'title and body are required' }, { status: 400 })
    }

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    if (!vapidPublic || !vapidPrivate) throw new Error('VAPID keys are not set')
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@lifetrack.app', vapidPublic, vapidPrivate)

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set')

    // Resolve which uids to target from the auth user list.
    const creds = getServiceAccountCredentials()
    const jwt = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/identitytoolkit', 'https://www.googleapis.com/auth/cloud-platform'],
    })
    const users: AuthUser[] = []
    let pageToken: string | undefined
    for (let i = 0; i < 20; i++) {
      const u = new URL(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchGet`)
      u.searchParams.set('maxResults', '500')
      if (pageToken) u.searchParams.set('nextPageToken', pageToken)
      const res = await jwt.request<{ users?: AuthUser[]; nextPageToken?: string }>({ url: u.toString() })
      users.push(...(res.data.users || []))
      pageToken = res.data.nextPageToken
      if (!pageToken) break
    }

    const uids = users
      .filter((u) => {
        if (target === 'verified') return !!u.emailVerified
        if (target === 'unverified') return !u.emailVerified
        return true // 'all'
      })
      .map((u) => u.localId)

    // Payload the service worker's push handler understands (custom format).
    const payload = JSON.stringify({
      title,
      body: message,
      tag: `broadcast-${title.slice(0, 24)}`,
      data: { url, broadcast: true },
    })

    const db = getAdminDb()
    let recipients = 0 // users who had at least one subscription
    let sent = 0
    let expired = 0

    // Load + send per user. Sequential over users, parallel over their devices.
    for (const uid of uids) {
      const subsSnap = await db.collection(`users/${uid}/pushSubscriptions`).get()
      if (subsSnap.empty) continue
      let hadValid = false
      await Promise.all(
        subsSnap.docs.map(async (s) => {
          const data = s.data() as { endpoint?: string; keys?: Record<string, string> }
          if (!data.endpoint || !data.keys?.p256dh || !data.keys?.auth) return
          hadValid = true
          try {
            await webpush.sendNotification(
              { endpoint: data.endpoint, keys: { p256dh: data.keys.p256dh, auth: data.keys.auth } },
              payload
            )
            sent++
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode
            if (status === 404 || status === 410) {
              expired++
              await s.ref.delete().catch(() => {})
            } else {
              console.error('broadcast send failed:', status, data.endpoint.slice(0, 60))
            }
          }
        })
      )
      if (hadValid) recipients++
    }

    return NextResponse.json({ ok: true, target, targetedUsers: uids.length, recipients, sent, expired })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'broadcast failed'
    console.error('Broadcast failed:', error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
