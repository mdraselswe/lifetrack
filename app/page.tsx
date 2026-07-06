'use client'

import { useEffect, useState, useRef, type ComponentType } from 'react'
import { subscribeToDebts, subscribeToLoans, subscribeToReminders, saveDebt, saveLoan, saveReminder, addDebtPayment, addLoanPayment, deleteRemindersForSource } from '@/lib/storage'
import type { Debt, Loan, Reminder, Payment } from '@/lib/types'
import Link from 'next/link'
import { useAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'
import { DashboardSkeleton } from '@/components/SkeletonLoader'
import AppBar from '@/components/AppBar'
import { round2, toMillis } from '@/lib/format'
import { t, useLang, fmtNum, fmtInt, fmtRelative, fmtDate } from '@/lib/i18n'
import Modal, { ActionButton } from '@/components/Modal'
import { MoneyIllustration } from '@/components/Illustrations'
import { avatarColor } from '@/lib/avatar'
import { LEAD_OPTIONS, dueReminderTime, type LeadKey } from '@/lib/reminder-lead'
import { celebrate } from '@/lib/celebrate'
import { haptic } from '@/lib/haptics'
import { toast } from '@/lib/toast'
import {
  ClockIcon, ArrowUpRightIcon, ArrowDownLeftIcon, WalletIcon,
  RotateIcon, PlusCircleIcon, ChartIcon, PlusIcon, CloseIcon, CheckIcon,
} from '@/components/Icons'

// datetime-local expects a LOCAL wall-clock string; toISOString() is UTC.
const localDatetimeValue = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

const bn = (n: number) => fmtNum(round2(n))
const bnInt = (n: number) => fmtNum(Math.round(n))

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return t('greeting.morning')
  if (h < 16) return t('greeting.noon')
  if (h < 19) return t('greeting.afternoon')
  return t('greeting.evening')
}

// Handles ISO strings AND Firestore Timestamp objects (doc createdAt is written
// with serverTimestamp(), so it is a Timestamp on read, not a string).
const ts = (v?: unknown) => toMillis(v)

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
  const c = avatarColor(name)
  return (
    <span
      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  )
}

