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
  }, [])

  const loadData = () => {
    const debts: Debt[] = getDebts()
    const loans: Loan[] = getLoans()
    const reminders: Reminder[] = getReminders()

    const lent = debts.reduce((sum, debt) => sum + (debt.returned ? 0 : debt.amount), 0)
    const borrowed = loans.reduce((sum, loan) => sum + (loan.returned ? 0 : loan.amount), 0)

    setTotalLent(lent)
    setTotalBorrowed(borrowed)
    setReminderCount(reminders.filter(r => !r.dismissed).length)
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-primary-50 to-blue-100 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-900 mb-2">
            LifeTrack
          </h1>
          <p className="text-gray-600">আপনার দৈনন্দিন জীবন পরিচালনা করুন</p>
        </div>


        <div className="grid gap-4 mb-6">
          <Link href="/reminders">
            <div className="card hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">রিমাইন্ডার</h2>
                  <p className="text-purple-100">সময়মতো নোটিফিকেশন পান</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">{reminderCount}</div>
                  <div className="text-sm text-purple-100">সক্রিয়</div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/debts">
            <div className="card hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">ধার দেওয়া</h2>
                  <p className="text-green-100">যে টাকা আপনি ধার দিয়েছেন</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">৳{totalLent}</div>
                  <div className="text-sm text-green-100">মোট</div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/loans">
            <div className="card hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">ধার নেওয়া</h2>
                  <p className="text-red-100">যে টাকা আপনি ধার নিয়েছেন</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">৳{totalBorrowed}</div>
                  <div className="text-sm text-red-100">মোট</div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="card bg-blue-50 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 টিপস</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• নোটিফিকেশন সক্রিয় করতে রিমাইন্ডার পেজে যান</li>
            <li>• নিয়মিত আপনার হিসাব আপডেট করুন</li>
            <li>• টাকা ফেরত পেলে বা দিলে চিহ্নিত করুন</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

