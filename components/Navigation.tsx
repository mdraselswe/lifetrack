'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import { t, useLang } from '@/lib/i18n'
import { HomeIcon, ClockIcon, ArrowUpRightIcon, ArrowDownLeftIcon, WalletIcon } from './Icons'

const navItems = [
  { href: '/', labelKey: 'nav.home', Icon: HomeIcon },
  { href: '/reminders', labelKey: 'nav.reminders', Icon: ClockIcon },
  { href: '/debts', labelKey: 'nav.given', Icon: ArrowUpRightIcon },
  { href: '/loans', labelKey: 'nav.taken', Icon: ArrowDownLeftIcon },
  { href: '/expenses', labelKey: 'nav.expenses', Icon: WalletIcon },
]

export default function Navigation() {
  const pathname = usePathname()
  const { user } = useAuth()
  useLang() // re-render on language switch

  if (!user) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-line"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--surface) 88%, transparent)',
        backdropFilter: 'saturate(180%) blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch justify-around h-16 max-w-2xl mx-auto px-2">
        {navItems.map(({ href, labelKey, Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex flex-col items-center justify-center flex-1 gap-1 pt-2 pb-1 transition-colors duration-200 ${
                isActive ? 'text-accent' : 'text-muted'
              }`}
            >
              {/* Material-3 style pill behind the active icon */}
              <span
                className="flex items-center justify-center h-8 w-16 rounded-full transition-colors duration-200"
                style={isActive ? { backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' } : undefined}
              >
                <Icon className="w-6 h-6" />
              </span>
              <span className={`text-[11px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>{t(labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
