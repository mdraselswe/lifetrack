'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/firebase-auth'
import { LogoutIcon } from './Icons'

export default function ProfileMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  if (!user) return null

  const initial = (user.displayName || user.email || '?').charAt(0).toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-accent text-accent-fg flex items-center justify-center font-semibold text-sm transition-transform active:scale-95"
        aria-label="প্রোফাইল"
      >
        {initial}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-2xl surface shadow-pop overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-line">
              <p className="text-sm font-semibold text-content truncate">{user.displayName || 'ব্যবহারকারী'}</p>
              <p className="text-xs text-muted truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { logout(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium text-negative hover:bg-surface-2 transition-colors"
            >
              <LogoutIcon className="w-5 h-5" /> লগআউট
            </button>
          </div>
        </>
      )}
    </div>
  )
}
