'use client'

import { useEffect, useState, useRef, type ComponentType } from 'react'
import { getDebts, getLoans, getReminders, validateData } from '@/lib/storage'
import type { Debt, Loan, Reminder } from '@/lib/types'
import Link from 'next/link'
import { useAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'
import { DashboardSkeleton } from '@/components/SkeletonLoader'
import AppBar from '@/components/AppBar'
import { round2, toBnDigits, toBnNumber } from '@/lib/format'
import { formatDistanceToNow } from 'date-fns'
import { bn as bnLocale } from 'date-fns/locale'
import {
  ClockIcon, ArrowUpRightIcon, ArrowDownLeftIcon, WalletIcon,
  RotateIcon, PlusCircleIcon,
} from '@/components/Icons'

const bn = (n: number) => toBnNumber(round2(n))
const bnInt = (n: number) => toBnNumber(Math.round(n))

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'শুভ সকাল'
  if (h < 16) return 'শুভ দুপুর'
  if (h < 19) return 'শুভ বিকাল'
  return 'শুভ সন্ধ্যা'
}

const ts = (s?: string) => {
  if (!s) return 0
  const t = new Date(s).getTime()
  return Number.isFinite(t) ? t : 0
}

const relFromMs = (t: number) => {
  if (!t) return ''
  try {
    return toBnDigits(formatDistanceToNow(new Date(t), { locale: bnLocale, addSuffix: true }))
  } catch {
    return ''
  }
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    setMounted(true)
    validateData()
    loadData().catch(console.error)

    const onVisible = () => { if (!document.hidden) loadData(true).catch(console.error) }
    const onFocus = () => loadData(true).catch(console.error)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [user, loading, router])

  const loadData = async (background = false) => {
    try {
      if (!background) setDataLoading(true)
      const [d, l, r]: [Debt[], Loan[], Reminder[]] = await Promise.all([
        getDebts(), getLoans(), getReminders(),
      ])
      setDebts(d)
      setLoans(l)
      setReminders(r)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setDataLoading(false)
    }
  }

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
      setRefreshing(true)
      setPull(48)
      await loadData(true).catch(() => {})
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
    .map((d) => ({ id: d.id, name: d.personName || 'অজানা', amount: remainingOf(d) }))
    .filter((d) => d.amount > 0)
  const loanDetails = loans
    .filter((l) => !l.returned)
    .map((l) => ({ id: l.id, name: l.personName || 'অজানা', amount: remainingOf(l) }))
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
  const firstName = user.displayName || user.email?.split('@')[0] || 'ব্যবহারকারী'

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

  // Recent activity feed
  const activity: Activity[] = []
  debts.forEach((d) => {
    const name = d.personName || 'অজানা'
    activity.push({ id: `dc-${d.id}`, t: ts(d.createdAt || d.date), tone: 'pos', Icon: ArrowUpRightIcon, text: `${name}-কে ধার দিয়েছেন`, amount: d.amount || 0 })
    ;(d.payments || []).forEach((p) => activity.push({ id: `dp-${p.id}`, t: ts(p.createdAt || p.date), tone: 'pos', Icon: RotateIcon, text: `${name} ফেরত দিয়েছে`, amount: p.amount || 0 }))
    ;(d.increases || []).forEach((i) => activity.push({ id: `di-${i.id}`, t: ts(i.createdAt || i.date), tone: 'warn', Icon: PlusCircleIcon, text: `${name}-এর ধার বেড়েছে`, amount: i.amount || 0 }))
  })
  loans.forEach((l) => {
    const name = l.personName || 'অজানা'
    activity.push({ id: `lc-${l.id}`, t: ts(l.createdAt || l.date), tone: 'neg', Icon: ArrowDownLeftIcon, text: `${name} থেকে ধার নিয়েছেন`, amount: l.amount || 0 })
    ;(l.payments || []).forEach((p) => activity.push({ id: `lp-${p.id}`, t: ts(p.createdAt || p.date), tone: 'neg', Icon: RotateIcon, text: `${name}-কে ফেরত দিয়েছেন`, amount: p.amount || 0 }))
    ;(l.increases || []).forEach((i) => activity.push({ id: `li-${i.id}`, t: ts(i.createdAt || i.date), tone: 'warn', Icon: PlusCircleIcon, text: `${name}-এর ধার বেড়েছে`, amount: i.amount || 0 }))
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
                {toBnDigits(String(overdue.length))}টি রিমাইন্ডার মেয়াদোত্তীর্ণ
              </span>
              <span className="text-xs text-accent font-medium">দেখুন →</span>
            </Link>
          ) : todayRem.length > 0 ? (
            <Link href="/reminders" className="card card-interactive bar-pos flex items-center gap-3 py-3">
              <span className="tint-accent text-accent w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
                <ClockIcon className="w-5 h-5" />
              </span>
              <span className="text-sm text-content flex-1">
                আজ {toBnDigits(String(todayRem.length))}টি রিমাইন্ডার আছে
              </span>
              <span className="text-xs text-accent font-medium">দেখুন →</span>
            </Link>
          ) : null}

          {/* Net balance hero */}
          <div className="card">
            <p className="text-sm text-muted mb-1">নেট ব্যালেন্স</p>
            <p className={`text-4xl font-bold tracking-tight ${netBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
              ৳{bn(animNet)}
            </p>
            <p className="text-sm text-muted mt-1">
              {netBalance > 0
                ? `সব মিলিয়ে আপনি ৳${bn(Math.abs(netBalance))} এগিয়ে আছেন`
                : netBalance < 0
                  ? `সব মিলিয়ে আপনাকে ৳${bn(Math.abs(netBalance))} দিতে হবে`
                  : 'সব হিসাব মিলে গেছে'}
            </p>

            {total > 0 && (
              <div className="mt-4">
                <div className="flex h-2 rounded-full overflow-hidden bg-surface-2">
                  <div className="bg-positive" style={{ width: `${lentPct}%` }} />
                  <div className="bg-negative" style={{ width: `${borrowedPct}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-positive inline-block" /> পাবেন
                  </span>
                  <span className="flex items-center gap-1">
                    দিতে হবে <span className="w-2 h-2 rounded-full bg-negative inline-block" />
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
                <span className="text-xs font-medium text-positive">পাবেন</span>
              </div>
              <p className="text-2xl font-bold text-content">৳{bn(animLent)}</p>
              <p className="text-[11px] text-muted mt-0.5">{toBnDigits(String(debtDetails.length))} জন</p>
            </div>
            <div className="stat-tile tint-neg">
              <div className="flex items-center gap-2 text-negative mb-2">
                <ArrowDownLeftIcon className="w-5 h-5" />
                <span className="text-xs font-medium text-negative">দিতে হবে</span>
              </div>
              <p className="text-2xl font-bold text-content">৳{bn(animBorrowed)}</p>
              <p className="text-[11px] text-muted mt-0.5">{toBnDigits(String(loanDetails.length))} জন</p>
            </div>
          </div>

          {/* This month summary */}
          {(receivedThisMonth > 0 || paidThisMonth > 0) && (
            <div className="card">
              <p className="text-sm font-semibold text-content mb-3">এই মাসে</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted mb-1">ফেরত পেয়েছেন</p>
                  <p className="text-lg font-bold text-positive">৳{bn(receivedThisMonth)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">ফেরত দিয়েছেন</p>
                  <p className="text-lg font-bold text-negative">৳{bn(paidThisMonth)}</p>
                </div>
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
                <p className="text-base font-semibold text-content">এখনো কোনো হিসাব নেই</p>
                <p className="text-sm text-muted mt-1">ধার দেওয়া বা নেওয়া যোগ করে শুরু করুন</p>
              </div>
              <div className="flex gap-2 mt-1">
                <Link href="/debts" className="btn btn-primary">ধার দিয়েছি</Link>
                <Link href="/loans" className="btn btn-secondary">ধার নিয়েছি</Link>
              </div>
            </div>
          )}

          {/* Receivables list */}
          {topDebts.length > 0 && (
            <div className="card bar-pos">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-positive">যারা আপনাকে দেবে</p>
                {topDebts.length > LIST_CAP && (
                  <Link href="/debts" className="text-xs font-medium text-accent">সব দেখুন →</Link>
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
                <p className="text-sm font-semibold text-negative">যাদের আপনি দেবেন</p>
                {topLoans.length > LIST_CAP && (
                  <Link href="/loans" className="text-xs font-medium text-accent">সব দেখুন →</Link>
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
              <p className="text-sm font-semibold text-content mb-3">সাম্প্রতিক কার্যক্রম</p>
              <div className="divide-y divide-line">
                {recent.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className={`w-8 h-8 rounded-full ${toneTint[a.tone]} ${toneText[a.tone]} flex items-center justify-center flex-shrink-0`}>
                      <a.Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-content truncate">{a.text}</p>
                      {a.t > 0 && <p className="text-[11px] text-muted">{relFromMs(a.t)}</p>}
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
              <span className="text-xs font-medium text-content">রিমাইন্ডার</span>
              <span className="text-[11px] text-muted">{toBnDigits(String(reminderCount))} সক্রিয়</span>
            </Link>
            <Link href="/debts" className="card card-interactive bar-pos flex flex-col items-center gap-2 py-4 text-center">
              <span className="text-positive"><ArrowUpRightIcon className="w-6 h-6" /></span>
              <span className="text-xs font-medium text-content">দিয়েছি</span>
              <span className="text-[11px] text-muted">৳{bnInt(totalLent)}</span>
            </Link>
            <Link href="/loans" className="card card-interactive bar-neg flex flex-col items-center gap-2 py-4 text-center">
              <span className="text-negative"><ArrowDownLeftIcon className="w-6 h-6" /></span>
              <span className="text-xs font-medium text-content">নিয়েছি</span>
              <span className="text-[11px] text-muted">৳{bnInt(totalBorrowed)}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
