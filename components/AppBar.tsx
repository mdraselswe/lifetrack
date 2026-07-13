'use client'

import type { ReactNode } from 'react'
import ProfileMenu from './ProfileMenu'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'

interface AppBarProps {
  // A string renders as the standard page title; a node (e.g. the Wordmark)
  // renders as-is so brand screens can show the logo instead of plain text.
  title: string | ReactNode
  subtitle?: string
  action?: ReactNode
}

export default function AppBar({ title, subtitle, action }: AppBarProps) {
  return (
    <header className="app-bar">
      <div className="min-w-0">
        {typeof title === 'string'
          ? <h1 className="text-lg font-semibold text-content truncate leading-tight">{title}</h1>
          : title}
        {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
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
