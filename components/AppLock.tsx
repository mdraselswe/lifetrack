'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/firebase-auth'
import { getUserPrefs } from '@/lib/storage'
import { t, useLang } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { confirm } from '@/lib/confirm'
import { toast } from '@/lib/toast'
import Wordmark from '@/components/Wordmark'

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
  const inputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (locked) setTimeout(() => inputRef.current?.focus(), 50)
  }, [locked])

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

  // Escape hatch for a forgotten PIN: the gate covers the whole app (incl.
  // Settings/Logout), so without this the user would be locked out entirely.
  // Logging out clears the session and returns to /login, where they can sign
  // back in and reset or disable the PIN from Settings.
  const handleForgot = () => {
    confirm.custom(
      t('lock.forgotTitle'),
      t('lock.forgotMsg'),
      async () => {
        try {
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
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={pin}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '')
          setPin(v)
          setError(false)
          if (v.length === 4) tryUnlock(v)
        }}
        className={`input text-center text-2xl tracking-[0.5em] w-44 ${error ? 'input-error' : ''}`}
        aria-label={t('lock.enter')}
      />
      {error && <p className="text-sm text-negative">{t('lock.wrong')}</p>}
      <button onClick={handleForgot} className="text-sm text-muted underline underline-offset-2 mt-2">
        {t('lock.forgot')}
      </button>
    </div>
  )
}
