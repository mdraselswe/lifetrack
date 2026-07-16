'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import ProfileMenu from './ProfileMenu'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { ArrowLeftIcon } from './Icons'
import { t } from '@/lib/i18n'

interface AppBarProps {
  // A string renders as the standard page title; a node (e.g. the Wordmark)
  // renders as-is so brand screens can show the logo instead of plain text.
  title: string | ReactNode
  subtitle?: string
  action?: ReactNode
  // Show a standard back button before the title. Only for deep/sub-pages that
  // aren't reachable from the bottom nav (person, statement, settings, admin).
  back?: boolean
}

export default function AppBar({ title, subtitle, action, back }: AppBarProps) {
  const router = useRouter()
  return (
    <header className="app-bar">
      <div className="flex items-center gap-2 min-w-0">
        {back && (
          <button
            onClick={() => router.back()}
            className="icon-btn flex-shrink-0 -ml-1"
            aria-label={t('common.back')}
            title={t('common.back')}
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          {typeof title === 'string'
            ? <h1 className="text-lg font-semibold text-content truncate leading-tight">{title}</h1>
            : title}
          {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {action}
        <LanguageToggle />
        <ThemeToggle />
        {/* Hairline separates utility toggles from the identity/avatar cluster */}
        <span className="w-px h-5 bg-line mx-0.5" aria-hidden="true" />
        <ProfileMenu />
      </div>
    </header>
  )
}
