'use client'

import { useEffect, useState } from 'react'
import { ACCENTS, applyAccent, getAccent, type AccentKey } from '@/lib/accents'
import { t, useLang } from '@/lib/i18n'
import { CheckIcon } from './Icons'

// Swatch row for choosing a curated accent theme. No free hex input — every
// preset is contrast-tested, so the app can't be made to look bad.
export default function AccentPicker() {
  const lang = useLang()
  const [selected, setSelected] = useState<AccentKey>('indigo')

  // data-accent is set pre-paint by the layout script; read it after mount.
  useEffect(() => { setSelected(getAccent()) }, [])

  const pick = (key: AccentKey) => {
    applyAccent(key)
    setSelected(key)
  }

  return (
    <div className="flex flex-wrap gap-3">
      {ACCENTS.map((a) => {
        const active = selected === a.key
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => pick(a.key)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90 ${active ? 'ring-2 ring-offset-2 ring-offset-[color:var(--surface)] ring-[color:var(--text)]' : ''}`}
            style={{ backgroundColor: a.dot }}
            aria-label={lang === 'bn' ? a.labelBn : a.labelEn}
            aria-pressed={active}
            title={lang === 'bn' ? a.labelBn : a.labelEn}
          >
            {active && <CheckIcon className="w-5 h-5 text-white" />}
          </button>
        )
      })}
    </div>
  )
}
