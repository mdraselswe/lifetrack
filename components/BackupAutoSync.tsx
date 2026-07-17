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
    let interval: ReturnType<typeof setInterval> | undefined
    let lastAt = 0

    const sync = () => {
      // Throttle: at most once per 2 minutes.
      if (Date.now() - lastAt < 120_000) return
      lastAt = Date.now()
      runBackup(false).catch(() => { lastAt = 0 })
    }
    // Sync on both transitions: becoming hidden persists the changes made this
    // session as the user leaves; becoming visible refreshes on return.
    const onVis = () => sync()

    getUserPrefs()
      .then((p) => {
        if (cancelled || !p.backupSheetId) return
        timer = setTimeout(sync, 4000) // initial, after the app settles
        interval = setInterval(sync, 3 * 60 * 1000) // periodic while open (throttle guards it)
        document.addEventListener('visibilitychange', onVis)
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [user])

  return null
}
