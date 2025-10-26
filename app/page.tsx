'use client'

import { useEffect, useState } from 'react'
import { getDebts, getLoans, getReminders, validateData } from '@/lib/storage'
import type { Debt, Loan, Reminder } from '@/lib/types'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [totalLent, setTotalLent] = useState(0)
  const [totalBorrowed, setTotalBorrowed] = useState(0)
  const [reminderCount, setReminderCount] = useState(0)
  const [debtDetails, setDebtDetails] = useState<Array<{name: string, amount: number}>>([])
  const [loanDetails, setLoanDetails] = useState<Array<{name: string, amount: number}>>([])
  const [mounted, setMounted] = useState(false)
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
  }, [user, loading, router])

  const loadData = () => {
    const debts: Debt[] = getDebts()
    const loans: Loan[] = getLoans()
    const reminders: Reminder[] = getReminders()

    // Calculate total amounts and collect details (only for non-returned items)
    const debtDetailsList: Array<{name: string, amount: number}> = []
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
          name: debt.personName || 'অজানা',
          amount: remainingAmount
        })
      }
      
      return sum + remainingAmount
    }, 0)

    const loanDetailsList: Array<{name: string, amount: number}> = []
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
  }

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📱</span>
          </div>
          <p className="text-gray-600">লোড হচ্ছে...</p>
        </div>
      </div>
    )
  }

  if (!user) {
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
        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-3xl shadow-2xl mb-6 sm:mb-8 transform hover:scale-105 transition-transform duration-300">
            <span className="text-3xl sm:text-4xl">📱</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-700 to-purple-700 bg-clip-text text-transparent mb-4 sm:mb-6 tracking-tight">
            LifeTrack
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 max-w-lg mx-auto leading-relaxed font-medium">
            আপনার আর্থিক জীবন সহজভাবে পরিচালনা করুন
          </p>
        </div>

        {/* User Financial Summary */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg border border-white/20 mb-6 sm:mb-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mb-3">
              <span className="text-lg">💰</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">আপনার আর্থিক সারসংক্ষেপ</h2>
            <p className="text-base text-gray-600">মোট হিসাবের একটি দ্রুত চিত্র</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Money to Receive */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-700 mb-1">আপনার কাছ থেকে পাবেন</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">৳{totalLent}</p>
                  <p className="text-xs text-green-600">মোট পাওনা</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
              
              {debtDetails.length > 0 ? (
                <div className="space-y-2">
                  {debtDetails.map((debt, index) => (
                    <div key={index} className="flex justify-between items-center bg-white/60 rounded-lg p-2 border border-green-100">
                      <span className="text-sm font-medium text-green-700">{debt.name}</span>
                      <span className="text-sm font-bold text-green-600 bg-green-100 px-2 py-1 rounded">৳{debt.amount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-green-600 text-sm">✅</span>
                  </div>
                  <p className="text-xs text-green-600">কেউ আপনার কাছে টাকা নেই</p>
                </div>
              )}
            </div>

            {/* Money to Give */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-5 border border-red-200 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-700 mb-1">আপনাকে দিতে হবে</p>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600 mb-1">৳{totalBorrowed}</p>
                  <p className="text-xs text-red-600">মোট ঋণ</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">💸</span>
                </div>
              </div>
              
              {loanDetails.length > 0 ? (
                <div className="space-y-2">
                  {loanDetails.map((loan, index) => (
                    <div key={index} className="flex justify-between items-center bg-white/60 rounded-lg p-2 border border-red-100">
                      <span className="text-sm font-medium text-red-700">{loan.name}</span>
                      <span className="text-sm font-bold text-red-600 bg-red-100 px-2 py-1 rounded">৳{loan.amount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-red-600 text-sm">✅</span>
                  </div>
                  <p className="text-xs text-red-600">আপনার কারো কাছে টাকা নেই</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-3">
                <span className="text-lg">⚖️</span>
              </div>
              <p className="text-sm text-gray-600 mb-2 font-medium">নেট ব্যালেন্স</p>
              <p className={`text-3xl sm:text-4xl font-bold mb-2 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ৳{Math.abs(netBalance)}
              </p>
              <p className={`text-base font-semibold mb-2 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netBalance >= 0 ? 'আপনি এগিয়ে আছেন' : 'আপনি পিছিয়ে আছেন'}
              </p>
              {netBalance >= 0 ? (
                <p className="text-xs text-green-600 bg-green-100 px-3 py-1 rounded inline-block">অন্যেরা আপনাকে ৳{netBalance} দেবে</p>
              ) : (
                <p className="text-xs text-red-600 bg-red-100 px-3 py-1 rounded inline-block">আপনাকে ৳{Math.abs(netBalance)} দিতে হবে</p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Link href="/reminders">
            <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <span className="text-2xl">⏰</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">রিমাইন্ডার</h3>
                  <p className="text-purple-100 text-sm">{reminderCount} সক্রিয়</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/debts">
            <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">ধার দিয়েছি</h3>
                  <p className="text-green-100 text-sm">বিস্তারিত দেখুন</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/loans">
            <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <span className="text-2xl">💸</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">ধার নিয়েছি</h3>
                  <p className="text-red-100 text-sm">বিস্তারিত দেখুন</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Tips Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mb-3">
              <span className="text-xl">💡</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">সহায়ক টিপস</h3>
            <p className="text-gray-600">আপনার অভিজ্ঞতা আরো ভালো করার জন্য</p>
          </div>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 group">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium text-sm">নোটিফিকেশন সক্রিয় করুন</p>
                <p className="text-gray-600 text-xs leading-relaxed">রিমাইন্ডার পেজে গিয়ে সময়মতো নোটিফিকেশন পেতে সেটিংস চেক করুন</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-300 group">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium text-sm">নিয়মিত আপডেট করুন</p>
                <p className="text-gray-600 text-xs leading-relaxed">আপনার হিসাব নিয়মিত আপডেট রাখুন যাতে সব তথ্য সঠিক থাকে</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all duration-300 group">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium text-sm">পেমেন্ট ট্র্যাক করুন</p>
                <p className="text-gray-600 text-xs leading-relaxed">টাকা ফেরত পেলে বা দিলে অবশ্যই চিহ্নিত করুন যাতে হিসাব সঠিক থাকে</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

