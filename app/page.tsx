'use client'

import { useEffect, useState, useRef, type ComponentType } from 'react'
import { subscribeToDebts, subscribeToLoans, subscribeToReminders } from '@/lib/storage'
import type { Debt, Loan, Reminder } from '@/lib/types'
import Link from 'next/link'
import { useAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'
import { DashboardSkeleton } from '@/components/SkeletonLoader'
import AppBar from '@/components/AppBar'
import { round2 } from '@/lib/format'
import { t, useLang, fmtNum, fmtInt, fmtRelative } from '@/lib/i18n'
import {
  ClockIcon, ArrowUpRightIcon, ArrowDownLeftIcon, WalletIcon,
  RotateIcon, PlusCircleIcon, ChartIcon,
} from '@/components/Icons'

const bn = (n: number) => fmtNum(round2(n))
const bnInt = (n: number) => fmtNum(Math.round(n))

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return t('greeting.morning')
  if (h < 16) return t('greeting.noon')
  if (h < 19) return t('greeting.afternoon')
  return t('greeting.evening')
}

const ts = (s?: string) => {
  if (!s) return 0
  const t = new Date(s).getTime()
  return Number.isFinite(t) ? t : 0
}

const sumPayments = (items?: { amount: number }[]) =>
  (items || []).reduce((s, p) => s + (typeof p.amount === 'number' ? p.amount : 0), 0)

