'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/firebase-auth'
import { getUserPrefs, setUserPrefs } from '@/lib/storage'
import { t, useLang } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { confirm } from '@/lib/confirm'
import { toast } from '@/lib/toast'
import Wordmark from '@/components/Wordmark'
import PinInput from '@/components/PinInput'

// SHA-256 hex of a PIN string (WebCrypto — no deps).
export const hashPin = async (pin: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`lifetrack:${pin}`))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const UNLOCK_KEY = 'lifetrack-unlocked'

// Full-screen PIN gate. Shows when the signed-in user has a pinHash in prefs
// and this browser session hasn't been unlocked yet. Session-scoped: closing
// the app relocks it; navigating within the session doesn't.
export default function AppLock() {
  useLang()
  const { user, logout } = useAuth()
  const [locked, setLocked] = useState(false)
  const [expected, setExpected] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!user) {
      setLocked(false)
      return
    }
    let cancelled = false
    getUserPrefs()
      .then((prefs) => {
        if (cancelled) return
        const unlocked = sessionStorage.getItem(UNLOCK_KEY) === '1'
        if (prefs.pinHash && !unlocked) {
          setExpected(prefs.pinHash)
          setLocked(true)
        }
      })
      .catch(() => {
        // Prefs unreadable (offline first launch) — don't lock the user out.
      })
    return () => { cancelled = true }
  }, [user])

  const tryUnlock = async (value: string) => {
    if (!expected || value.length < 4) return
    const h = await hashPin(value)
    if (h === expected) {
      try { sessionStorage.setItem(UNLOCK_KEY, '1') } catch { /* ignore */ }
      haptic()
      setLocked(false)
      setPin('')
      setError(false)
    } else {
      haptic([30, 50, 30])
      setError(true)
      setPin('')
    }
  }

  // Escape hatch for a forgotten PIN. The gate covers the whole app (incl.
  // Settings/Logout), and the pinHash lives in Firebase — so just logging out
  // would re-lock on the next login (an inescapable loop). We DISABLE the lock
  // (clear pinHash) first, then log out. Security is unaffected: the real
  // boundary is the account password required to log back in; the PIN is only a
  // convenience gate. After re-login the user can set a new PIN in Settings.
  const handleForgot = () => {
    confirm.custom(
      t('lock.forgotTitle'),
      t('lock.forgotMsg'),
      async () => {
        try {
          await setUserPrefs({ pinHash: null as unknown as string })
          try { sessionStorage.removeItem(UNLOCK_KEY) } catch { /* ignore */ }
          await logout()
          setLocked(false)
        } catch {
          toast.error(t('auth.error.logout'))
        }
      },
      { confirmText: t('profile.logout'), cancelText: t('common.cancel'), type: 'warning' }
    )
  }

  if (!locked) return null

  return (
    <div className="fixed inset-0 z-[10050] flex flex-col items-center justify-center gap-6 p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <Wordmark size="lg" />
      <p className="text-sm text-muted">{t('lock.enter')}</p>
      <PinInput
        value={pin}
        onChange={(v) => { setPin(v); setError(false) }}
        onComplete={(v) => tryUnlock(v)}
        error={error}
        autoFocus
        ariaLabel={t('lock.enter')}
      />
      {error && <p className="text-sm text-negative">{t('lock.wrong')}</p>}
      <button onClick={handleForgot} className="text-sm text-muted underline underline-offset-2 mt-2">
        {t('lock.forgot')}
      </button>
    </div>
  )
}
