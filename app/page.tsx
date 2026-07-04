'use client'

import { useEffect, useState } from 'react'
import { getDebts, getLoans, getReminders, validateData } from '@/lib/storage'
import type { Debt, Loan, Reminder } from '@/lib/types'
import Link from 'next/link'
import { useAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'
import { DashboardSkeleton } from '@/components/SkeletonLoader'
import AppBar from '@/components/AppBar'
import { round2 } from '@/lib/format'
import { ClockIcon, ArrowUpRightIcon, ArrowDownLeftIcon, WalletIcon } from '@/components/Icons'

const bn = (n: number) => round2(n).toLocaleString('bn-BD')

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'শুভ সকাল'
  if (h < 16) return 'শুভ দুপুর'
  if (h < 19) return 'শুভ বিকাল'
  return 'শুভ সন্ধ্যা'
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-2 text-content flex items-center justify-center text-xs font-semibold">
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  )
}

export default function Dashboard() {
  const [totalLent, setTotalLent] = useState(0)
  const [totalBorrowed, setTotalBorrowed] = useState(0)
  const [reminderCount, setReminderCount] = useState(0)
  const [debtDetails, setDebtDetails] = useState<Array<{id: string, name: string, amount: number}>>([])
  const [loanDetails, setLoanDetails] = useState<Array<{id: string, name: string, amount: number}>>([])
  const [mounted, setMounted] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    setMounted(true)
    
    // Validate and clean data on first load
    validateData()
    loadData().catch(console.error)

    // Reload data when page becomes visible (after returning from other pages).
    // Refresh in the background so stale data stays visible (no skeleton flash).
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData(true).catch(console.error)
      }
    }

    const handleFocus = () => {
      loadData(true).catch(console.error)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, loading, router])

  const loadData = async (background = false) => {
    try {
      // Only show the skeleton on first load; background refreshes keep stale data.
      if (!background) setDataLoading(true)
      const [debts, loans, reminders]: [Debt[], Loan[], Reminder[]] = await Promise.all([
        getDebts(),
        getLoans(),
        getReminders(),
      ])

      // Calculate total amounts and collect details (only for non-returned items)
      const debtDetailsList: Array<{id: string, name: string, amount: number}> = []
      const lent = debts.reduce((sum, debt) => {
        // Skip if already marked as returned
        if (debt.returned) return sum
        
        // Calculate total amount including increments
        const totalAmount = (typeof debt.amount === 'number' ? debt.amount : 0) + 
          (debt.increases?.reduce((increaseSum, increase) => {
            return increaseSum + (typeof increase.amount === 'number' ? increase.amount : 0)
          }, 0) || 0)
        
        // Calculate total payments made
        const totalPaid = debt.payments?.reduce((paymentSum, payment) => {
          return paymentSum + (typeof payment.amount === 'number' ? payment.amount : 0)
        }, 0) || 0
        
        // Calculate remaining amount
        const remaining = totalAmount - totalPaid
        const remainingAmount = Math.max(0, remaining)
        
        if (remainingAmount > 0) {
          debtDetailsList.push({
            id: debt.id,
            name: debt.personName || 'অজানা',
            amount: remainingAmount
          })
        }
        
        return sum + remainingAmount
      }, 0)

      const loanDetailsList: Array<{id: string, name: string, amount: number}> = []
      const borrowed = loans.reduce((sum, loan) => {
        // Skip if already marked as returned
        if (loan.returned) return sum
        
        // Calculate total amount including increments
        const totalAmount = (typeof loan.amount === 'number' ? loan.amount : 0) + 
          (loan.increases?.reduce((increaseSum, increase) => {
            return increaseSum + (typeof increase.amount === 'number' ? increase.amount : 0)
          }, 0) || 0)
        
        // Calculate total payments made
        const totalPaid = loan.payments?.reduce((paymentSum, payment) => {
          return paymentSum + (typeof payment.amount === 'number' ? payment.amount : 0)
        }, 0) || 0
        
        // Calculate remaining amount
        const remaining = totalAmount - totalPaid
        const remainingAmount = Math.max(0, remaining)
        
        if (remainingAmount > 0) {
          loanDetailsList.push({
            id: loan.id,
            name: loan.personName || 'অজানা',
            amount: remainingAmount
          })
        }
        
        return sum + remainingAmount
      }, 0)

      // Count active reminders (not dismissed)
      const activeReminders = reminders.filter(r => !r.dismissed)

      setTotalLent(lent)
      setTotalBorrowed(borrowed)
      setReminderCount(activeReminders.length)
      setDebtDetails(debtDetailsList)
      setLoanDetails(loanDetailsList)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  if (loading || !mounted || dataLoading) {
    return <DashboardSkeleton />
  }

  if (!user) {
    return null
  }

  const netBalance = round2(totalLent - totalBorrowed)
  const firstName = user.displayName || user.email?.split('@')[0] || 'ব্যবহারকারী'

  const total = totalLent + totalBorrowed
  const lentPct = total > 0 ? (totalLent / total) * 100 : 0
  const borrowedPct = total > 0 ? (totalBorrowed / total) * 100 : 0

  const topDebts = [...debtDetails].sort((a, b) => b.amount - a.amount)
  const topLoans = [...loanDetails].sort((a, b) => b.amount - a.amount)
  const LIST_CAP = 4

  const isEmpty = debtDetails.length === 0 && loanDetails.length === 0

  return (
    <div className="min-h-full">
      <AppBar title="LifeTrack" subtitle={`${greeting()}, ${firstName}`} />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5 fade-in">
        {/* Net balance hero */}
        <div className="card">
          <p className="text-sm text-muted mb-1">নেট ব্যালেন্স</p>
          <p className={`text-4xl font-bold tracking-tight ${netBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
            ৳{bn(Math.abs(netBalance))}
          </p>
          <p className="text-sm text-muted mt-1">
            {netBalance > 0
              ? `সব মিলিয়ে আপনি ৳${bn(Math.abs(netBalance))} এগিয়ে আছেন`
              : netBalance < 0
                ? `সব মিলিয়ে আপনাকে ৳${bn(Math.abs(netBalance))} দিতে হবে`
                : 'সব হিসাব মিলে গেছে'}
          </p>

          {/* Proportion bar — receivable vs payable at a glance */}
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
            <p className="text-2xl font-bold text-content">৳{bn(totalLent)}</p>
            <p className="text-[11px] text-muted mt-0.5">{debtDetails.length.toLocaleString('bn-BD')} জন</p>
          </div>
          <div className="stat-tile tint-neg">
            <div className="flex items-center gap-2 text-negative mb-2">
              <ArrowDownLeftIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-negative">দিতে হবে</span>
            </div>
            <p className="text-2xl font-bold text-content">৳{bn(totalBorrowed)}</p>
            <p className="text-[11px] text-muted mt-0.5">{loanDetails.length.toLocaleString('bn-BD')} জন</p>
          </div>
        </div>

        {/* Empty state — fresh user guidance */}
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

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/reminders" className="card card-interactive flex flex-col items-center gap-2 py-4 text-center">
            <span className="text-accent"><ClockIcon className="w-6 h-6" /></span>
            <span className="text-xs font-medium text-content">রিমাইন্ডার</span>
            <span className="text-[11px] text-muted">{reminderCount.toLocaleString('bn-BD')} সক্রিয়</span>
          </Link>
          <Link href="/debts" className="card card-interactive bar-pos flex flex-col items-center gap-2 py-4 text-center">
            <span className="text-positive"><ArrowUpRightIcon className="w-6 h-6" /></span>
            <span className="text-xs font-medium text-content">দিয়েছি</span>
            <span className="text-[11px] text-muted">৳{bn(totalLent)}</span>
          </Link>
          <Link href="/loans" className="card card-interactive bar-neg flex flex-col items-center gap-2 py-4 text-center">
            <span className="text-negative"><ArrowDownLeftIcon className="w-6 h-6" /></span>
            <span className="text-xs font-medium text-content">নিয়েছি</span>
            <span className="text-[11px] text-muted">৳{bn(totalBorrowed)}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

