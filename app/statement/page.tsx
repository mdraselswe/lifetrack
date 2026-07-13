'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import AppBar from '@/components/AppBar'
import { FileTextIcon } from '@/components/Icons'
import { t, useLang, fmtNum, fmtDate } from '@/lib/i18n'
import { round2 } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { toast } from '@/lib/toast'
import { buildStatement, type Statement } from '@/lib/statement'

const bn = (n: number) => fmtNum(round2(n))
const money = (n: number) => `৳${bn(n)}`

// Local YYYY-MM-DD (avoids UTC shifting the day near midnight).
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

type PresetKey = 'thisMonth' | 'lastMonth' | 'thisYear' | 'all'

const presetRange = (key: PresetKey): { from: string; to: string } => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (key) {
    case 'thisMonth':
      return { from: iso(new Date(y, m, 1)), to: iso(now) }
    case 'lastMonth':
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) }
    case 'thisYear':
      return { from: iso(new Date(y, 0, 1)), to: iso(now) }
    case 'all':
      return { from: '2000-01-01', to: iso(now) }
  }
}

export default function StatementPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  useLang()

  // range stays null until mounted: computing it needs `new Date()`, which is
  // disallowed during the prerender of a Client Component (Cache Components).
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const [data, setData] = useState<Statement | null>(null)
  const [busy, setBusy] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)

  const rangeValid = !!range && range.from <= range.to

  // Client-only: seed the default range after mount.
  useEffect(() => {
    setRange(presetRange('thisMonth'))
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !range || !rangeValid) return
    let cancelled = false
    setBusy(true)
    buildStatement(range.from, range.to)
      .then((s) => { if (!cancelled) { setData(s); setGeneratedAt(new Date()) } })
      .catch(() => { if (!cancelled) toast.error(t('statement.loadError')) })
      .finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [user, range, rangeValid])

  // Recomputed each render so labels track the active language.
  const presets: { key: PresetKey; label: string }[] = [
    { key: 'thisMonth', label: t('statement.presetThisMonth') },
    { key: 'lastMonth', label: t('statement.presetLastMonth') },
    { key: 'thisYear', label: t('statement.presetThisYear') },
    { key: 'all', label: t('statement.presetAll') },
  ]

  const activePreset = useMemo<PresetKey | null>(() => {
    if (!range) return null
    const keys: PresetKey[] = ['thisMonth', 'lastMonth', 'thisYear', 'all']
    for (const key of keys) {
      const r = presetRange(key)
      if (r.from === range.from && r.to === range.to) return key
    }
    return null
  }, [range])

  const handlePrint = () => {
    haptic()
    window.print()
  }

  if (!user || !range) return null

  const s = data
  const periodLabel = `${fmtDate(range.from)} — ${fmtDate(range.to)}`

  return (
    <div className="min-h-full">
      <AppBar title={t('statement.title')} subtitle={t('statement.subtitle')} />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
        {/* Controls — never printed */}
        <div className="no-print space-y-3">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => setRange(presetRange(p.key))}
                className={`chip ${activePreset === p.key ? 'chip-accent' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">{t('statement.from')}</span>
              <input
                type="date"
                value={range.from}
                max={range.to}
                onChange={(e) => setRange((r) => (r ? { ...r, from: e.target.value } : r))}
                className="input"
              />
            </label>
            <label className="block">
              <span className="label">{t('statement.to')}</span>
              <input
                type="date"
                value={range.to}
                min={range.from}
                onChange={(e) => setRange((r) => (r ? { ...r, to: e.target.value } : r))}
                className="input"
              />
            </label>
          </div>

          {!rangeValid && <p className="text-xs text-negative">{t('statement.rangeError')}</p>}

          <button
            onClick={handlePrint}
            disabled={!s || s.persons.length === 0}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            <FileTextIcon className="w-5 h-5" /> {t('statement.download')}
          </button>
        </div>

        {/* Printable area */}
        <div className="print-area space-y-4">
          {/* Print-only document header */}
          <div className="print-header" style={{ marginBottom: 16 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>LifeTrack — {t('statement.title')}</h1>
            <p style={{ fontSize: 12 }}>{t('statement.period')}: {periodLabel}</p>
            {user.email && <p style={{ fontSize: 12 }}>{t('statement.account')}: {user.email}</p>}
            {generatedAt && <p style={{ fontSize: 12 }}>{t('statement.generatedAt')}: {fmtDate(generatedAt, true)}</p>}
          </div>

          {busy && !s && <div className="card text-center text-muted text-sm">…</div>}

          {s && s.persons.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-sm text-muted">{t('statement.empty')}</p>
              <p className="text-xs text-muted mt-1">{periodLabel}</p>
            </div>
          )}

          {s && s.persons.length > 0 && (
            <>
              {/* Summary */}
              <div className="card space-y-3">
                <p className="text-sm font-semibold text-content">{t('statement.summaryTitle')}</p>
                <p className="text-xs text-muted">{periodLabel}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[11px] text-muted mb-0.5">{t('statement.moneyIn')}</p>
                    <p className="text-base font-bold text-positive print-pos tabular-nums">{money(s.summary.moneyIn)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted mb-0.5">{t('statement.moneyOut')}</p>
                    <p className="text-base font-bold text-negative print-neg tabular-nums">{money(s.summary.moneyOut)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted mb-0.5">{t('statement.net')}</p>
                    <p className={`text-base font-bold tabular-nums ${s.summary.net >= 0 ? 'text-positive print-pos' : 'text-negative print-neg'}`}>
                      {money(s.summary.net)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-line text-center">
                  <div><p className="text-[10px] text-muted">{t('statement.lent')}</p><p className="text-xs font-semibold tabular-nums">{money(s.summary.lent)}</p></div>
                  <div><p className="text-[10px] text-muted">{t('statement.received')}</p><p className="text-xs font-semibold tabular-nums">{money(s.summary.received)}</p></div>
                  <div><p className="text-[10px] text-muted">{t('statement.borrowed')}</p><p className="text-xs font-semibold tabular-nums">{money(s.summary.borrowed)}</p></div>
                  <div><p className="text-[10px] text-muted">{t('statement.repaid')}</p><p className="text-xs font-semibold tabular-nums">{money(s.summary.repaid)}</p></div>
                </div>
              </div>

              {/* Per-person breakdown */}
              <div className="card">
                <p className="text-sm font-semibold text-content mb-3">
                  {t('statement.perPersonTitle')} · {fmtNum(s.summary.personCount)}
                </p>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted text-left">
                        <th className="py-2 pr-2 font-medium">{t('statement.person')}</th>
                        <th className="py-2 px-1 font-medium text-right">{t('statement.lent')}</th>
                        <th className="py-2 px-1 font-medium text-right">{t('statement.received')}</th>
                        <th className="py-2 px-1 font-medium text-right">{t('statement.borrowed')}</th>
                        <th className="py-2 px-1 font-medium text-right">{t('statement.repaid')}</th>
                        <th className="py-2 pl-1 font-medium text-right">{t('statement.net')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.persons.map((p) => (
                        <tr key={p.person} className="border-t border-line">
                          <td className="py-2 pr-2 font-medium text-content">{p.person}</td>
                          <td className="py-2 px-1 text-right tabular-nums">{p.lent ? money(p.lent) : '—'}</td>
                          <td className="py-2 px-1 text-right tabular-nums">{p.received ? money(p.received) : '—'}</td>
                          <td className="py-2 px-1 text-right tabular-nums">{p.borrowed ? money(p.borrowed) : '—'}</td>
                          <td className="py-2 px-1 text-right tabular-nums">{p.repaid ? money(p.repaid) : '—'}</td>
                          <td className={`py-2 pl-1 text-right font-semibold tabular-nums ${p.net >= 0 ? 'text-positive print-pos' : 'text-negative print-neg'}`}>
                            {money(p.net)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-line font-semibold text-content">
                        <td className="py-2 pr-2">{t('statement.net')}</td>
                        <td className="py-2 px-1 text-right tabular-nums">{money(s.summary.lent)}</td>
                        <td className="py-2 px-1 text-right tabular-nums">{money(s.summary.received)}</td>
                        <td className="py-2 px-1 text-right tabular-nums">{money(s.summary.borrowed)}</td>
                        <td className="py-2 px-1 text-right tabular-nums">{money(s.summary.repaid)}</td>
                        <td className={`py-2 pl-1 text-right tabular-nums ${s.summary.net >= 0 ? 'text-positive print-pos' : 'text-negative print-neg'}`}>
                          {money(s.summary.net)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
