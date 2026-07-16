'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { subscribeToDebts, subscribeToLoans } from '@/lib/storage'
import type { Debt, Loan } from '@/lib/types'
import { useAuth } from '@/lib/firebase-auth'
import { t, useLang, fmtNum, fmtDate, fmtInt } from '@/lib/i18n'
import { round2, toMillis } from '@/lib/format'
import AppBar from '@/components/AppBar'
import { ListSkeleton } from '@/components/SkeletonLoader'
import { NoResultsIllustration } from '@/components/Illustrations'
import { avatarColor } from '@/lib/avatar'
import {
  ArrowUpRightIcon, ArrowDownLeftIcon, RotateIcon, PlusCircleIcon,
  ScaleIcon, ClockIcon, HistoryIcon, ChevronDownIcon,
} from '@/components/Icons'

const bn = (n: number) => fmtNum(round2(n))

const sumAmounts = (items?: { amount: number }[]) =>
  (items || []).reduce((s, p) => s + (typeof p.amount === 'number' ? p.amount : 0), 0)

// Outstanding balance of a debt/loan: initial + increases − payments, floored at 0.
const remainingOf = (item: Debt | Loan) =>
  Math.max(0, round2((typeof item.amount === 'number' ? item.amount : 0) + sumAmounts(item.increases) - sumAmounts(item.payments)))

// Normalize a phone for wa.me: digits only; local BD numbers (11 digits
// starting 01) get the 880 country code prefixed.
const waDigits = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('01') ? `880${digits}` : digits
}

type TimelineEvent = {
  id: string
  at: number
  tone: 'pos' | 'neg' | 'warn'
  Icon: ComponentType<{ className?: string }>
  label: string
  note?: string // reason/payment-note for context ("why / what")
  date: string
  amount: number
}

