'use client'

import { useEffect, useState } from 'react'
import { getDebts, getLoans, getReminders } from '@/lib/storage'
import type { Debt, Loan, Reminder } from '@/lib/types'
import Link from 'next/link'

export default function Dashboard() {
  const [totalLent, setTotalLent] = useState(0)
  const [totalBorrowed, setTotalBorrowed] = useState(0)
  const [reminderCount, setReminderCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadData()

    // Reload data when page becomes visible (after returning from other pages)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData()
      }
    }

    const handleFocus = () => {
      loadData()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const loadData = () => {
    const debts: Debt[] = getDebts()
    const loans: Loan[] = getLoans()
    const reminders: Reminder[] = getReminders()

    // Calculate remaining amounts after payments
    const lent = debts.reduce((sum, debt) => {
      if (debt.returned) return sum
      
      const totalPaid = debt.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0
      const remaining = debt.amount - totalPaid
      return sum + Math.max(0, remaining)
    }, 0)

    const borrowed = loans.reduce((sum, loan) => {
      if (loan.returned) return sum
      
      const totalPaid = loan.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0
      const remaining = loan.amount - totalPaid
      return sum + Math.max(0, remaining)
    }, 0)

    setTotalLent(lent)
    setTotalBorrowed(borrowed)
    setReminderCount(reminders.filter(r => !r.dismissed).length)
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-full bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 float-gentle">
            LifeTrack
          </h1>
          <p className="text-gray-600 slide-up">আপনার দৈনন্দিন জীবন পরিচালনা করুন</p>
        </div>


        <div className="grid gap-4 mb-6">
          <Link href="/reminders">
            <div className="card hover:shadow-xl transition-shadow duration-300 cursor-pointer bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg stagger-item">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">⏰ রিমাইন্ডার</h2>
                  <p className="text-purple-100 opacity-90">সময়মতো নোটিফিকেশন পান</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">{reminderCount}</div>
                  <div className="text-sm text-purple-100 opacity-80">সক্রিয়</div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/debts">
            <div className="card hover:shadow-xl transition-shadow duration-300 cursor-pointer bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg stagger-item">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">💰 ধার দিয়েছি</h2>
                  <p className="text-green-100 opacity-90">বাকি আছে যে টাকা</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">৳{totalLent}</div>
                  <div className="text-sm text-green-100 opacity-80">বাকি</div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/loans">
            <div className="card hover:shadow-xl transition-shadow duration-300 cursor-pointer bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg stagger-item">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">💸 ধার নিয়েছি</h2>
                  <p className="text-red-100 opacity-90">ফেরত দিতে হবে যে টাকা</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">৳{totalBorrowed}</div>
                  <div className="text-sm text-red-100 opacity-80">বাকি</div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out slide-up">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <span className="text-xl">💡</span>
            টিপস
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-center gap-2 transition-all duration-300 ease-in-out hover:text-blue-900 hover:translate-x-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-600 hover:scale-110"></span>
              নোটিফিকেশন সক্রিয় করতে রিমাইন্ডার পেজে যান
            </li>
            <li className="flex items-center gap-2 transition-all duration-300 ease-in-out hover:text-blue-900 hover:translate-x-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-600 hover:scale-110"></span>
              নিয়মিত আপনার হিসাব আপডেট করুন
            </li>
            <li className="flex items-center gap-2 transition-all duration-300 ease-in-out hover:text-blue-900 hover:translate-x-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full transition-all duration-300 ease-in-out hover:bg-blue-600 hover:scale-110"></span>
              টাকা ফেরত পেলে বা দিলে চিহ্নিত করুন
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