// Tiny 6-month trend line for the stat tiles.
function Spark({ vals, color }: { vals: number[]; color: string }) {
  const max = Math.max(1, ...vals)
  const denom = Math.max(1, vals.length - 1)
  const pts = vals.map((v, i) => `${(i / denom) * 56},${17 - (v / max) * 14}`).join(' ')
  return (
    <svg width="56" height="20" className="opacity-60" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
  // Home tabs + quick-add (FAB) + quick-payment state
  const [homeTab, setHomeTab] = useState<'debts' | 'loans'>('debts')
  const [fabOpen, setFabOpen] = useState(false)
  const [addType, setAddType] = useState<'debt' | 'loan' | 'reminder' | null>(null)
  const [fName, setFName] = useState('')
  const [fAmount, setFAmount] = useState('')
  const [fReason, setFReason] = useState('')
  const [fDate, setFDate] = useState('')
  const [fDueDate, setFDueDate] = useState('')
  const [fReminderLead, setFReminderLead] = useState<LeadKey>('onTime')
  const [rTitle, setRTitle] = useState('')
  const [rDesc, setRDesc] = useState('')
  const [rTime, setRTime] = useState('')
  const [payFor, setPayFor] = useState<{ kind: 'debt' | 'loan'; id: string } | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState('')
  const [payNote, setPayNote] = useState('')
  const [selMonth, setSelMonth] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false) // guard against double-submit
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

  // ---- Quick add / quick payment (home) ----
  const numChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (/^\d*\.?\d*$/.test(v)) setter(v)
  }

  const openAdd = (type: 'debt' | 'loan' | 'reminder') => {
    setFabOpen(false)
    setFName(''); setFAmount(''); setFReason(''); setFDueDate(''); setFReminderLead('onTime')
    setFDate(localDatetimeValue())
    setRTitle(''); setRDesc(''); setRTime(localDatetimeValue())
    setAddType(type)
  }

  const handleQuickAdd = () => {
    if (savingRef.current) return
    if (addType === 'reminder') {
      if (!rTitle || !rTime) { toast.error(t('reminders.titleTimeRequired')); return }
      savingRef.current = true; setSaving(true)
      const reminder: Reminder = {
        id: crypto.randomUUID(),
        title: rTitle,
        description: rDesc,
        scheduledTime: rTime,
        dismissed: false,
        createdAt: new Date().toISOString(),
        completionCount: 0,
        occurrences: [],
      }
      saveReminder(reminder).then(() => {
        setAddType(null)
        toast.success(t('reminders.created'))
      }).catch((e) => { console.error(e); toast.error(t('reminders.saveError')) })
        .finally(() => { savingRef.current = false; setSaving(false) })
      return
    }
    const isDebt = addType === 'debt'
    const k = isDebt ? 'debts' : 'loans'
    if (!fName || !fAmount) { toast.error(t(`${k}.errNameAmount`)); return }
    const parsedAmount = parseFloat(fAmount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { toast.error(t(`${k}.errValidAmount`)); return }
    savingRef.current = true; setSaving(true)
    const item = {
      id: '',
      personName: fName,
      amount: parsedAmount,
      reason: fReason,
      date: fDate,
      ...(fDueDate && { dueDate: fDueDate }),
      returned: false,
      createdAt: new Date().toISOString(),
      payments: [],
      increases: [],
    }
    const save = isDebt ? saveDebt(item as Debt) : saveLoan(item as Loan)
    save.then((newId) => {
      if (fDueDate) {
        // Same pattern as the debts/loans pages: a due date spawns a reminder,
        // linked to the new record so deleting it removes the reminder too.
        saveReminder({
          id: crypto.randomUUID(),
          title: t(`${k}.dueReminderTitle`, { name: fName }),
          description: t(`${k}.dueReminderDesc`, { name: fName, amount: bn(parsedAmount), date: fmtDate(fDueDate) }),
          scheduledTime: dueReminderTime(fDueDate, fReminderLead),
          dismissed: false,
          createdAt: new Date().toISOString(),
          sourceId: newId,
          sourceType: isDebt ? 'debt' : 'loan',
        }).then(() => toast.info(t(`${k}.dueReminderCreated`))).catch(console.error)
      }
      setAddType(null)
      toast.success(t(`${k}.addSuccess`))
    }).catch((e) => { console.error(e); toast.error(t(`${k}.addError`)) })
      .finally(() => { savingRef.current = false; setSaving(false) })
  }

  const openPay = (kind: 'debt' | 'loan', id: string, remaining: number) => {
    setPayFor({ kind, id })
    setPayAmount(String(remaining))
    setPayDate(localDatetimeValue())
    setPayNote('')
  }

  const handleQuickPay = () => {
    if (!payFor || savingRef.current) return
    const k = payFor.kind === 'debt' ? 'debts' : 'loans'
    const source = payFor.kind === 'debt' ? debts : loans
    const item = source.find((x) => x.id === payFor.id)
    if (!item) return
    const amount = Number(parseFloat(payAmount).toFixed(2))
    if (!Number.isFinite(amount) || amount <= 0) { toast.error(t(`${k}.errValidAmount`)); return }
    const remaining = remainingOf(item)
    if (amount > remaining) { toast.error(t(`${k}.errOverpay`, { remaining: bn(remaining) })); return }
    const payment: Payment = {
      id: crypto.randomUUID(),
      amount,
      date: payDate,
      note: payNote || undefined,
      createdAt: new Date().toISOString(),
    }
    const fullPayoff = amount >= remaining
    savingRef.current = true; setSaving(true)
    const add = payFor.kind === 'debt' ? addDebtPayment(payFor.id, payment) : addLoanPayment(payFor.id, payment)
    add.then(() => {
      setPayFor(null)
      toast.success(t(`${k}.paymentAddSuccess`))
      haptic(fullPayoff ? [20, 40, 20] : 12)
      if (fullPayoff) { celebrate(); deleteRemindersForSource(payFor.id) }
    }).catch((e) => { console.error(e); toast.error(t(`${k}.paymentAddError`)) })
      .finally(() => { savingRef.current = false; setSaving(false) })
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
    ;(d.payments || []).forEach((p, i) => activity.push({ id: `dp-${d.id}-${p.id || i}`, t: ts(p.createdAt || p.date), tone: 'pos', Icon: RotateIcon, text: t('dashboard.returnedYou', { name }), amount: p.amount || 0 }))
    ;(d.increases || []).forEach((inc, i) => activity.push({ id: `di-${d.id}-${inc.id || i}`, t: ts(inc.createdAt || inc.date), tone: 'warn', Icon: PlusCircleIcon, text: t('dashboard.increased', { name }), amount: inc.amount || 0 }))
  })
  loans.forEach((l) => {
    const name = l.personName || t('common.unknown')
    activity.push({ id: `lc-${l.id}`, t: ts(l.createdAt || l.date), tone: 'neg', Icon: ArrowDownLeftIcon, text: t('dashboard.borrowedFrom', { name }), amount: l.amount || 0 })
    ;(l.payments || []).forEach((p, i) => activity.push({ id: `lp-${l.id}-${p.id || i}`, t: ts(p.createdAt || p.date), tone: 'neg', Icon: RotateIcon, text: t('dashboard.youReturned', { name }), amount: p.amount || 0 }))
    ;(l.increases || []).forEach((inc, i) => activity.push({ id: `li-${l.id}-${inc.id || i}`, t: ts(inc.createdAt || inc.date), tone: 'warn', Icon: PlusCircleIcon, text: t('dashboard.increased', { name }), amount: inc.amount || 0 }))
  })
  const recent = activity.sort((a, b) => b.t - a.t).slice(0, 8)
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const todayStart = dayStart(new Date())
  const groupOf = (tms: number) => {
    if (tms >= todayStart) return 'dashboard.today'
    if (tms >= todayStart - 86400000) return 'dashboard.yesterday'
    if (tms >= todayStart - 6 * 86400000) return 'dashboard.thisWeek'
    return 'dashboard.earlier'
  }
  const activityGroups = ['dashboard.today', 'dashboard.yesterday', 'dashboard.thisWeek', 'dashboard.earlier']
    .map((g) => ({ g, items: recent.filter((a) => groupOf(a.t) === g) }))
    .filter((x) => x.items.length > 0)

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
          <div className="card relative overflow-hidden">
            <span
              aria-hidden="true"
              className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)' }}
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-14 -left-8 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--positive) 14%, transparent), transparent 70%)' }}
            />
            <p className="text-sm text-muted mb-1 relative">{t('dashboard.netBalance')}</p>
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
            <div className="stat-tile tint-pos relative">
              <span className="absolute right-3 top-3"><Spark vals={monthBuckets.map((b) => b.received)} color="var(--positive)" /></span>
              <div className="flex items-center gap-2 text-positive mb-2">
                <ArrowUpRightIcon className="w-5 h-5" />
                <span className="text-xs font-medium text-positive">{t('dashboard.willReceive')}</span>
              </div>
              <p className="text-2xl font-bold text-content">৳{bn(animLent)}</p>
              <p className="text-[11px] text-muted mt-0.5">{t('common.people', { count: fmtInt(debtDetails.length) })}</p>
            </div>
            <div className="stat-tile tint-neg relative">
              <span className="absolute right-3 top-3"><Spark vals={monthBuckets.map((b) => b.paid)} color="var(--negative)" /></span>
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
                  <button
                    key={`${b.year}-${b.month}`}
                    type="button"
                    onClick={() => setSelMonth(selMonth === b.month ? null : b.month)}
                    className={`flex-1 flex items-end justify-center gap-1 h-full rounded-t-md transition-colors ${selMonth === b.month ? 'bg-surface-2' : ''}`}
                    title={`${t(`dashboard.mon.${b.month}`)} — ${t('dashboard.received')}: ৳${bn(b.received)}, ${t('dashboard.paid')}: ৳${bn(b.paid)}`}
                  >
                    <div
                      className="w-1/2 max-w-[12px] bg-positive rounded-t-sm chart-bar"
                      style={{ height: `${(b.received / trendMax) * 100}%` }}
                    />
                    <div
                      className="w-1/2 max-w-[12px] bg-negative rounded-t-sm chart-bar"
                      style={{ height: `${(b.paid / trendMax) * 100}%` }}
                    />
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                {monthBuckets.map((b) => (
                  <span key={`${b.year}-${b.month}`} className={`flex-1 text-center text-[10px] ${selMonth === b.month ? 'text-accent font-semibold' : 'text-muted'}`}>
                    {t(`dashboard.mon.${b.month}`)}
                  </span>
                ))}
              </div>
              {selMonth !== null && (() => {
                const b = monthBuckets.find((x) => x.month === selMonth)
                if (!b) return null
                return (
                  <p className="text-xs text-center text-muted mt-2 fade-in">
                    {t(`dashboard.mon.${b.month}`)} · <span className="text-positive font-semibold">{t('dashboard.received')} ৳{bn(b.received)}</span> · <span className="text-negative font-semibold">{t('dashboard.paid')} ৳{bn(b.paid)}</span>
                  </p>
                )
              })()}
            </div>
          )}

          {/* Empty state */}
          {isEmpty && (
            <div className="card flex flex-col items-center text-center py-8 gap-3">
              <MoneyIllustration className="w-52 h-36" />
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

          {/* দিয়েছি / নিয়েছি tabs — view balances and take returns right here */}
          {!isEmpty && (
            <div className={`card ${homeTab === 'debts' ? 'bar-pos' : 'bar-neg'}`}>
              <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1 mb-3">
                <button
                  className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${homeTab === 'debts' ? 'bg-surface text-content font-medium shadow-sm' : 'text-muted'}`}
                  onClick={() => setHomeTab('debts')}
                >
                  {t('nav.given')} · {fmtInt(topDebts.length)}
                </button>
                <button
                  className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${homeTab === 'loans' ? 'bg-surface text-content font-medium shadow-sm' : 'text-muted'}`}
                  onClick={() => setHomeTab('loans')}
                >
                  {t('nav.taken')} · {fmtInt(topLoans.length)}
                </button>
              </div>

              {(homeTab === 'debts' ? topDebts : topLoans).length === 0 ? (
                <p key={homeTab} className="text-center text-sm text-muted py-6 fade-in">{t('dashboard.noRecords')}</p>
              ) : (
                <div key={homeTab} className="divide-y divide-line fade-in">
                  {(homeTab === 'debts' ? topDebts : topLoans).map((x) => (
                    <div key={x.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <Avatar name={x.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-content truncate">{x.name}</p>
                        <p className={`text-sm font-semibold ${homeTab === 'debts' ? 'text-positive' : 'text-negative'}`}>৳{bn(x.amount)}</p>
                      </div>
                      <button
                        className="btn btn-secondary px-3 py-1.5 text-xs flex-shrink-0"
                        onClick={() => openPay(homeTab === 'debts' ? 'debt' : 'loan', x.id, x.amount)}
                      >
                        <CheckIcon className="w-3.5 h-3.5" /> {homeTab === 'debts' ? t('debts.receivedBack') : t('loans.paidBackBtn')}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 mt-1 border-t border-line text-center">
                <Link href={homeTab === 'debts' ? '/debts' : '/loans'} className="text-xs font-medium text-accent">
                  {t('common.viewAll')}
                </Link>
              </div>
            </div>
          )}

          {/* Recent activity feed */}
          {recent.length > 0 && (
            <div className="card">
              <p className="text-sm font-semibold text-content mb-3">{t('dashboard.recentActivity')}</p>
              <div className="space-y-1">
                {activityGroups.map(({ g, items }) => (
                  <div key={g}>
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wide pt-2 pb-1">{t(g)}</p>
                    <div className="divide-y divide-line">
                      {items.map((a) => (
                        <div key={a.id} className="flex items-center gap-3 py-2.5">
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

      {/* FAB speed-dial — add debt / loan / reminder without leaving home */}
      {fabOpen && <div className="fixed inset-0 z-40" onClick={() => setFabOpen(false)} />}
      <div className="fixed z-50 flex flex-col items-end gap-2" style={{ right: '1.25rem', bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {fabOpen && (
          <>
            <button className="btn btn-secondary shadow-pop dial-item" onClick={() => openAdd('reminder')}>
              <ClockIcon className="w-4 h-4 text-accent" /> {t('nav.reminders')}
            </button>
            <button className="btn btn-secondary shadow-pop dial-item" onClick={() => openAdd('loan')}>
              <ArrowDownLeftIcon className="w-4 h-4 text-negative" /> {t('dashboard.borrowedBtn')}
            </button>
            <button className="btn btn-secondary shadow-pop dial-item" onClick={() => openAdd('debt')}>
              <ArrowUpRightIcon className="w-4 h-4 text-positive" /> {t('dashboard.lentBtn')}
            </button>
          </>
        )}
        <button
          className="w-14 h-14 rounded-full bg-accent text-accent-fg flex items-center justify-center shadow-pop transition-transform active:scale-95"
          onClick={() => setFabOpen((v) => !v)}
          aria-label={t('common.add')}
          aria-expanded={fabOpen}
        >
          {fabOpen ? <CloseIcon className="w-6 h-6" /> : <PlusIcon className="w-6 h-6" />}
        </button>
      </div>

      {/* Quick add: debt / loan */}
      <Modal
        isOpen={addType === 'debt' || addType === 'loan'}
        onClose={() => setAddType(null)}
        title={addType === 'loan' ? t('loans.addNew') : t('debts.addNew')}
        footerActions={<>
          <ActionButton onClick={() => setAddType(null)} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={handleQuickAdd} variant="primary" loading={saving}>{t('common.save')}</ActionButton>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="label label-required">{addType === 'loan' ? t('loans.personName') : t('debts.personName')}</label>
            <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} className="input" placeholder={addType === 'loan' ? t('loans.personPlaceholder') : t('debts.personNamePlaceholder')} />
          </div>
          <div>
            <label className="label label-required">{addType === 'loan' ? t('loans.amountLabel') : t('debts.amountLabel')}</label>
            <input type="text" inputMode="decimal" value={fAmount} onChange={numChange(setFAmount)} className="input" placeholder={t('debts.zeroPlaceholder')} />
          </div>
          <div>
            <label className="label">{addType === 'loan' ? t('loans.initialReasonOptional') : t('debts.initialReasonOptional')}</label>
            <textarea value={fReason} onChange={(e) => setFReason(e.target.value)} className="input min-h-[80px] resize-none" rows={3} placeholder={addType === 'loan' ? t('loans.reasonPlaceholder') : t('debts.reasonPlaceholder')} />
          </div>
          <div>
            <label className="label label-required">{t('common.date')}</label>
            <input type="datetime-local" value={fDate} onChange={(e) => setFDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">{addType === 'loan' ? t('loans.dueDateOptional') : t('debts.dueDateOptional')}</label>
            <input type="datetime-local" value={fDueDate} onChange={(e) => setFDueDate(e.target.value)} className="input" />
          </div>
          {fDueDate && (
          <div>
            <label className="label">{t('lead.label')}</label>
            <select value={fReminderLead} onChange={(e) => setFReminderLead(e.target.value as LeadKey)} className="input">
              {LEAD_OPTIONS.map((o) => <option key={o} value={o}>{t(`lead.${o}`)}</option>)}
            </select>
          </div>
          )}
        </div>
      </Modal>

      {/* Quick add: reminder */}
      <Modal
        isOpen={addType === 'reminder'}
        onClose={() => setAddType(null)}
        title={t('reminders.addNew')}
        footerActions={<>
          <ActionButton onClick={() => setAddType(null)} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={handleQuickAdd} variant="primary" loading={saving}>{t('common.save')}</ActionButton>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="label label-required">{t('reminders.fieldTitle')}</label>
            <input type="text" value={rTitle} onChange={(e) => setRTitle(e.target.value)} className="input" placeholder={t('reminders.titlePlaceholder')} />
          </div>
          <div>
            <label className="label">{t('reminders.fieldDescription')}</label>
            <textarea value={rDesc} onChange={(e) => setRDesc(e.target.value)} className="input min-h-[80px] resize-none" rows={3} placeholder={t('reminders.descriptionPlaceholder')} />
          </div>
          <div>
            <label className="label label-required">{t('reminders.fieldTime')}</label>
            <input type="datetime-local" value={rTime} onChange={(e) => setRTime(e.target.value)} className="input" />
          </div>
        </div>
      </Modal>

      {/* Quick payment (ফেরত) from the home tabs */}
      {payFor && (() => {
        const src = payFor.kind === 'debt' ? debts : loans
        const item = src.find((x) => x.id === payFor.id)
        const rem = item ? remainingOf(item) : 0
        const k = payFor.kind === 'debt' ? 'debts' : 'loans'
        return (
          <Modal
            isOpen={!!payFor}
            onClose={() => setPayFor(null)}
            title={payFor.kind === 'debt' ? t('debts.receivedBack') : t('loans.paidBackBtn')}
            footerActions={<>
              <ActionButton onClick={() => setPayFor(null)} variant="secondary">{t('common.cancel')}</ActionButton>
              <ActionButton onClick={handleQuickPay} variant="primary" loading={saving}>{t('common.save')}</ActionButton>
            </>}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
                <span className="text-sm text-muted">{t(`${k}.remaining`)}</span>
                <span className={`text-base font-semibold ${payFor.kind === 'debt' ? 'text-positive' : 'text-negative'}`}>৳{bn(rem)}</span>
              </div>
              <div>
                <label className="label label-required">{payFor.kind === 'debt' ? t('debts.howMuchReceived') : t('loans.howMuchReturned')}</label>
                <input type="text" inputMode="decimal" value={payAmount} onChange={numChange(setPayAmount)} className="input" placeholder={t('debts.zeroPlaceholder')} />
                <button type="button" className="chip chip-accent mt-2" onClick={() => setPayAmount(String(rem))}>
                  {t(`${k}.fullReturnChip`, { amount: bn(rem) })}
                </button>
              </div>
              <div>
                <label className="label label-required">{t('common.date')}</label>
                <input type="datetime-local" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">{t(`${k}.noteOptional`)}</label>
                <input type="text" value={payNote} onChange={(e) => setPayNote(e.target.value)} className="input" />
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
