'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import { LogoutIcon, DownloadIcon, SettingsIcon, ScaleIcon } from './Icons'
import { ADMIN_EMAIL } from '@/lib/admin'
import { exportMyData } from '@/lib/export'
import { toast } from '@/lib/toast'
import { t, useLang } from '@/lib/i18n'

export default function ProfileMenu() {
  const { user, logout } = useAuth()
  const router = useRouter()
  useLang() // re-render on language switch
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const logoutRef = useRef<HTMLButtonElement>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportMyData(user?.email)
      toast.success(t('profile.exportSuccess'))
      setOpen(false)
    } catch {
      toast.error(t('profile.exportError'))
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    if (!open) return

    // Move focus into the menu once open.
    const focusTimer = setTimeout(() => logoutRef.current?.focus(), 40)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus() // restore focus to trigger
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!user) return null

  const initial = (user.displayName || user.email || '?').charAt(0).toUpperCase()

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-accent text-accent-fg flex items-center justify-center font-semibold text-sm transition-transform active:scale-95"
        aria-label={t('profile.title')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 mt-2 w-56 rounded-2xl surface shadow-pop overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-line">
              <p className="text-sm font-semibold text-content truncate">{user.displayName || t('profile.user')}</p>
              <p className="text-xs text-muted truncate">{user.email}</p>
            </div>
            {user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
              <button
                role="menuitem"
                onClick={() => { setOpen(false); router.push('/admin') }}
                className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium text-content hover:bg-surface-2 transition-colors"
              >
                <ScaleIcon className="w-5 h-5" /> {t('admin.title')}
              </button>
            )}
            <button
              ref={logoutRef}
              role="menuitem"
              onClick={() => { setOpen(false); router.push('/settings') }}
              className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium text-content hover:bg-surface-2 transition-colors"
            >
              <SettingsIcon className="w-5 h-5" /> {t('settings.title')}
            </button>
            <button
              role="menuitem"
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium text-content hover:bg-surface-2 transition-colors disabled:opacity-60 border-t border-line"
            >
              <DownloadIcon className="w-5 h-5" /> {exporting ? t('profile.exporting') : t('profile.export')}
            </button>
            <button
              role="menuitem"
              onClick={() => { logout(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium text-negative hover:bg-surface-2 transition-colors border-t border-line"
            >
              <LogoutIcon className="w-5 h-5" /> {t('profile.logout')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
