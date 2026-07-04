'use client'

import { useEffect, useState } from 'react'
import { SunIcon, MoonIcon } from './Icons'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // ignore
    }
    setDark(next)
  }

  return (
    <button
      onClick={toggle}
      className={`icon-btn ${className}`}
      aria-label={dark ? 'লাইট মোড' : 'ডার্ক মোড'}
      title={dark ? 'লাইট মোড' : 'ডার্ক মোড'}
    >
      {dark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  )
}
