'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import { useState } from 'react'
import { HomeIcon, ClockIcon, ArrowUpRightIcon, ArrowDownLeftIcon, UserIcon, LogoutIcon } from './Icons'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { href: '/', label: 'হোম', Icon: HomeIcon },
  { href: '/reminders', label: 'রিমাইন্ডার', Icon: ClockIcon },
  { href: '/debts', label: 'দিয়েছি', Icon: ArrowUpRightIcon },
  { href: '/loans', label: 'নিয়েছি', Icon: ArrowDownLeftIcon },
]

export default function Navigation() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  if (!user) return null

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-line"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--surface) 88%, transparent)',
        backdropFilter: 'saturate(180%) blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch justify-around h-16 max-w-2xl mx-auto px-1">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center flex-1 gap-1 transition-colors duration-200 ${
                isActive ? 'text-accent' : 'text-muted'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />
              )}
              <Icon className="w-6 h-6" />
              <span className="text-[11px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}

        {/* Profile */}
        <div className="relative flex-1">
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-200 ${
              showUserMenu ? 'text-accent' : 'text-muted'
            }`}
          >
            <UserIcon className="w-6 h-6" />
            <span className="text-[11px] font-medium leading-none">প্রোফাইল</span>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute bottom-full right-0 mb-3 w-56 rounded-2xl surface shadow-pop overflow-hidden z-20">
                <div className="px-4 py-3 border-b border-line">
                  <p className="text-sm font-semibold text-content truncate">{user.displayName || 'ব্যবহারকারী'}</p>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
                  <span className="text-sm text-content">থিম</span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium text-negative hover:bg-surface-2 transition-colors"
                >
                  <LogoutIcon className="w-5 h-5" />
                  লগআউট
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