const isThisMonth = (s?: string) => {
  const t = ts(s)
  if (!t) return false
  const d = new Date(t)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

// Count-up: eases the displayed number from its previous value to the target.
function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(target)
  const ref = useRef(target)
  useEffect(() => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { ref.current = target; setVal(target); return }
    const from = ref.current
    const diff = target - from
    if (diff === 0) return
    let startT: number | null = null
    let raf = 0
    const step = (t: number) => {
      if (startT === null) startT = t
      const p = Math.min((t - startT) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const cur = from + diff * eased
      ref.current = cur
      setVal(cur)
      if (p < 1) raf = requestAnimationFrame(step)
      else { ref.current = target; setVal(target) }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-2 text-content flex items-center justify-center text-xs font-semibold">
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  )
}

type Activity = {
  id: string
  t: number
  tone: 'pos' | 'neg' | 'warn'
  Icon: ComponentType<{ className?: string }>
  text: string
  amount: number
}

export default function Dashboard() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [mounted, setMounted] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const { user, loading } = useAuth()
  const router = useRouter()
  useLang() // re-render on language switch

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    setMounted(true)
    // Realtime subscriptions render instantly from the Firestore persistent
    // cache and stay live — no refetch-on-focus or manual reloads needed.
    const seen = new Set<string>()
    const arrived = (key: string) => {
      seen.add(key)
      if (seen.size === 3) setDataLoading(false)
    }
    const unsubs = [
      subscribeToDebts(user.uid, (d) => { setDebts(d); arrived('d') }),
      subscribeToLoans(user.uid, (l) => { setLoans(l); arrived('l') }),
      subscribeToReminders(user.uid, (r) => { setReminders(r); arrived('r') }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [user, loading, router])

  // Pull-to-refresh (mobile) — only engages when scrolled to the very top.
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = window.scrollY <= 0 && !refreshing ? e.touches[0].clientY : null
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0 && window.scrollY <= 0) setPull(Math.min(dy * 0.5, 90))
    else setPull(0)
  }
  const onTouchEnd = async () => {
    if (startY.current === null) return
    startY.current = null
    if (pull > 55) {
      // Data is live via subscriptions — spin briefly as acknowledgement.
      setRefreshing(true)
      setPull(48)
      await new Promise((res) => setTimeout(res, 500))
      setRefreshing(false)
    }
    setPull(0)
  }

  // ---- Derived values ----
  const remainingOf = (item: Debt | Loan) => {
    const totalAmount = (typeof item.amount === 'number' ? item.amount : 0) + sumPayments(item.increases)
    const remaining = totalAmount - sumPayments(item.payments)
    return Math.max(0, round2(remaining))
  }

  const debtDetails = debts
    .filter((d) => !d.returned)
    .map((d) => ({ id: d.id, name: d.personName || t('common.unknown'), amount: remainingOf(d) }))
    .filter((d) => d.amount > 0)
  const loanDetails = loans
    .filter((l) => !l.returned)
    .map((l) => ({ id: l.id, name: l.personName || t('common.unknown'), amount: remainingOf(l) }))
    .filter((l) => l.amount > 0)

  const totalLent = round2(debtDetails.reduce((s, d) => s + d.amount, 0))
  const totalBorrowed = round2(loanDetails.reduce((s, l) => s + l.amount, 0))
  const netBalance = round2(totalLent - totalBorrowed)

  const total = totalLent + totalBorrowed
  const lentPct = total > 0 ? (totalLent / total) * 100 : 0
  const borrowedPct = total > 0 ? (totalBorrowed / total) * 100 : 0

  const topDebts = [...debtDetails].sort((a, b) => b.amount - a.amount)
  const topLoans = [...loanDetails].sort((a, b) => b.amount - a.amount)
  const LIST_CAP = 4
  const isEmpty = debtDetails.length === 0 && loanDetails.length === 0

  // Animated figures (no time deps — safe before the prerender guard)
  const animNet = useCountUp(Math.abs(netBalance))
  const animLent = useCountUp(totalLent)
  const animBorrowed = useCountUp(totalBorrowed)

  if (loading || !mounted || dataLoading) {
    return <DashboardSkeleton />
  }
  if (!user) return null

  // Everything below runs client-only (after mount), so Date.now()/new Date()
  // is safe here — never executed during static prerender.
  const firstName = user.displayName || user.email?.split('@')[0] || t('profile.user')

  // Reminders — overdue / today
  const now = Date.now()
  const activeRem = reminders.filter((r) => !r.dismissed)
  const reminderCount = activeRem.length
  const overdue = activeRem.filter((r) => ts(r.scheduledTime) > 0 && ts(r.scheduledTime) < now)
  const todayRem = activeRem.filter(
    (r) => ts(r.scheduledTime) >= now && isSameDay(new Date(ts(r.scheduledTime)), new Date())
  )

  // This month — money returned to you / by you
  const receivedThisMonth = round2(
    debts.reduce((s, d) => s + sumPayments((d.payments || []).filter((p) => isThisMonth(p.date || p.createdAt))), 0)
  )
  const paidThisMonth = round2(
    loans.reduce((s, l) => s + sumPayments((l.payments || []).filter((p) => isThisMonth(p.date || p.createdAt))), 0)
  )

  // Last 6 months trend — received (debt payments) vs paid (loan payments) per month.
  // Buckets built from `new Date()` here (client-only, past the mount guard).
  const monthBuckets = (() => {
    const base = new Date()
    const arr = Array.from({ length: 6 }, (_, k) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (5 - k), 1)
      return { year: d.getFullYear(), month: d.getMonth(), received: 0, paid: 0 }
    })
    const idxOf = (y: number, m: number) => arr.findIndex((b) => b.year === y && b.month === m)
    const add = (items: { amount?: number; date?: string; createdAt?: string }[] | undefined, key: 'received' | 'paid') => {
      ;(items || []).forEach((p) => {
        const time = ts(p.date || p.createdAt)
        if (!time) return
        const d = new Date(time)
        const i = idxOf(d.getFullYear(), d.getMonth())
        if (i >= 0) arr[i][key] += typeof p.amount === 'number' ? p.amount : 0
      })
    }
    debts.forEach((d) => add(d.payments, 'received'))
    loans.forEach((l) => add(l.payments, 'paid'))
    return arr
  })()
  const trendMax = Math.max(0, ...monthBuckets.map((b) => Math.max(b.received, b.paid)))
  const hasTrend = trendMax > 0

  // Recent activity feed
  const activity: Activity[] = []
  debts.forEach((d) => {
    const name = d.personName || t('common.unknown')
    activity.push({ id: `dc-${d.id}`, t: ts(d.createdAt || d.date), tone: 'pos', Icon: ArrowUpRightIcon, text: t('dashboard.lentTo', { name }), amount: d.amount || 0 })
    ;(d.payments || []).forEach((p) => activity.push({ id: `dp-${p.id}`, t: ts(p.createdAt || p.date), tone: 'pos', Icon: RotateIcon, text: t('dashboard.returnedYou', { name }), amount: p.amount || 0 }))
    ;(d.increases || []).forEach((i) => activity.push({ id: `di-${i.id}`, t: ts(i.createdAt || i.date), tone: 'warn', Icon: PlusCircleIcon, text: t('dashboard.increased', { name }), amount: i.amount || 0 }))
  })
  loans.forEach((l) => {
    const name = l.personName || t('common.unknown')
    activity.push({ id: `lc-${l.id}`, t: ts(l.createdAt || l.date), tone: 'neg', Icon: ArrowDownLeftIcon, text: t('dashboard.borrowedFrom', { name }), amount: l.amount || 0 })
    ;(l.payments || []).forEach((p) => activity.push({ id: `lp-${p.id}`, t: ts(p.createdAt || p.date), tone: 'neg', Icon: RotateIcon, text: t('dashboard.youReturned', { name }), amount: p.amount || 0 }))
    ;(l.increases || []).forEach((i) => activity.push({ id: `li-${i.id}`, t: ts(i.createdAt || i.date), tone: 'warn', Icon: PlusCircleIcon, text: t('dashboard.increased', { name }), amount: i.amount || 0 }))
  })
  const recent = activity.sort((a, b) => b.t - a.t).slice(0, 6)

  const toneText = { pos: 'text-positive', neg: 'text-negative', warn: 'text-caution' } as const
  const toneTint = { pos: 'tint-pos', neg: 'tint-neg', warn: 'tint-warn' } as const

  return (
    <div className="min-h-full">
      <AppBar title="LifeTrack" subtitle={`${greeting()}, ${firstName}`} />

      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden text-muted"
        style={{ height: pull, transition: startY.current === null ? 'height .25s ease' : 'none' }}
      >
        <RotateIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5 fade-in">
          {/* Reminder alert banner */}
          {overdue.length > 0 ? (
            <Link href="/reminders" className="card card-interactive bar-neg flex items-center gap-3 py-3">
              <span className="tint-neg text-negative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
                <ClockIcon className="w-5 h-5" />
              </span>
              <span className="text-sm text-content flex-1">
                {t('dashboard.overdueReminders', { count: fmtInt(overdue.length) })}
              </span>
              <span className="text-xs text-accent font-medium">{t('dashboard.view')}</span>
            </Link>
          ) : todayRem.length > 0 ? (
            <Link href="/reminders" className="card card-interactive bar-pos flex items-center gap-3 py-3">
              <span className="tint-accent text-accent w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
                <ClockIcon className="w-5 h-5" />
              </span>
              <span className="text-sm text-content flex-1">
                {t('dashboard.todayReminders', { count: fmtInt(todayRem.length) })}
              </span>
              <span className="text-xs text-accent font-medium">{t('dashboard.view')}</span>
            </Link>
          ) : null}

          {/* Net balance hero */}
          <div className="card">
            <p className="text-sm text-muted mb-1">{t('dashboard.netBalance')}</p>
            <p className={`text-4xl font-bold tracking-tight ${netBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
              ৳{bn(animNet)}
            </p>
            <p className="text-sm text-muted mt-1">
              {netBalance > 0
                ? t('dashboard.aheadBy', { amount: bn(Math.abs(netBalance)) })
                : netBalance < 0
                  ? t('dashboard.oweBy', { amount: bn(Math.abs(netBalance)) })
                  : t('dashboard.allSettled')}
            </p>

            {total > 0 && (
              <div className="mt-4">
                <div className="flex h-2 rounded-full overflow-hidden bg-surface-2">
                  <div className="bg-positive" style={{ width: `${lentPct}%` }} />
                  <div className="bg-negative" style={{ width: `${borrowedPct}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-positive inline-block" /> {t('dashboard.willReceive')}
                  </span>
                  <span className="flex items-center gap-1">
                    {t('dashboard.willPay')} <span className="w-2 h-2 rounded-full bg-negative inline-block" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Two-up summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-tile tint-pos">
              <div className="flex items-center gap-2 text-positive mb-2">
                <ArrowUpRightIcon className="w-5 h-5" />
                <span className="text-xs font-medium text-positive">{t('dashboard.willReceive')}</span>
              </div>
              <p className="text-2xl font-bold text-content">৳{bn(animLent)}</p>
              <p className="text-[11px] text-muted mt-0.5">{t('common.people', { count: fmtInt(debtDetails.length) })}</p>
            </div>
            <div className="stat-tile tint-neg">
              <div className="flex items-center gap-2 text-negative mb-2">
                <ArrowDownLeftIcon className="w-5 h-5" />
                <span className="text-xs font-medium text-negative">{t('dashboard.willPay')}</span>
              </div>
              <p className="text-2xl font-bold text-content">৳{bn(animBorrowed)}</p>
              <p className="text-[11px] text-muted mt-0.5">{t('common.people', { count: fmtInt(loanDetails.length) })}</p>
            </div>
          </div>

          {/* This month summary */}
          {(receivedThisMonth > 0 || paidThisMonth > 0) && (
            <div className="card">
              <p className="text-sm font-semibold text-content mb-3">{t('dashboard.thisMonth')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted mb-1">{t('dashboard.receivedBack')}</p>
                  <p className="text-lg font-bold text-positive">৳{bn(receivedThisMonth)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">{t('dashboard.paidBack')}</p>
                  <p className="text-lg font-bold text-negative">৳{bn(paidThisMonth)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Last 6 months trend chart */}
          {hasTrend && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-content flex items-center gap-2">
                  <ChartIcon className="w-4 h-4 text-accent" />
                  {t('dashboard.trendTitle')}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-positive inline-block" /> {t('dashboard.received')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-negative inline-block" /> {t('dashboard.paid')}
                  </span>
                </div>
              </div>
              <div className="flex items-end justify-between gap-2 h-24 border-b border-line">
                {monthBuckets.map((b) => (
                  <div
                    key={`${b.year}-${b.month}`}
                    className="flex-1 flex items-end justify-center gap-1 h-full"
                    title={`${t(`dashboard.mon.${b.month}`)} — ${t('dashboard.received')}: ৳${bn(b.received)}, ${t('dashboard.paid')}: ৳${bn(b.paid)}`}
                  >
                    <div
                      className="w-1/2 max-w-[12px] bg-positive rounded-t-sm transition-all"
                      style={{ height: `${(b.received / trendMax) * 100}%` }}
                    />
                    <div
                      className="w-1/2 max-w-[12px] bg-negative rounded-t-sm transition-all"
                      style={{ height: `${(b.paid / trendMax) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                {monthBuckets.map((b) => (
                  <span key={`${b.year}-${b.month}`} className="flex-1 text-center text-[10px] text-muted">
                    {t(`dashboard.mon.${b.month}`)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {isEmpty && (
            <div className="card flex flex-col items-center text-center py-8 gap-3">
              <span className="w-14 h-14 rounded-full tint-accent text-accent flex items-center justify-center">
                <WalletIcon className="w-7 h-7" />
              </span>
              <div>
                <p className="text-base font-semibold text-content">{t('dashboard.noRecords')}</p>
                <p className="text-sm text-muted mt-1">{t('dashboard.startHint')}</p>
              </div>
              <div className="flex gap-2 mt-1">
                <Link href="/debts" className="btn btn-primary">{t('dashboard.lentBtn')}</Link>
                <Link href="/loans" className="btn btn-secondary">{t('dashboard.borrowedBtn')}</Link>
              </div>
            </div>
          )}

          {/* Receivables list */}
          {topDebts.length > 0 && (
            <div className="card bar-pos">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-positive">{t('dashboard.receivables')}</p>
                {topDebts.length > LIST_CAP && (
                  <Link href="/debts" className="text-xs font-medium text-accent">{t('common.viewAll')}</Link>
                )}
              </div>
              <div className="divide-y divide-line">
                {topDebts.slice(0, LIST_CAP).map((d) => (
                  <div key={d.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <Avatar name={d.name} />
                    <span className="text-sm text-content flex-1 truncate">{d.name}</span>
                    <span className="text-sm font-semibold text-positive">৳{bn(d.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payables list */}
          {topLoans.length > 0 && (
            <div className="card bar-neg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-negative">{t('dashboard.payables')}</p>
                {topLoans.length > LIST_CAP && (
                  <Link href="/loans" className="text-xs font-medium text-accent">{t('common.viewAll')}</Link>
                )}
              </div>
              <div className="divide-y divide-line">
                {topLoans.slice(0, LIST_CAP).map((l) => (
                  <div key={l.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <Avatar name={l.name} />
                    <span className="text-sm text-content flex-1 truncate">{l.name}</span>
                    <span className="text-sm font-semibold text-negative">৳{bn(l.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity feed */}
          {recent.length > 0 && (
            <div className="card">
              <p className="text-sm font-semibold text-content mb-3">{t('dashboard.recentActivity')}</p>
              <div className="divide-y divide-line">
                {recent.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className={`w-8 h-8 rounded-full ${toneTint[a.tone]} ${toneText[a.tone]} flex items-center justify-center flex-shrink-0`}>
                      <a.Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-content truncate">{a.text}</p>
                      {a.t > 0 && <p className="text-[11px] text-muted">{fmtRelative(a.t)}</p>}
                    </div>
                    <span className={`text-sm font-semibold ${toneText[a.tone]}`}>৳{bn(a.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-3">
            <Link href="/reminders" className="card card-interactive flex flex-col items-center gap-2 py-4 text-center">
              <span className="text-accent"><ClockIcon className="w-6 h-6" /></span>
              <span className="text-xs font-medium text-content">{t('nav.reminders')}</span>
              <span className="text-[11px] text-muted">{t('dashboard.activeCount', { count: fmtInt(reminderCount) })}</span>
            </Link>
            <Link href="/debts" className="card card-interactive bar-pos flex flex-col items-center gap-2 py-4 text-center">
              <span className="text-positive"><ArrowUpRightIcon className="w-6 h-6" /></span>
              <span className="text-xs font-medium text-content">{t('nav.given')}</span>
              <span className="text-[11px] text-muted">৳{bnInt(totalLent)}</span>
            </Link>
            <Link href="/loans" className="card card-interactive bar-neg flex flex-col items-center gap-2 py-4 text-center">
              <span className="text-negative"><ArrowDownLeftIcon className="w-6 h-6" /></span>
              <span className="text-xs font-medium text-content">{t('nav.taken')}</span>
              <span className="text-[11px] text-muted">৳{bnInt(totalBorrowed)}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
