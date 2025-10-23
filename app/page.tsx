'use client'

import { useEffect, useState } from 'react'
import { getDebts, getLoans, getReminders, validateData } from '@/lib/storage'
import type { Debt, Loan, Reminder } from '@/lib/types'
import Link from 'next/link'

export default function Dashboard() {
  const [totalLent, setTotalLent] = useState(0)
  const [totalBorrowed, setTotalBorrowed] = useState(0)
  const [reminderCount, setReminderCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Validate and clean data on first load
    validateData()
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

    // Calculate remaining amounts after payments (only for non-returned items)
    const lent = debts.reduce((sum, debt) => {
      // Skip if already marked as returned
      if (debt.returned) return sum
      
      // Calculate total payments made
      const totalPaid = debt.payments?.reduce((paymentSum, payment) => {
        return paymentSum + (typeof payment.amount === 'number' ? payment.amount : 0)
      }, 0) || 0
      
      // Calculate remaining amount
      const remaining = (typeof debt.amount === 'number' ? debt.amount : 0) - totalPaid
      return sum + Math.max(0, remaining)
    }, 0)

    const borrowed = loans.reduce((sum, loan) => {
      // Skip if already marked as returned
      if (loan.returned) return sum
      
      // Calculate total payments made
      const totalPaid = loan.payments?.reduce((paymentSum, payment) => {
        return paymentSum + (typeof payment.amount === 'number' ? payment.amount : 0)
      }, 0) || 0
      
      // Calculate remaining amount
      const remaining = (typeof loan.amount === 'number' ? loan.amount : 0) - totalPaid
      return sum + Math.max(0, remaining)
    }, 0)

    // Count active reminders (not dismissed)
    const activeReminders = reminders.filter(r => !r.dismissed)

    setTotalLent(lent)
    setTotalBorrowed(borrowed)
    setReminderCount(activeReminders.length)
  }

  if (!mounted) {
    return null
  }

  const netBalance = totalLent - totalBorrowed

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12 fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl mb-4 sm:mb-6 float-gentle">
            <span className="text-2xl sm:text-3xl">📱</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-3 sm:mb-4 float-gentle">
            LifeTrack
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 slide-up max-w-md mx-auto leading-relaxed px-4">
            আপনার দৈনন্দিন জীবন পরিচালনা করুন
          </p>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 stagger-item">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">নেট ব্যালেন্স</p>
                <p className={`text-xl sm:text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ৳{Math.abs(netBalance)}
                </p>
                <p className="text-xs text-gray-500">
                  {netBalance >= 0 ? 'আপনি এগিয়ে' : 'আপনি পিছিয়ে'}
                </p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${netBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <span className="text-lg sm:text-2xl">{netBalance >= 0 ? '📈' : '📉'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 stagger-item">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">মোট ধার</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">৳{totalLent}</p>
                <p className="text-xs text-gray-500">পাওনা আছে</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg sm:text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 stagger-item sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">মোট ঋণ</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">৳{totalBorrowed}</p>
                <p className="text-xs text-gray-500">দিতে হবে</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg sm:text-2xl">💸</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Action Cards */}
        <div className="grid gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Link href="/reminders">
            <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 cursor-pointer stagger-item transform hover:scale-[1.02] hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4 sm:space-x-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <span className="text-2xl sm:text-3xl">⏰</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">রিমাইন্ডার</h2>
                    <p className="text-purple-100 text-sm sm:text-lg">সময়মতো নোটিফিকেশন পান</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-3xl sm:text-5xl font-bold text-white mb-1">{reminderCount}</div>
                  <div className="text-xs sm:text-sm text-purple-100 opacity-90">সক্রিয় রিমাইন্ডার</div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-20 h-20 sm:w-24 sm:h-24 bg-white/10 rounded-full blur-xl"></div>
            </div>
          </Link>

          <Link href="/debts">
            <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-green-500/25 transition-all duration-500 cursor-pointer stagger-item transform hover:scale-[1.02] hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4 sm:space-x-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <span className="text-2xl sm:text-3xl">💰</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">ধার দিয়েছি</h2>
                    <p className="text-green-100 text-sm sm:text-lg">বাকি আছে যে টাকা</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-3xl sm:text-5xl font-bold text-white mb-1">৳{totalLent}</div>
                  <div className="text-xs sm:text-sm text-green-100 opacity-90">বাকি পাওনা</div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-20 h-20 sm:w-24 sm:h-24 bg-white/10 rounded-full blur-xl"></div>
            </div>
          </Link>

          <Link href="/loans">
            <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-red-500/25 transition-all duration-500 cursor-pointer stagger-item transform hover:scale-[1.02] hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4 sm:space-x-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <span className="text-2xl sm:text-3xl">💸</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">ধার নিয়েছি</h2>
                    <p className="text-red-100 text-sm sm:text-lg">ফেরত দিতে হবে যে টাকা</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-3xl sm:text-5xl font-bold text-white mb-1">৳{totalBorrowed}</div>
                  <div className="text-xs sm:text-sm text-red-100 opacity-90">বাকি ঋণ</div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-20 h-20 sm:w-24 sm:h-24 bg-white/10 rounded-full blur-xl"></div>
            </div>
          </Link>
        </div>

        {/* Tips Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 slide-up">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl">💡</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">সহায়ক টিপস</h3>
          </div>
          <div className="grid gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <span className="text-white text-xs sm:text-sm font-bold">1</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium text-sm sm:text-base">নোটিফিকেশন সক্রিয় করুন</p>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">রিমাইন্ডার পেজে গিয়ে সময়মতো নোটিফিকেশন পেতে সেটিংস চেক করুন</p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-300 group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <span className="text-white text-xs sm:text-sm font-bold">2</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium text-sm sm:text-base">নিয়মিত আপডেট করুন</p>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">আপনার হিসাব নিয়মিত আপডেট রাখুন যাতে সব তথ্য সঠিক থাকে</p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all duration-300 group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <span className="text-white text-xs sm:text-sm font-bold">3</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium text-sm sm:text-base">পেমেন্ট ট্র্যাক করুন</p>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">টাকা ফেরত পেলে বা দিলে অবশ্যই চিহ্নিত করুন যাতে হিসাব সঠিক থাকে</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

