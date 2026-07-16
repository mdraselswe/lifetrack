import { getApps, initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
// NOTE: we deliberately do NOT import 'firebase-admin/auth'. On Vercel's
// serverless runtime its jwks-rsa→jose dependency hits ERR_REQUIRE_ESM
// (require() of an ES module). Firestore-only backup avoids that chain.

// Lazy Admin SDK init. Nothing runs at import time — the service account is only
// read/parsed on first call, so the app builds & prerenders fine without the env
// var present. Only the /api/backup route (request time) needs it.

let cachedApp: ReturnType<typeof initializeApp> | null = null

function parseServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set')
  }
  try {
    return JSON.parse(raw) as ServiceAccount
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON')
  }
}

// The same service account JSON is reused for the Google Sheets API auth.
export function getServiceAccountCredentials(): { client_email: string; private_key: string } {
  const sa = parseServiceAccount() as unknown as { client_email: string; private_key: string }
  return { client_email: sa.client_email, private_key: sa.private_key }
}

function getAdminApp() {
  if (cachedApp) return cachedApp
  cachedApp = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(parseServiceAccount()) })
  return cachedApp
}

let cachedDb: Firestore | null = null

export function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb
  const db = getFirestore(getAdminApp())
  // Force REST transport. The default gRPC transport hangs on Vercel/serverless
  // (HTTP/2 keep-alive never settles), causing the function to time out.
  // Guarded: in dev, Next re-executes this module (resetting the local
  // `cachedDb` variable) while the underlying Firestore instance persists via
  // the Firebase SDK's own app registry — calling settings() on it again
  // throws "Firestore has already been initialized". Swallow only that.
  try {
    db.settings({ preferRest: true })
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes('already been initialized')) throw e
  }
  cachedDb = db
  return cachedDb
}