export default function PersonView({ personName }: { personName: string }) {
  useLang() // re-render on language switch
  const [debts, setDebts] = useState<Debt[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [mounted, setMounted] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Realtime sync — same live-subscription pattern as the debts/loans pages,
  // filtered down to this person's records (soft-deleted ones excluded).
  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    setDataLoading(true)
    const seen = new Set<string>()
    const arrived = (key: string) => {
      seen.add(key)
      if (seen.has('d') && seen.has('l')) setDataLoading(false)
    }
    const unsubs = [
      subscribeToDebts(user.uid, (data) => {
        setDebts(data.filter((d) => d.personName === personName && !d.deletedAt))
        arrived('d')
      }),
      subscribeToLoans(user.uid, (data) => {
        setLoans(data.filter((l) => l.personName === personName && !l.deletedAt))
        arrived('l')
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [user, loading, router, personName])

  // Nothing below this guard runs during static prerender, so date math on
  // loaded data is safe (mirrors the mounted-state pattern on other pages).
  if (!mounted) {
    return null
  }

  const isEmpty = debts.length === 0 && loans.length === 0

  // ---- Net position ----
  const theyOwe = round2(debts.filter((d) => !d.returned).reduce((s, d) => s + remainingOf(d), 0))
  const youOwe = round2(loans.filter((l) => !l.returned).reduce((s, l) => s + remainingOf(l), 0))
  const netBalance = round2(theyOwe - youOwe)

  // ---- Contact actions ----
  const phone = [...debts, ...loans].find((x) => x.personPhone)?.personPhone
  const waMsg = t('person.waTemplate', { name: personName, amount: bn(theyOwe) })

  // ---- Repayment behavior ----
  // For each debt with a due date that got fully settled, the delay is the gap
  // (in days) between the due date and the payment that cleared the balance.
  const settleDelays = debts
    .map((d) => {
      const due = d.dueDate ? toMillis(d.dueDate) : 0
      if (!due) return null
      const total = round2((typeof d.amount === 'number' ? d.amount : 0) + sumAmounts(d.increases))
      const pays = [...(d.payments || [])].sort(
        (a, b) => toMillis(a.date || a.createdAt) - toMillis(b.date || b.createdAt)
      )
      let cumulative = 0
      for (const p of pays) {
        cumulative += typeof p.amount === 'number' ? p.amount : 0
        if (round2(cumulative) >= total) {
          const settledAt = toMillis(p.date || p.createdAt)
          if (!settledAt) return null
          return Math.round((settledAt - due) / 86400000)
        }
      }
      // Cumulative never reached the total but the debt is flagged returned —
      // e.g. an increase was added after it was already settled. Treat the last
      // payment as the settlement so a genuine repayment isn't dropped.
      if (d.returned && pays.length) {
        const last = pays[pays.length - 1]
        const settledAt = toMillis(last.date || last.createdAt)
        return settledAt ? Math.round((settledAt - due) / 86400000) : null
      }
      return null
    })
    .filter((x): x is number => x !== null)
  const onTimeCount = settleDelays.filter((d) => d <= 0).length
  const lateCount = settleDelays.length - onTimeCount
  const avgDelay = settleDelays.length
    ? Math.round(settleDelays.reduce((a, b) => a + b, 0) / settleDelays.length)
    : 0
  const hasBehaviorData = settleDelays.length > 0
  const totalTransactions = debts.length + loans.length
  // Always-available counts so the card is useful even before anything is
  // settled (the delay insight above needs settled-with-due-date history).
  const allRecords = [...debts, ...loans]
  const settledCount = allRecords.filter((r) => r.returned).length
  const activeCount = allRecords.filter((r) => !r.returned).length
  const nowMs = Date.now()
  // Day-based (not strict-instant) so it matches dueBadge: a record due today is
  // "আজ", counted overdue only once its due day has fully passed.
  const overdueCount = allRecords.filter((r) => !r.returned && r.dueDate && Math.ceil((toMillis(r.dueDate) - nowMs) / 86400000) < 0).length

  // ---- Unified timeline (newest first) ----
  const events: TimelineEvent[] = []
  debts.forEach((d) => {
    events.push({ id: `dc-${d.id}`, at: toMillis(d.createdAt) || toMillis(d.date), tone: 'pos', Icon: ArrowUpRightIcon, label: t('person.evLent'), note: d.reason, date: d.date, amount: d.amount || 0 })
    ;(d.payments || []).forEach((p, i) =>
      events.push({ id: `dp-${d.id}-${p.id || i}`, at: toMillis(p.createdAt) || toMillis(p.date), tone: 'pos', Icon: RotateIcon, label: t('person.evDebtPayment'), note: p.note, date: p.date, amount: p.amount || 0 })
    )
    ;(d.increases || []).forEach((inc, i) =>
      events.push({ id: `di-${d.id}-${inc.id || i}`, at: toMillis(inc.createdAt) || toMillis(inc.date), tone: 'warn', Icon: PlusCircleIcon, label: t('person.evIncrease'), note: inc.reason, date: inc.date, amount: inc.amount || 0 })
    )
  })
  loans.forEach((l) => {
    events.push({ id: `lc-${l.id}`, at: toMillis(l.createdAt) || toMillis(l.date), tone: 'neg', Icon: ArrowDownLeftIcon, label: t('person.evBorrowed'), note: l.reason, date: l.date, amount: l.amount || 0 })
    ;(l.payments || []).forEach((p, i) =>
      events.push({ id: `lp-${l.id}-${p.id || i}`, at: toMillis(p.createdAt) || toMillis(p.date), tone: 'neg', Icon: RotateIcon, label: t('person.evLoanPayment'), note: p.note, date: p.date, amount: p.amount || 0 })
    )
    ;(l.increases || []).forEach((inc, i) =>
      events.push({ id: `li-${l.id}-${inc.id || i}`, at: toMillis(inc.createdAt) || toMillis(inc.date), tone: 'warn', Icon: PlusCircleIcon, label: t('person.evIncrease'), note: inc.reason, date: inc.date, amount: inc.amount || 0 })
    )
  })
  events.sort((a, b) => b.at - a.at)

  // ---- Itemized active records (the "who owes what, per record" breakdown) ----
  const recordTs = (r: Debt | Loan) => toMillis(r.createdAt) || toMillis(r.date)
  const activeDebts = debts.filter((d) => !d.returned && remainingOf(d) > 0)
    .sort((a, b) => recordTs(b) - recordTs(a)) // newest first
  const activeLoans = loans.filter((l) => !l.returned && remainingOf(l) > 0)
    .sort((a, b) => recordTs(b) - recordTs(a))
  const dueBadge = (item: Debt | Loan) => {
    if (!item.dueDate) return null
    const days = Math.ceil((toMillis(item.dueDate) - nowMs) / 86400000)
    if (days < 0) return <span className="chip text-[10px] tint-neg text-negative">{t('due.overdue', { count: fmtInt(-days) })}</span>
    if (days === 0) return <span className="chip text-[10px] tint-warn text-caution">{t('due.today')}</span>
    return <span className="chip text-[10px] tint-warn text-caution">{t('due.daysLeft', { count: fmtInt(days) })}</span>
  }
  const recordRow = (item: Debt | Loan, href: string, tone: 'pos' | 'neg') => (
    <Link key={item.id} href={href} className="flex items-center gap-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-content truncate">{item.reason || fmtDate(item.date)}</p>
        <p className="text-[11px] text-muted flex items-center gap-1.5 flex-wrap">
          <span>{fmtDate(item.date)}</span>
          {dueBadge(item)}
        </p>
      </div>
      <span className={`text-sm font-semibold flex-shrink-0 tabular-nums ${tone === 'pos' ? 'text-positive' : 'text-negative'}`}>৳{bn(remainingOf(item))}</span>
    </Link>
  )

  const toneText = { pos: 'text-positive', neg: 'text-negative', warn: 'text-caution' } as const
  const toneTint = { pos: 'tint-pos', neg: 'tint-neg', warn: 'tint-warn' } as const

  const avatar = avatarColor(personName)

  return (
    <div className="min-h-full">
      <AppBar title={personName} subtitle={t('person.subtitle')} back />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
        {dataLoading ? (
          <ListSkeleton count={3} />
        ) : isEmpty ? (
          <div className="text-center py-16">
            <NoResultsIllustration className="w-48 h-28 mx-auto mb-3" />
            <p className="text-muted text-sm">{t('person.empty')}</p>
          </div>
        ) : (
          <>
            {/* Net position hero */}
            <div className="card space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold flex-shrink-0"
                  style={{ backgroundColor: avatar.bg, color: avatar.fg }}
                >
                  {(personName.trim().charAt(0) || '?').toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-muted flex items-center gap-1.5">
                    <ScaleIcon className="w-4 h-4" /> {t('person.net')}
                  </p>
                  <p className={`text-3xl font-bold tracking-tight tabular-nums ${netBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
                    ৳{bn(Math.abs(netBalance))}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {netBalance > 0
                      ? t('person.netPositive', { amount: bn(netBalance) })
                      : netBalance < 0
                        ? t('person.netNegative', { amount: bn(Math.abs(netBalance)) })
                        : t('person.netSettled')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="stat-tile tint-pos">
                  <div className="flex items-center gap-2 mb-2 text-positive">
                    <ArrowUpRightIcon className="w-5 h-5" />
                    <span className="text-xs font-medium text-positive">{t('person.theyOwe')}</span>
                  </div>
                  <p className="text-[clamp(0.85rem,4.2vw,1.375rem)] font-bold text-content tracking-tight tabular-nums leading-tight">৳{bn(theyOwe)}</p>
                </div>
                <div className="stat-tile tint-neg">
                  <div className="flex items-center gap-2 mb-2 text-negative">
                    <ArrowDownLeftIcon className="w-5 h-5" />
                    <span className="text-xs font-medium text-negative">{t('person.youOwe')}</span>
                  </div>
                  <p className="text-[clamp(0.85rem,4.2vw,1.375rem)] font-bold text-content tracking-tight tabular-nums leading-tight">৳{bn(youOwe)}</p>
                </div>
              </div>
            </div>

            {/* Call / WhatsApp actions */}
            {phone && (
              <div className="grid grid-cols-2 gap-3">
                <a href={`tel:${phone}`} className="btn btn-secondary w-full">
                  📞 {t('person.call')}
                </a>
                <a
                  href={`https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(waMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full"
                >
                  {t('person.whatsapp')}
                </a>
              </div>
            )}

            {/* Itemized active records — the per-record breakdown behind the
                net totals, split by direction so "who owes what, and why" is
                readable at a glance. Each row deep-links to its full record. */}
            {activeDebts.length > 0 && (
              <div className="card">
                <p className="text-sm font-semibold text-positive mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2"><ArrowUpRightIcon className="w-4 h-4" /> {t('person.theyOwe')}</span>
                  <span className="tabular-nums">৳{bn(theyOwe)}</span>
                </p>
                <div className="divide-y divide-line">
                  {activeDebts.map((d) => recordRow(d, `/debts?id=${d.id}`, 'pos'))}
                </div>
              </div>
            )}
            {activeLoans.length > 0 && (
              <div className="card">
                <p className="text-sm font-semibold text-negative mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2"><ArrowDownLeftIcon className="w-4 h-4" /> {t('person.youOwe')}</span>
                  <span className="tabular-nums">৳{bn(youOwe)}</span>
                </p>
                <div className="divide-y divide-line">
                  {activeLoans.map((l) => recordRow(l, `/loans?id=${l.id}`, 'neg'))}
                </div>
              </div>
            )}

            {/* Repayment behavior */}
            <div className="card space-y-3">
              <p className="text-sm font-semibold text-content flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-accent" /> {t('person.behaviorTitle')}
              </p>
              {/* Delay insight — only meaningful once something with a due date
                  has been fully settled. When settled: show on-time/late split;
                  otherwise a hint that due dates unlock this. */}
              {hasBehaviorData ? (
                <>
                  <p className={`text-sm font-medium ${avgDelay > 0 ? 'text-negative' : 'text-positive'}`}>
                    {avgDelay > 0
                      ? t('person.avgDelayLate', { days: fmtInt(avgDelay) })
                      : avgDelay < 0
                        ? t('person.avgDelayEarly', { days: fmtInt(-avgDelay) })
                        : t('person.avgOnTime')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted mb-0.5">{t('person.onTime')}</p>
                      <p className="text-sm font-semibold text-positive">{fmtInt(onTimeCount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-0.5">{t('person.late')}</p>
                      <p className="text-sm font-semibold text-negative">{fmtInt(lateCount)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted">{t('person.behaviorHint')}</p>
              )}

              {/* Always-visible counts as tinted stat pills — each state reads
                  as its own colored object (number + label side by side)
                  instead of four bare numbers on a hairline grid. */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2.5">
                  <span className="text-lg font-bold text-content tabular-nums">{fmtInt(totalTransactions)}</span>
                  <span className="text-xs text-muted leading-tight">{t('person.totalTransactions')}</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl tint-pos px-3 py-2.5">
                  <span className="text-lg font-bold text-positive tabular-nums">{fmtInt(settledCount)}</span>
                  <span className="text-xs text-muted leading-tight">{t('person.settled')}</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl tint-accent px-3 py-2.5">
                  <span className="text-lg font-bold text-accent tabular-nums">{fmtInt(activeCount)}</span>
                  <span className="text-xs text-muted leading-tight">{t('person.active')}</span>
                </div>
                <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${overdueCount > 0 ? 'tint-neg' : 'bg-surface-2'}`}>
                  <span className={`text-lg font-bold tabular-nums ${overdueCount > 0 ? 'text-negative' : 'text-muted'}`}>{fmtInt(overdueCount)}</span>
                  <span className="text-xs text-muted leading-tight">{t('person.overdue')}</span>
                </div>
              </div>
            </div>

            {/* Unified timeline */}
            {events.length > 0 && (
              <div className="card">
                <p className="text-sm font-semibold text-content mb-3 flex items-center gap-2">
                  <HistoryIcon className="w-4 h-4 text-accent" /> {t('person.timelineTitle')}
                </p>
                <div className="divide-y divide-line">
                  {events.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 py-2.5">
                      <span className={`w-8 h-8 rounded-full ${toneTint[ev.tone]} ${toneText[ev.tone]} flex items-center justify-center flex-shrink-0`}>
                        <ev.Icon className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-content truncate">
                          {ev.label}{ev.note ? <span className="text-muted"> · {ev.note}</span> : ''}
                        </p>
                        <p className="text-[11px] text-muted">{fmtDate(ev.date)}</p>
                      </div>
                      <span className={`text-sm font-semibold flex-shrink-0 ${toneText[ev.tone]}`}>৳{bn(ev.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
