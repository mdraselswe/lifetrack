import { auth } from './firebase'

// After a data change, debounce a call to the backup endpoint so the Google
// Sheet mirror stays near-realtime. Best-effort: never throws, never blocks the
// UI. The daily cron remains the guaranteed safety net if a trigger is missed.
let timer: ReturnType<typeof setTimeout> | null = null

export function scheduleBackup(delay = 4000): void {
  if (typeof window === 'undefined') return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void triggerBackup()
  }, delay)
}

async function triggerBackup(): Promise<void> {
  try {
    const user = auth.currentUser
    if (!user) return
    // The server verifies this ID token via Google's REST endpoint — no secret
    // is exposed to the client, and only a logged-in user can trigger a backup.
    const token = await user.getIdToken()
    await fetch('/api/backup', {
      method: 'POST',
      headers: { 'x-firebase-token': token },
      keepalive: true,
    })
  } catch {
    // ignore — best effort; daily cron covers misses
  }
}
