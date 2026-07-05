'use client'

import type { ReactNode } from 'react'
import ProfileMenu from './ProfileMenu'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'

interface AppBarProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export default function AppBar({ title, subtitle, action }: AppBarProps) {
  return (
    <header className="app-bar">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-content truncate leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1">
        {action}
        <LanguageToggle />
        <ThemeToggle />
        <ProfileMenu />
      </div>
    </header>
  )
}
