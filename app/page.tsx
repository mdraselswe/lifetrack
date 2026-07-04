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
import { ClockIcon, ArrowUpRightIcon, ArrowDownLeftIcon } from '@/components/Icons'

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

  return (
    <div className="min-h-full">
      <AppBar title="LifeTrack" subtitle={`স্বাগতম, ${firstName}`} />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5 fade-in">
        {/* Net balance hero */}
        <div className="card">
          <p className="text-sm text-muted mb-1">নেট ব্যালেন্স</p>
          <p className={`text-4xl font-bold tracking-tight ${netBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
            ৳{Math.abs(netBalance).toLocaleString('bn-BD')}
          </p>
          <p className="text-sm text-muted mt-1">
            {netBalance >= 0
              ? `সব মিলিয়ে আপনি ৳${Math.abs(netBalance).toLocaleString('bn-BD')} এগিয়ে আছেন`
              : `সব মিলিয়ে আপনাকে ৳${Math.abs(netBalance).toLocaleString('bn-BD')} দিতে হবে`}
          </p>
        </div>

        {/* Two-up summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-tile tint-pos">
            <div className="flex items-center gap-2 text-positive mb-2">
              <ArrowUpRightIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-positive">পাবেন</span>
            </div>
            <p className="text-2xl font-bold text-content">৳{round2(totalLent).toLocaleString('bn-BD')}</p>
          </div>
          <div className="stat-tile tint-neg">
            <div className="flex items-center gap-2 text-negative mb-2">
              <ArrowDownLeftIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-negative">দিতে হবে</span>
            </div>
            <p className="text-2xl font-bold text-content">৳{round2(totalBorrowed).toLocaleString('bn-BD')}</p>
          </div>
        </div>

        {/* Receivables list */}
        {debtDetails.length > 0 && (
          <div className="card bar-pos">
            <p className="text-sm font-semibold text-positive mb-3">যারা আপনাকে দেবে</p>
            <div className="space-y-2">
              {debtDetails.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-content">{d.name}</span>
                  <span className="text-sm font-semibold text-positive">৳{round2(d.amount).toLocaleString('bn-BD')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payables list */}
        {loanDetails.length > 0 && (
          <div className="card bar-neg">
            <p className="text-sm font-semibold text-negative mb-3">যাদের আপনি দেবেন</p>
            <div className="space-y-2">
              {loanDetails.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-content">{l.name}</span>
                  <span className="text-sm font-semibold text-negative">৳{round2(l.amount).toLocaleString('bn-BD')}</span>
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
            <span className="text-[11px] text-muted">{reminderCount} সক্রিয়</span>
          </Link>
          <Link href="/debts" className="card card-interactive bar-pos flex flex-col items-center gap-2 py-4 text-center">
            <span className="text-positive"><ArrowUpRightIcon className="w-6 h-6" /></span>
            <span className="text-xs font-medium text-content">দিয়েছি</span>
            <span className="text-[11px] text-muted">৳{round2(totalLent).toLocaleString('bn-BD')}</span>
          </Link>
          <Link href="/loans" className="card card-interactive bar-neg flex flex-col items-center gap-2 py-4 text-center">
            <span className="text-negative"><ArrowDownLeftIcon className="w-6 h-6" /></span>
            <span className="text-xs font-medium text-content">নিয়েছি</span>
            <span className="text-[11px] text-muted">৳{round2(totalBorrowed).toLocaleString('bn-BD')}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

