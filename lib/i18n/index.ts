import { useSyncExternalStore } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { bn as bnLocale, enUS } from 'date-fns/locale'
import { toBnDigits, toBnNumber } from '@/lib/format'
import type { Dict } from './dict/types'
import { common } from './dict/common'
import { dashboard } from './dict/dashboard'
import { debts } from './dict/debts'
import { loans } from './dict/loans'
import { reminders } from './dict/reminders'
import { auth } from './dict/auth'
import { statement } from './dict/statement'

export type Lang = 'bn' | 'en'

const dict: Dict = { ...common, ...dashboard, ...debts, ...loans, ...reminders, ...auth, ...statement }

// Module-level language store (same subscribe/notify pattern as toast/confirm).
// Default is Bengali; initLang() applies the persisted choice after mount so
// server prerender and first client render always match (no hydration mismatch).
const STORAGE_KEY = 'lifetrack-lang'
let lang: Lang = 'bn'
const listeners = new Set<() => void>()

export const getLang = (): Lang => lang

export const setLang = (l: Lang): void => {
  if (l === lang) return
  lang = l
  try {
    localStorage.setItem(STORAGE_KEY, l)
  } catch {
    // storage unavailable (private mode) — language still switches for the session
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = l
    document.documentElement.classList.toggle('lang-en', l === 'en')
    document.documentElement.classList.toggle('lang-bn', l === 'bn')
  }
  listeners.forEach((fn) => fn())
}

export const initLang = (): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'bn') setLang(stored)
  } catch {
    // ignore
  }
}

const subscribeLang = (fn: () => void): (() => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

// Re-render a client component when the language changes.
export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, () => 'bn')
}

// Translate a key, interpolating {param} placeholders. Missing keys fall back
// to the key itself so a typo is visible instead of crashing.
export function t(key: string, params?: Record<string, string | number>): string {
  const entry = dict[key]
  let s = entry ? entry[lang] : key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v))
    }
  }
  return s
}

// ---- Locale-aware formatting ----

// Money/quantity with grouping: Bengali digits + lakh grouping for bn,
// Latin digits + lakh grouping for en. Deterministic on all devices.
export const fmtNum = (n: number): string =>
  lang === 'bn' ? toBnNumber(n) : (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

// Plain integer (counts, indexes) — no grouping.
export const fmtInt = (n: number): string =>
  lang === 'bn' ? toBnDigits(String(Math.round(n))) : String(Math.round(n))

// Full date, optionally with time. Returns a localized string.
export const fmtDate = (value: string | number | Date, withTime = false): string => {
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return t('common.invalidDate')
  const pattern = withTime ? 'MMMM d, yyyy, h:mm a' : 'MMMM d, yyyy'
  if (lang === 'bn') return toBnDigits(format(d, pattern, { locale: bnLocale }))
  return format(d, pattern, { locale: enUS })
}

// Relative time ("২ ঘন্টা আগে" / "2 hours ago").
export const fmtRelative = (value: string | number | Date): string => {
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return ''
  try {
    const s = formatDistanceToNow(d, { locale: lang === 'bn' ? bnLocale : enUS, addSuffix: true })
    return lang === 'bn' ? toBnDigits(s) : s
  } catch {
    return ''
  }
}
