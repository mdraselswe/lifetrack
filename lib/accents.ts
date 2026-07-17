// Curated accent themes. Users pick a swatch (never a raw hex), so contrast and
// brand consistency are guaranteed — see the data-accent presets in globals.css.
// 'indigo' is the default (no data-accent attribute → base tokens apply).

export const ACCENT_KEY = 'lifetrack-accent'

export type AccentKey = 'indigo' | 'blue' | 'teal' | 'emerald' | 'amber' | 'rose' | 'violet'

export interface AccentPreset {
  key: AccentKey
  labelBn: string
  labelEn: string
  dot: string // swatch color shown in the picker
}

export const ACCENTS: AccentPreset[] = [
  { key: 'indigo', labelBn: 'বেগুনি', labelEn: 'Indigo', dot: '#4f46e5' },
  { key: 'blue', labelBn: 'নীল', labelEn: 'Blue', dot: '#2563eb' },
  { key: 'teal', labelBn: 'টিল', labelEn: 'Teal', dot: '#0d9488' },
  { key: 'emerald', labelBn: 'সবুজ', labelEn: 'Green', dot: '#059669' },
  { key: 'amber', labelBn: 'কমলা', labelEn: 'Amber', dot: '#d97706' },
  { key: 'rose', labelBn: 'গোলাপি', labelEn: 'Rose', dot: '#e11d48' },
  { key: 'violet', labelBn: 'ভায়োলেট', labelEn: 'Violet', dot: '#7c3aed' },
]

// Apply an accent by toggling data-accent on <html>. 'indigo' = remove the attr
// (base tokens). Also persists the choice.
export const applyAccent = (key: AccentKey): void => {
  if (typeof document === 'undefined') return
  if (key === 'indigo') document.documentElement.removeAttribute('data-accent')
  else document.documentElement.setAttribute('data-accent', key)
  try { localStorage.setItem(ACCENT_KEY, key) } catch { /* ignore */ }
}

export const getAccent = (): AccentKey => {
  if (typeof document === 'undefined') return 'indigo'
  return (document.documentElement.getAttribute('data-accent') as AccentKey) || 'indigo'
}
