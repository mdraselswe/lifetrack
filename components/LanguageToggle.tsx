'use client'

import { useLang, setLang } from '@/lib/i18n'

// Header button that flips between Bengali and English. Shows the language
// you would switch TO (standard pattern).
export default function LanguageToggle() {
  const lang = useLang()
  const next = lang === 'bn' ? 'en' : 'bn'
  return (
    <button
      onClick={() => setLang(next)}
      className="icon-btn text-[11px] font-bold tracking-wide"
      aria-label={lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
    >
      {lang === 'bn' ? 'EN' : 'বাং'}
    </button>
  )
}
