'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/firebase-auth'
import { getUserPrefs } from '@/lib/storage'
import { isBackupConfigured, runBackup } from '@/lib/google-backup'

// Keeps the user-owned Google Sheet backup fresh while the app is open: a silent
// sync shortly after load and whenever the tab becomes visible again. Silent
// (no popup) — if the Google token can't be obtained without interaction it just
// skips; the manual "Sync now" in Settings always works. Best-effort, never
// blocks the UI or surfaces errors.
export default function BackupAutoSync() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user || !isBackupConfigured()) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastAt = 0

    const sync = () => {
      // Throttle: at most once per 2 minutes.
      if (Date.now() - lastAt < 120_000) return
      lastAt = Date.now()
      runBackup(false).catch(() => { lastAt = 0 })
    }
    const onVis = () => { if (document.visibilityState === 'visible') sync() }

    getUserPrefs()
      .then((p) => {
        if (cancelled || !p.backupSheetId) return
        timer = setTimeout(sync, 4000) // let the app settle first
        document.addEventListener('visibilitychange', onVis)
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [user])

  return null
}
