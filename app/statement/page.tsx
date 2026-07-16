'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import AppBar from '@/components/AppBar'
import { FileTextIcon } from '@/components/Icons'
import { t, useLang, fmtNum, fmtDate } from '@/lib/i18n'
import { round2 } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { toast } from '@/lib/toast'
import { buildStatement, type Statement } from '@/lib/statement'
import { exportNodeToPdf } from '@/lib/pdf'

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
  // Personal spending is included by default; the user can opt out per statement.
  const [includeExpenses, setIncludeExpenses] = useState(true)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  // Hidden, inline-styled light template captured for the PDF (see below).
  const pdfRef = useRef<HTMLDivElement>(null)

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
    buildStatement(range.from, range.to, includeExpenses)
      .then((s) => { if (!cancelled) { setData(s); setGeneratedAt(new Date()) } })
      .catch(() => { if (!cancelled) toast.error(t('statement.loadError')) })
      .finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [user, range, rangeValid, includeExpenses])

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

  const handleDownload = async () => {
    const node = pdfRef.current
    if (!node || !range || exporting) return
    haptic()
    setExporting(true)
    try {
      const filename = `lifetrack-statement-${range.from}_${range.to}.pdf`
      // Captures the hidden template below — every color there is a hardcoded
      // light hex, so the PDF is light no matter what theme the app is in.
      await exportNodeToPdf(node, filename, t('statement.title'))
    } catch {
      toast.error(t('statement.pdfError'))
    } finally {
      setExporting(false)
    }
  }

  if (!user || !range) return null

  const s = data
  const hasExpenses = !!(s?.expenses && s.expenses.count > 0)
  // A statement is non-empty if it has person activity OR (opted-in) spending.
  const hasData = !!s && (s.persons.length > 0 || hasExpenses)
  const catLabel = (c: string) => t(`expenses.cat.${c}`)
  const periodLabel = `${fmtDate(range.from)} — ${fmtDate(range.to)}`

  return (
    <div className="min-h-full">
      <AppBar title={t('statement.title')} subtitle={t('statement.subtitle')} back />

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

          <label className="flex items-center justify-between gap-3 card py-3 cursor-pointer">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-content">{t('statement.includeExpenses')}</span>
              <span className="block text-xs text-muted">{t('statement.includeExpensesHint')}</span>
            </span>
            <input
              type="checkbox"
              checked={includeExpenses}
              onChange={(e) => setIncludeExpenses(e.target.checked)}
              className="w-5 h-5 rounded accent-[color:var(--accent)] flex-shrink-0"
            />
          </label>

          <button
            onClick={handleDownload}
            disabled={!hasData || exporting}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            <FileTextIcon className="w-5 h-5" /> {exporting ? t('statement.generating') : t('statement.download')}
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

          {s && !hasData && (
            <div className="card text-center py-10">
              <p className="text-sm text-muted">{t('statement.empty')}</p>
              <p className="text-xs text-muted mt-1">{periodLabel}</p>
            </div>
          )}

          {s && hasData && (
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
                <div className={`grid ${hasExpenses ? 'grid-cols-5' : 'grid-cols-4'} gap-2 pt-1 border-t border-line text-center`}>
                  <div><p className="text-[10px] text-muted">{t('statement.lent')}</p><p className="text-xs font-semibold tabular-nums">{money(s.summary.lent)}</p></div>
                  <div><p className="text-[10px] text-muted">{t('statement.received')}</p><p className="text-xs font-semibold tabular-nums">{money(s.summary.received)}</p></div>
                  <div><p className="text-[10px] text-muted">{t('statement.borrowed')}</p><p className="text-xs font-semibold tabular-nums">{money(s.summary.borrowed)}</p></div>
                  <div><p className="text-[10px] text-muted">{t('statement.repaid')}</p><p className="text-xs font-semibold tabular-nums">{money(s.summary.repaid)}</p></div>
                  {hasExpenses && <div><p className="text-[10px] text-muted">{t('statement.expensesLabel')}</p><p className="text-xs font-semibold tabular-nums text-negative print-neg">{money(s.summary.expenses)}</p></div>}
                </div>
              </div>

              {/* Per-person breakdown */}
              {s.persons.length > 0 && (
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
              )}

              {/* Personal spending breakdown (only when included and non-empty) */}
              {hasExpenses && s.expenses && (
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-content">{t('statement.expensesTitle')}</p>
                    <p className="text-base font-bold text-negative print-neg tabular-nums">{money(s.expenses.total)}</p>
                  </div>
                  <div className="space-y-2">
                    {s.expenses.byCategory.map((c) => (
                      <div key={c.category} className="flex items-center justify-between text-xs border-t border-line pt-2 first:border-t-0 first:pt-0">
                        <span className="text-content">{catLabel(c.category)}</span>
                        <span className="font-semibold tabular-nums">{money(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hidden PDF template. Rendered off-screen (NOT display:none — html-to-image
          needs layout) with ONLY hardcoded light inline styles: no theme classes,
          no CSS variables, so the exported PDF is always light regardless of the
          app theme. This is the node handleDownload captures. */}
      {s && hasData && (
        // Off-screen positioning lives on this WRAPPER, not on the captured node:
        // html-to-image clones the node with its inline styles, so a fixed
        // left:-10000px on the node itself would render off-canvas → blank PDF.
        <div aria-hidden="true" style={{ position: 'fixed', left: '-10000px', top: 0 }}>
        <div
          ref={pdfRef}
          style={{
            width: 794, // ~A4 width @96dpi
            background: '#ffffff',
            color: '#101828',
            padding: 32,
            fontFamily: 'inherit',
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>LifeTrack — {t('statement.title')}</h1>
          <div style={{ fontSize: 12, color: '#5e6879', marginTop: 6, lineHeight: 1.6 }}>
            <div>{t('statement.period')}: {periodLabel}</div>
            {user.email && <div>{t('statement.account')}: {user.email}</div>}
            {generatedAt && <div>{t('statement.generatedAt')}: {fmtDate(generatedAt, true)}</div>}
          </div>

          {/* Summary strip */}
          <div style={{ display: 'flex', gap: 24, marginTop: 20, padding: '14px 16px', border: '1px solid #e7e9ee', borderRadius: 10, background: '#f7f8fa' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#5e6879' }}>{t('statement.moneyIn')}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#15803d' }}>{money(s.summary.moneyIn)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#5e6879' }}>{t('statement.moneyOut')}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#b91c1c' }}>{money(s.summary.moneyOut)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#5e6879' }}>{t('statement.net')}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.summary.net >= 0 ? '#15803d' : '#b91c1c' }}>{money(s.summary.net)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 10, fontSize: 12 }}>
            <div style={{ flex: 1 }}>{t('statement.lent')}: <b>{money(s.summary.lent)}</b></div>
            <div style={{ flex: 1 }}>{t('statement.received')}: <b>{money(s.summary.received)}</b></div>
            <div style={{ flex: 1 }}>{t('statement.borrowed')}: <b>{money(s.summary.borrowed)}</b></div>
            <div style={{ flex: 1 }}>{t('statement.repaid')}: <b>{money(s.summary.repaid)}</b></div>
            {hasExpenses && <div style={{ flex: 1 }}>{t('statement.expensesLabel')}: <b>{money(s.summary.expenses)}</b></div>}
          </div>

          {/* Per-person table */}
          {s.persons.length > 0 && (
          <>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>
            {t('statement.perPersonTitle')} · {fmtNum(s.summary.personCount)}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {[t('statement.person'), t('statement.lent'), t('statement.received'), t('statement.borrowed'), t('statement.repaid'), t('statement.net')].map((h, i) => (
                  <th key={h} style={{ border: '1px solid #d1d5db', background: '#f3f4f6', padding: '6px 8px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.persons.map((p) => (
                <tr key={p.person}>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', fontWeight: 600 }}>{p.person}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right' }}>{p.lent ? money(p.lent) : '—'}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right' }}>{p.received ? money(p.received) : '—'}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right' }}>{p.borrowed ? money(p.borrowed) : '—'}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right' }}>{p.repaid ? money(p.repaid) : '—'}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: p.net >= 0 ? '#15803d' : '#b91c1c' }}>{money(p.net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', fontWeight: 700, background: '#f7f8fa' }}>{t('statement.net')}</td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right', fontWeight: 700, background: '#f7f8fa' }}>{money(s.summary.lent)}</td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right', fontWeight: 700, background: '#f7f8fa' }}>{money(s.summary.received)}</td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right', fontWeight: 700, background: '#f7f8fa' }}>{money(s.summary.borrowed)}</td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right', fontWeight: 700, background: '#f7f8fa' }}>{money(s.summary.repaid)}</td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right', fontWeight: 700, background: '#f7f8fa', color: s.summary.net >= 0 ? '#15803d' : '#b91c1c' }}>{money(s.summary.net)}</td>
              </tr>
            </tfoot>
          </table>
          </>
          )}

          {/* Personal spending breakdown */}
          {hasExpenses && s.expenses && (
          <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 14, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>
            <span>{t('statement.expensesTitle')}</span>
            <span style={{ color: '#b91c1c' }}>{money(s.expenses.total)}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {s.expenses.byCategory.map((c) => (
                <tr key={c.category}>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px 8px' }}>{catLabel(c.category)}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{money(c.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', fontWeight: 700, background: '#f7f8fa' }}>{t('statement.expensesLabel')}</td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right', fontWeight: 700, background: '#f7f8fa', color: '#b91c1c' }}>{money(s.expenses.total)}</td>
              </tr>
            </tfoot>
          </table>
          </>
          )}
        </div>
        </div>
      )}
    </div>
  )
}
