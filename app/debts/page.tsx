'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { getDebts, saveDebt, updateDebt, deleteDebt, addDebtPayment, deleteDebtPayment, addDebtIncrease, deleteDebtIncrease } from '@/lib/storage'
import type { Debt, Payment, AmountIncrease } from '@/lib/types'
import { format } from 'date-fns'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'
import Modal, { ActionButton } from '@/components/Modal'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [showForm, setShowForm] = useState(false)
  const [personName, setPersonName] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState('')
  const [mounted, setMounted] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [showIncreaseModal, setShowIncreaseModal] = useState<string | null>(null)
  const [increaseAmount, setIncreaseAmount] = useState('')
  const [increaseDate, setIncreaseDate] = useState('')
  const [increaseReason, setIncreaseReason] = useState('')
  const [editPersonName, setEditPersonName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editingPayment, setEditingPayment] = useState<{debtId: string, payment: Payment} | null>(null)
  const [editPaymentAmount, setEditPaymentAmount] = useState('')
  const [editPaymentDate, setEditPaymentDate] = useState('')
  const [editPaymentNote, setEditPaymentNote] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null)
  const [editingIncrease, setEditingIncrease] = useState<{debtId: string, increase: AmountIncrease} | null>(null)
  const [editIncreaseAmount, setEditIncreaseAmount] = useState('')
  const [editIncreaseDate, setEditIncreaseDate] = useState('')
  const [editIncreaseReason, setEditIncreaseReason] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    setMounted(true)
    loadDebts()
    // Set default date after mount
    setDate(new Date().toISOString().slice(0, 16))
    setPaymentDate(new Date().toISOString().slice(0, 16))
    setIncreaseDate(new Date().toISOString().slice(0, 16))
  }, [user, loading, router])

  const loadDebts = () => {
    setDebts(getDebts())
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (!personName || !amount) {
      toast.error('নাম এবং পরিমাণ দিন')
      return
    }

    const debt: Debt = {
      id: Date.now().toString(),
      personName,
      amount: parseFloat(amount),
      reason,
      date,
      returned: false,
      createdAt: new Date().toISOString(),
      payments: [],
      increases: [],
    }

    saveDebt(debt)
    setPersonName('')
    setAmount('')
    setReason('')
    setDate(new Date().toISOString().slice(0, 16))
    setShowForm(false)
    loadDebts()
    toast.success('ধার সফলভাবে যোগ করা হয়েছে')
  }

  const handleToggleReturned = (debt: Debt) => {
    const newStatus = !debt.returned
    const actionText = newStatus ? 'ফেরত পেয়েছেন' : 'ফেরত পাননি'
    const confirmText = newStatus ? 'ফেরত পেয়েছি' : 'ফেরত পাইনি'
    
    // Calculate total amount including increments
    const totalAmount = debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0)
    
    confirm.custom(
      'ধারের অবস্থা পরিবর্তন করুন',
      `${debt.personName} এর ${totalAmount} টাকার ধার ${actionText} হিসেবে চিহ্নিত করবেন?`,
      () => {
        if (newStatus) {
          // When marking as returned, ensure payment amount equals total amount
          const totalPaid = getTotalPaid(debt)
          if (totalPaid < totalAmount) {
            // Add remaining payment to make it fully paid
            const remainingAmount = totalAmount - totalPaid
            const remainingPayment: Payment = {
              id: Date.now().toString(),
              amount: remainingAmount,
              date: new Date().toISOString().slice(0, 16),
              note: 'সম্পূর্ণ পরিশোধ',
              createdAt: new Date().toISOString(),
            }
            addDebtPayment(debt.id, remainingPayment)
          }
        }
        updateDebt(debt.id, { returned: newStatus })
        loadDebts()
        toast.success(`ধার ${actionText} হিসেবে চিহ্নিত করা হয়েছে`)
      },
      {
        confirmText: confirmText,
        cancelText: 'বাতিল',
        type: newStatus ? 'info' : 'warning'
      }
    )
  }

  const handleDelete = (id: string) => {
    const debt = debts.find(d => d.id === id)
    if (!debt) return
    
    confirm.delete(
      'ধার মুছুন',
      `${debt.personName} এর ${debt.amount} টাকার ধার মুছে ফেলবেন?`,
      () => {
        deleteDebt(id)
        loadDebts()
        toast.success('ধার সফলভাবে মুছে ফেলা হয়েছে')
      }
    )
  }

  const handleAddPayment = (debtId: string) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('সঠিক পরিমাণ দিন')
      return
    }

    const amount = Number(parseFloat(paymentAmount).toFixed(2))
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return

    const remaining = calculateRemaining(debt)

    if (amount > remaining) {
      toast.error(`বাকি পরিমাণ: ৳${remaining}. তার চেয়ে বেশি পরিশোধ করা যাবে না।`)
      return
    }

    const payment: Payment = {
      id: Date.now().toString(),
      amount,
      date: paymentDate,
      note: paymentNote,
      createdAt: new Date().toISOString(),
    }

    addDebtPayment(debtId, payment)
    setPaymentAmount('')
    setPaymentDate(new Date().toISOString().slice(0, 16))
    setPaymentNote('')
    setShowPaymentForm(null)
    setShowPaymentModal(null)
    loadDebts()
    toast.success('পেমেন্ট সফলভাবে যোগ করা হয়েছে')
  }

  const handleOpenPaymentModal = (debtId: string) => {
    setShowPaymentModal(debtId)
    setPaymentAmount('')
    setPaymentDate(new Date().toISOString().slice(0, 16))
    setPaymentNote('')
  }

  const handleClosePaymentModal = () => {
    setShowPaymentModal(null)
    setPaymentAmount('')
    setPaymentDate(new Date().toISOString().slice(0, 16))
    setPaymentNote('')
  }

  const handleDeletePayment = (debtId: string, paymentId: string) => {
    const debt = debts.find(d => d.id === debtId)
    const payment = debt?.payments?.find(p => p.id === paymentId)
    if (!debt || !payment) return
    
    confirm.delete(
      'পেমেন্ট মুছুন',
      `${payment.amount} টাকার পেমেন্ট মুছে ফেলবেন?`,
      () => {
        deleteDebtPayment(debtId, paymentId)
        loadDebts()
        toast.success('পেমেন্ট সফলভাবে মুছে ফেলা হয়েছে')
      }
    )
  }

  const handleIncreaseDebtAmount = (debtId: string) => {
    if (!increaseAmount || !increaseDate) {
      toast.error('পরিমাণ এবং তারিখ প্রয়োজন')
      return
    }

    const amount = Number(parseFloat(increaseAmount).toFixed(2))
    if (isNaN(amount) || amount <= 0) {
      toast.error('সঠিক পরিমাণ দিন')
      return
    }

    const debt = debts.find(d => d.id === debtId)
    if (!debt) return

    // Calculate current total amount (initial + all increases)
    const currentTotalAmount = debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0)
    const newTotalAmount = currentTotalAmount + amount

    confirm.update(
      'ধারের পরিমাণ বৃদ্ধি করুন',
      `${debt.personName} এর ধারের পরিমাণ ৳${currentTotalAmount} থেকে ৳${newTotalAmount} বৃদ্ধি করবেন?`,
      () => {
        // Add increase to history
        const increase: AmountIncrease = {
          id: Date.now().toString(),
          amount,
          date: increaseDate,
          reason: increaseReason || undefined,
          createdAt: new Date().toISOString(),
        }
        
        addDebtIncrease(debtId, increase)
        
        // Don't update debt amount - keep original amount, only update reason if needed
        if (increaseReason) {
          updateDebt(debtId, { 
            reason: `${debt.reason || ''} + ${increaseReason}`.trim()
          })
        }
        
        toast.success('ধারের পরিমাণ বৃদ্ধি করা হয়েছে')
        handleCloseIncreaseModal()
        loadDebts()
      }
    )
  }

  const handleOpenIncreaseModal = (debtId: string) => {
    setShowIncreaseModal(debtId)
    setIncreaseAmount('')
    setIncreaseDate(new Date().toISOString().slice(0, 16))
    setIncreaseReason('')
  }

  const handleCloseIncreaseModal = () => {
    setShowIncreaseModal(null)
    setIncreaseAmount('')
    setIncreaseDate(new Date().toISOString().slice(0, 16))
    setIncreaseReason('')
  }

  const handleDeleteIncrease = (debtId: string, increaseId: string) => {
    const debt = debts.find(d => d.id === debtId)
    const increase = debt?.increases?.find(i => i.id === increaseId)
    if (!debt || !increase) return

    // Calculate current total amount (initial + all increases)
    const currentTotalAmount = debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0)
    const newTotalAmount = currentTotalAmount - increase.amount

    confirm.delete(
      'পরিমাণ বৃদ্ধি মুছুন',
      `${increase.amount} টাকার পরিমাণ বৃদ্ধি মুছে ফেলবেন? ধারের পরিমাণ ৳${currentTotalAmount} থেকে ৳${newTotalAmount} হবে।`,
      () => {
        // Don't update debt.amount - it should always remain the initial amount
        // Just delete the increase record
        deleteDebtIncrease(debtId, increaseId)
        loadDebts()
        toast.success('পরিমাণ বৃদ্ধি সফলভাবে মুছে ফেলা হয়েছে')
      }
    )
  }

  const calculateRemaining = (debt: Debt): number => {
    // Calculate total amount including increments
    const totalAmount = debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0)
    
    if (!debt.payments || debt.payments.length === 0) {
      return totalAmount
    }
    const totalPaid = debt.payments.reduce((sum, p) => sum + p.amount, 0)
    return totalAmount - totalPaid
  }

  const getTotalPaid = (debt: Debt): number => {
    if (!debt.payments || debt.payments.length === 0) {
      return 0
    }
    return debt.payments.reduce((sum, p) => sum + p.amount, 0)
  }

  // Helper function to get initial amount (always the original amount, never affected by increments)
  const getInitialAmount = (debt: Debt): number => {
    return debt.amount
  }

  // Helper function to get initial reason (only the first part, before any increments)
  const getInitialReason = (debt: Debt): string => {
    if (!debt.reason) return ''
    
    // If there are no increases, return the full reason
    if (!debt.increases || debt.increases.length === 0) {
      return debt.reason
    }
    
    // Split by ' + ' and take only the first part (initial reason)
    const parts = debt.reason.split(' + ')
    return parts[0] || ''
  }


  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt)
    setEditPersonName(debt.personName)
    setEditAmount(debt.amount.toString())
    setEditReason(getInitialReason(debt))
    setEditDate(debt.date)
  }

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (!editingDebt || !editPersonName || !editAmount) {
      toast.error('নাম এবং পরিমাণ দিন')
      return
    }

    const newAmount = parseFloat(editAmount)
    if (isNaN(newAmount) || newAmount <= 0) {
      toast.error('সঠিক পরিমাণ দিন')
      return
    }

    // Check if new amount is less than total paid amount
    const totalPaid = getTotalPaid(editingDebt)
    if (newAmount < totalPaid) {
      toast.error(`মোট পরিশোধিত পরিমাণ: ৳${totalPaid}. নতুন পরিমাণ তার চেয়ে কম হতে পারবে না।`)
      return
    }

    confirm.update(
      'ধার আপডেট করুন',
      `${editPersonName} এর ধারের তথ্য আপডেট করবেন?`,
      () => {
        // Check if new amount is greater than total paid, then set returned to false
        const shouldBeReturned = newAmount <= totalPaid
        
        updateDebt(editingDebt.id, {
          personName: editPersonName,
          amount: newAmount,
          reason: editReason,
          date: editDate,
          returned: shouldBeReturned,
        })

        setEditingDebt(null)
        setEditPersonName('')
        setEditAmount('')
        setEditReason('')
        setEditDate('')
        loadDebts()
        toast.success('ধার সফলভাবে আপডেট করা হয়েছে')
      }
    )
  }

  const handleCancelEdit = () => {
    setEditingDebt(null)
    setEditPersonName('')
    setEditAmount('')
    setEditReason('')
    setEditDate('')
  }

  const handleEditPayment = (debtId: string, payment: Payment) => {
    setEditingPayment({ debtId, payment })
    setEditPaymentAmount(payment.amount.toString())
    setEditPaymentDate(payment.date)
    setEditPaymentNote(payment.note || '')
  }

  const handleEditIncrease = (debtId: string, increase: AmountIncrease) => {
    setEditingIncrease({ debtId, increase })
    setEditIncreaseAmount(increase.amount.toString())
    setEditIncreaseDate(increase.date)
    setEditIncreaseReason(increase.reason || '')
  }

  const handleEditPaymentSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (!editingPayment || !editPaymentAmount || !editPaymentDate) {
      toast.error('পরিমাণ এবং তারিখ প্রয়োজন')
      return
    }

    const amount = parseFloat(editPaymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('সঠিক পরিমাণ দিন')
      return
    }

    const debt = debts.find(d => d.id === editingPayment.debtId)
    if (!debt) return

    // Calculate remaining amount excluding the current payment being edited
    const otherPayments = debt.payments?.filter(p => p.id !== editingPayment.payment.id) || []
    const otherPaymentsTotal = otherPayments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = debt.amount - otherPaymentsTotal
    
    if (amount > remaining) {
      toast.error(`বাকি পরিমাণ: ৳${remaining}. তার চেয়ে বেশি পরিশোধ করা যাবে না।`)
      return
    }

    const updatedPayment: Payment = {
      ...editingPayment.payment,
      amount,
      date: editPaymentDate,
      note: editPaymentNote || undefined,
    }

    confirm.update(
      'পেমেন্ট আপডেট করুন',
      `${amount} টাকার পেমেন্ট আপডেট করবেন?`,
      () => {
        // Delete old payment and add updated payment
        deleteDebtPayment(editingPayment.debtId, editingPayment.payment.id)
        addDebtPayment(editingPayment.debtId, updatedPayment)

        setEditingPayment(null)
        setEditPaymentAmount('')
        setEditPaymentDate('')
        setEditPaymentNote('')
        loadDebts()
        toast.success('পেমেন্ট সফলভাবে আপডেট করা হয়েছে')
      }
    )
  }

  const handleEditIncreaseSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (!editingIncrease || !editIncreaseAmount || !editIncreaseDate) {
      toast.error('পরিমাণ এবং তারিখ প্রয়োজন')
      return
    }

    const amount = parseFloat(editIncreaseAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('সঠিক পরিমাণ দিন')
      return
    }

    const updatedIncrease: AmountIncrease = {
      ...editingIncrease.increase,
      amount,
      date: editIncreaseDate,
      reason: editIncreaseReason || undefined,
    }

    confirm.update(
      'পরিমাণ বৃদ্ধি আপডেট করুন',
      `${amount} টাকার পরিমাণ বৃদ্ধি আপডেট করবেন?`,
      () => {
        // Delete old increase and add updated increase
        deleteDebtIncrease(editingIncrease.debtId, editingIncrease.increase.id)
        addDebtIncrease(editingIncrease.debtId, updatedIncrease)

        setEditingIncrease(null)
        setEditIncreaseAmount('')
        setEditIncreaseDate('')
        setEditIncreaseReason('')
        loadDebts()
        toast.success('পরিমাণ বৃদ্ধি সফলভাবে আপডেট করা হয়েছে')
      }
    )
  }

  const handleCancelPaymentEdit = () => {
    setEditingPayment(null)
    setEditPaymentAmount('')
    setEditPaymentDate('')
    setEditPaymentNote('')
  }

  const handleCancelIncreaseEdit = () => {
    setEditingIncrease(null)
    setEditIncreaseAmount('')
    setEditIncreaseDate('')
    setEditIncreaseReason('')
  }

  if (!mounted) {
    return null
  }

  const activeDebts = debts.filter(d => !d.returned)
  const returnedDebts = debts.filter(d => d.returned)
  
  // Calculate remaining amounts after payments
  const totalActive = activeDebts.reduce((sum, d) => {
    const totalPaid = d.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0
    const totalAmount = d.amount + (d.increases?.reduce((incSum, inc) => incSum + inc.amount, 0) || 0)
    const remaining = totalAmount - totalPaid
    return sum + Math.max(0, remaining)
  }, 0)
  
  const totalReturned = returnedDebts.reduce((sum, d) => {
    const totalPaid = d.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0
    return sum + totalPaid
  }, 0)

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12 fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl mb-4 sm:mb-6 float-gentle">
            <span className="text-2xl sm:text-3xl">💰</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-green-800 to-emerald-800 bg-clip-text text-transparent mb-3 sm:mb-4 float-gentle">
            ধার দিয়েছি
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 slide-up max-w-md mx-auto leading-relaxed px-4">
            আপনি যাদের কাছে টাকা ধার দিয়েছেন
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 stagger-item">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">বাকি আছে</p>
                <p className="text-2xl font-bold text-green-600">৳{totalActive}</p>
                <p className="text-xs text-gray-500">পাওনা আছে</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <span className="text-2xl">💸</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 stagger-item">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">ফেরত পেয়েছি</p>
                <p className="text-2xl font-bold text-blue-600">৳{totalReturned}</p>
                <p className="text-xs text-gray-500">মোট ফেরত</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Add Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowForm(!showForm)}
            className="group relative overflow-hidden bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl px-8 py-4 shadow-2xl hover:shadow-green-500/25 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center gap-3 text-white font-semibold text-lg">
              <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                {showForm ? '✕' : '➕'}
              </span>
              {showForm ? 'বাতিল করুন' : 'নতুন ধার যোগ করুন'}
            </div>
          </button>
        </div>

        {/* Add Debt Modal */}
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="নতুন ধার যোগ করুন"
          className="border-green-200"
          footerActions={
            <div className="flex justify-end space-x-3">
              <ActionButton
                onClick={() => setShowForm(false)}
                variant="secondary"
              >
                বাতিল
              </ActionButton>
              <ActionButton
                onClick={(e) => e && handleSubmit(e)}
                variant="primary"
              >
                সংরক্ষণ করুন
              </ActionButton>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">ব্যক্তির নাম *</label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="input focus:ring-green-500/50 focus:border-green-500/50"
                placeholder="যেমন: আলী"
                required
              />
            </div>
            <div>
              <label className="label">পরিমাণ (৳) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow numbers and decimal point
                  if (/^\d*\.?\d*$/.test(value)) {
                    setAmount(value)
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent non-numeric keys except backspace, delete, tab, escape, enter, decimal point
                  if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', '.', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                    e.preventDefault()
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault()
                  const paste = e.clipboardData.getData('text')
                  if (/^\d*\.?\d*$/.test(paste)) {
                    setAmount(paste)
                  }
                }}
                className="input focus:ring-green-500/50 focus:border-green-500/50"
                placeholder="০"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="label">প্রাথমিক কারণ (ঐচ্ছিক)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input focus:ring-green-500/50 focus:border-green-500/50 min-h-[80px] resize-none"
                placeholder="যেমন: জরুরি প্রয়োজন"
                rows={3}
              />
            </div>
            <div>
              <label className="label">তারিখ *</label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input focus:ring-green-500/50 focus:border-green-500/50"
                required
              />
            </div>
          </form>
        </Modal>

        {/* Edit Debt Modal */}
        <Modal
          isOpen={editingDebt !== null}
          onClose={handleCancelEdit}
          title="ধার সম্পাদনা করুন"
          className="border-blue-200"
          footerActions={
            <div className="flex justify-end space-x-3">
              <ActionButton
                onClick={handleCancelEdit}
                variant="secondary"
              >
                বাতিল
              </ActionButton>
              <ActionButton
                onClick={(e) => e && handleEditSubmit(e)}
                variant="primary"
              >
                আপডেট করুন
              </ActionButton>
            </div>
          }
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="label">ব্যক্তির নাম *</label>
              <input
                type="text"
                value={editPersonName}
                onChange={(e) => setEditPersonName(e.target.value)}
                className="input focus:ring-green-500/50 focus:border-green-500/50"
                placeholder="যেমন: আলী"
                required
              />
            </div>
            <div>
              <label className="label">পরিমাণ (৳) *</label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow numbers and decimal point
                  if (/^\d*\.?\d*$/.test(value)) {
                    setEditAmount(value)
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent non-numeric keys except backspace, delete, tab, escape, enter, decimal point
                  if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', '.', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                    e.preventDefault()
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault()
                  const paste = e.clipboardData.getData('text')
                  if (/^\d*\.?\d*$/.test(paste)) {
                    setEditAmount(paste)
                  }
                }}
                className="input focus:ring-green-500/50 focus:border-green-500/50"
                placeholder="০"
                min={editingDebt ? getTotalPaid(editingDebt) : 0}
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="label">প্রাথমিক কারণ (ঐচ্ছিক)</label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="input focus:ring-green-500/50 focus:border-green-500/50 min-h-[80px] resize-none"
                placeholder="যেমন: জরুরি প্রয়োজন"
                rows={3}
              />
            </div>
            <div>
              <label className="label">তারিখ *</label>
              <input
                type="datetime-local"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="input focus:ring-green-500/50 focus:border-green-500/50"
                required
              />
            </div>
          </form>
        </Modal>

        {/* Edit Payment Modal */}
        <Modal
          isOpen={editingPayment !== null}
          onClose={handleCancelPaymentEdit}
          title="পেমেন্ট সম্পাদনা করুন"
          className="border-green-200"
          footerActions={
            <div className="flex justify-end space-x-3">
              <ActionButton
                onClick={handleCancelPaymentEdit}
                variant="secondary"
              >
                বাতিল
              </ActionButton>
              <ActionButton
                onClick={(e) => e && handleEditPaymentSubmit(e)}
                variant="primary"
              >
                আপডেট করুন
              </ActionButton>
            </div>
          }
        >
          <form onSubmit={handleEditPaymentSubmit} className="space-y-4">
            <div>
              <label className="label">পরিমাণ (৳) *</label>
              <input
                type="number"
                value={editPaymentAmount}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow numbers and decimal point
                  if (/^\d*\.?\d*$/.test(value)) {
                    setEditPaymentAmount(value)
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent non-numeric keys except backspace, delete, tab, escape, enter, decimal point
                  if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', '.', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                    e.preventDefault()
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault()
                  const paste = e.clipboardData.getData('text')
                  if (/^\d*\.?\d*$/.test(paste)) {
                    setEditPaymentAmount(paste)
                  }
                }}
                className="input focus:ring-green-500/50 focus:border-green-500/50"
                placeholder="০"
                min="0"
                max={editingPayment ? (() => {
                  const debt = debts.find(d => d.id === editingPayment.debtId)
                  if (!debt) return 0
                  const otherPayments = debt.payments?.filter(p => p.id !== editingPayment.payment.id) || []
                  const otherPaymentsTotal = otherPayments.reduce((sum, p) => sum + p.amount, 0)
                  return debt.amount - otherPaymentsTotal
                })() : 0}
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="label">তারিখ *</label>
              <input
                type="datetime-local"
                value={editPaymentDate}
                onChange={(e) => setEditPaymentDate(e.target.value)}
                className="input focus:ring-green-500/50 focus:border-green-500/50"
                required
              />
            </div>
            <div>
              <label className="label">নোট (ঐচ্ছিক)</label>
              <input
                type="text"
                value={editPaymentNote}
                onChange={(e) => setEditPaymentNote(e.target.value)}
                className="input focus:ring-green-500/50 focus:border-green-500/50"
                placeholder="যেমন: আংশিক পরিশোধ"
              />
            </div>
          </form>
        </Modal>

        {/* Edit Increase Modal */}
        <Modal
          isOpen={editingIncrease !== null}
          onClose={handleCancelIncreaseEdit}
          title="পরিমাণ বৃদ্ধি সম্পাদনা করুন"
          className="border-purple-200"
          footerActions={
            <div className="flex gap-3">
              <ActionButton
                onClick={handleCancelIncreaseEdit}
                variant="secondary"
              >
                বাতিল
              </ActionButton>
              <ActionButton
                onClick={(e) => e && handleEditIncreaseSubmit(e)}
                variant="primary"
              >
                আপডেট করুন
              </ActionButton>
            </div>
          }
        >
          <form onSubmit={handleEditIncreaseSubmit} className="space-y-4">
            <div>
              <label className="label">পরিমাণ (৳) *</label>
              <input
                type="number"
                value={editIncreaseAmount}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow numbers and decimal point
                  if (/^\d*\.?\d*$/.test(value)) {
                    setEditIncreaseAmount(value)
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent non-numeric keys except backspace, delete, tab, escape, enter, decimal point
                  if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', '.', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                    e.preventDefault()
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault()
                  const paste = e.clipboardData.getData('text')
                  if (/^\d*\.?\d*$/.test(paste)) {
                    setEditIncreaseAmount(paste)
                  }
                }}
                className="input focus:ring-purple-500/50 focus:border-purple-500/50"
                placeholder="০"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="label">তারিখ *</label>
              <input
                type="datetime-local"
                value={editIncreaseDate}
                onChange={(e) => setEditIncreaseDate(e.target.value)}
                className="input focus:ring-purple-500/50 focus:border-purple-500/50"
                required
              />
            </div>
            <div>
              <label className="label">কারণ (ঐচ্ছিক)</label>
              <textarea
                value={editIncreaseReason}
                onChange={(e) => setEditIncreaseReason(e.target.value)}
                className="input focus:ring-purple-500/50 focus:border-purple-500/50 min-h-[80px] resize-none"
                placeholder="পরিমাণ বৃদ্ধির কারণ"
                rows={3}
              />
            </div>
          </form>
        </Modal>

        <div className="space-y-8">
          {activeDebts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600">💸</span>
                </div>
                বাকি আছে
              </h2>
              <div className="grid gap-6">
                {activeDebts.map((debt) => {
                  const remaining = calculateRemaining(debt)
                  const totalPaid = getTotalPaid(debt)
                  return (
                    <div key={debt.id} className="space-y-6">
                      {/* Main Debt Card */}
                      <div className="group relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 rounded-2xl shadow-lg border border-red-200 hover:shadow-xl transition-all duration-300">
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                                <span className="text-white text-xl">👤</span>
                              </div>
                              <div>
                                <h3 className="font-bold text-xl text-gray-900 mb-1">
                                  {debt.personName}
                                </h3>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleToggleReturned(debt)}
                                className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all duration-200 hover:scale-110"
                                title="ফেরত পেয়েছি"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => handleDelete(debt.id)}
                                className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all duration-200 hover:scale-110"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center p-3 bg-gradient-to-br from-red-100 to-red-200 rounded-xl border border-red-300">
                              <div className="text-xs text-red-700 mb-2 font-medium">মোট</div>
                              <div className="text-lg sm:text-xl font-bold text-red-800">৳{debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0)}</div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                              <div className="text-xs text-gray-500 mb-2 font-medium">পরিশোধিত</div>
                              <div className="text-lg sm:text-xl font-bold text-blue-600">৳{totalPaid}</div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                              <div className="text-xs text-orange-700 mb-2 font-medium">বাকি</div>
                              <div className="text-lg sm:text-xl font-bold text-orange-600">৳{remaining}</div>
                            </div>
                          </div>
                        </div>

                        {/* Initial Payment Section */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-4 px-6">
                            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                              <span className="text-green-600 text-sm">💰</span>
                            </div>
                            <h4 className="text-sm font-semibold text-gray-700">প্রাথমিক পরিমাণ</h4>
                          </div>
                          <div className="px-6 pb-4">
                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">৳</span>
                                </div>
                                <div>
                                  <div className="font-bold text-green-700">৳{getInitialAmount(debt)}</div>
                                  <div className="text-xs text-gray-600">{format(new Date(debt.date), 'PP p')}</div>
                                  <div className="text-xs text-gray-500 italic mt-1">প্রাথমিক ধার</div>
                                  {getInitialReason(debt) && (
                                    <div className="text-xs text-gray-500 italic mt-1">📝 {getInitialReason(debt)}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(debt)}
                                  className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg text-xs transition-all duration-200 hover:scale-110"
                                  title="প্রাথমিক কারণ সম্পাদনা করুন"
                                >
                                  ✏️
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Payment History - Inside main card */}
                        {debt.payments && debt.payments.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-4 px-6">
                              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 text-sm">📋</span>
                              </div>
                              <h4 className="text-sm font-semibold text-gray-700">পরিশোধের ইতিহাস</h4>
                            </div>
                            <div className="space-y-3 px-6 pb-4">
                              {debt.payments.map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-sm font-bold">৳</span>
                                    </div>
                                    <div>
                                      <div className="font-bold text-blue-700">৳{payment.amount}</div>
                                      <div className="text-xs text-gray-600">{format(new Date(payment.date), 'PP p')}</div>
                                      {payment.note && (
                                        <div className="text-xs text-gray-500 italic mt-1">📝 {payment.note}</div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleEditPayment(debt.id, payment)}
                                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg text-xs transition-all duration-200 hover:scale-110"
                                      title="সম্পাদনা করুন"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleDeletePayment(debt.id, payment.id)}
                                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs transition-all duration-200 hover:scale-110"
                                      title="মুছুন"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Amount Increase History */}
                        {debt.increases && debt.increases.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-4 px-6">
                              <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-purple-600 text-sm">➕</span>
                              </div>
                              <h4 className="text-sm font-semibold text-gray-700">পরিমাণ বৃদ্ধির তালিকা</h4>
                            </div>
                            <div className="space-y-3 px-6 pb-4">
                              {debt.increases.map((increase, index) => {
                                // Calculate initial amount and total after this increase
                                const previousIncreases = debt.increases?.slice(0, index) || []
                                const previousIncreasesTotal = previousIncreases.reduce((sum, inc) => sum + inc.amount, 0)
                                const initialAmount = debt.amount  // debt.amount is always the initial amount
                                const totalAfterThisIncrease = initialAmount + previousIncreasesTotal + increase.amount
                                
                                return (
                                  <div key={increase.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">➕</span>
                                      </div>
                                      <div>
                                        <div className="font-bold text-purple-700">বৃদ্ধির পরিমাণ (৳): ৳{increase.amount}</div>
                                        <div className="text-xs text-gray-600">{format(new Date(increase.date), 'PP p')}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          <span className="font-medium">প্রাথমিক: ৳{initialAmount}</span> → 
                                          <span className="font-medium text-purple-600"> মোট: ৳{totalAfterThisIncrease}</span>
                                        </div>
                                        {increase.reason && (
                                          <div className="text-xs text-gray-500 italic mt-1">কারণ (ঐচ্ছিক): {increase.reason}</div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleEditIncrease(debt.id, increase)}
                                        className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg text-xs transition-all duration-200 hover:scale-110"
                                        title="সম্পাদনা করুন"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() => handleDeleteIncrease(debt.id, increase.id)}
                                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs transition-all duration-200 hover:scale-110"
                                        title="মুছে ফেলুন"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Add Payment Button/Form - Inside main card */}
                        {remaining > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            {showPaymentForm === debt.id ? (
                              <div className="space-y-4 px-6 pb-4">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                                    <span className="text-green-600 text-sm">💵</span>
                                  </div>
                                  <h4 className="text-sm font-semibold text-gray-700">পেমেন্ট যোগ করুন</h4>
                                </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-gray-600">পরিমাণ (৳)</label>
                                  <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      // Only allow numbers and decimal point
                                      if (/^\d*\.?\d*$/.test(value)) {
                                        setPaymentAmount(value)
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      // Prevent non-numeric keys except backspace, delete, tab, escape, enter, decimal point
                                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', '.', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                                        e.preventDefault()
                                      }
                                    }}
                                    onPaste={(e) => {
                                      e.preventDefault()
                                      const paste = e.clipboardData.getData('text')
                                      if (/^\d*\.?\d*$/.test(paste)) {
                                        setPaymentAmount(paste)
                                      }
                                    }}
                                    className="input input-sm focus:ring-green-500/50 focus:border-green-500/50"
                                    placeholder="০"
                                    min="0"
                                    max={remaining}
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600">তারিখ</label>
                                  <input
                                    type="datetime-local"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="input input-sm focus:ring-green-500/50 focus:border-green-500/50"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-gray-600">নোট (ঐচ্ছিক)</label>
                                <input
                                  type="text"
                                  value={paymentNote}
                                  onChange={(e) => setPaymentNote(e.target.value)}
                                  className="input text-sm"
                                  placeholder="যেমন: আংশিক পরিশোধ"
                                />
                              </div>
                              <div className="flex gap-4 mt-4">
                                <button
                                  onClick={() => handleAddPayment(debt.id)}
                                  className="flex-1 bg-gradient-to-br from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:shadow-lg transition-all duration-300"
                                >
                                  সংরক্ষণ করুন
                                </button>
                                <button
                                  onClick={() => setShowPaymentForm(null)}
                                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-all duration-300"
                                >
                                  বাতিল
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="px-6 py-4">
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => handleOpenPaymentModal(debt.id)}
                                  className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl px-4 py-3 w-full shadow-lg hover:shadow-blue-500/25 transition-all duration-300 cursor-pointer"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  <div className="relative z-10 flex items-center justify-center gap-2 text-white font-semibold text-sm">
                                    <span className="text-lg">💵</span>
                                    পেমেন্ট যোগ করুন
                                  </div>
                                </button>
                                <button
                                  onClick={() => handleOpenIncreaseModal(debt.id)}
                                  className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl px-4 py-3 w-full shadow-lg hover:shadow-purple-500/25 transition-all duration-300 cursor-pointer"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  <div className="relative z-10 flex items-center justify-center gap-2 text-white font-semibold text-sm">
                                    <span className="text-lg">➕</span>
                                    পরিমাণ বৃদ্ধি করুন
                                  </div>
                                </button>
                              </div>
                            </div>
                          )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {returnedDebts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">ফেরত পেয়েছি</h2>
              <div className="space-y-4">
                {returnedDebts.map((debt) => {
                  const totalPaid = getTotalPaid(debt)
                  return (
                    <div key={debt.id} className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg border border-green-200 overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                              <span className="text-white text-xl">✅</span>
                            </div>
                            <div>
                              <h3 className="font-bold text-xl text-gray-900 mb-1">
                                {debt.personName}
                              </h3>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleReturned(debt)}
                              className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-all duration-200 hover:scale-110"
                              title="ফেরত পাইনি"
                            >
                              ↺
                            </button>
                            <button
                              onClick={() => handleDelete(debt.id)}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all duration-200 hover:scale-110"
                              title="মুছে ফেলুন"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center p-4 bg-green-100 rounded-xl border border-green-200">
                            <div className="text-xs text-green-700 mb-2 font-medium">মূল পরিমাণ</div>
                            <div className="text-lg sm:text-xl font-bold text-green-800">৳{debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0)}</div>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <div className="text-xs text-gray-500 mb-2 font-medium">পরিশোধিত</div>
                            <div className="text-lg sm:text-xl font-bold text-blue-600">৳{totalPaid}</div>
                          </div>
                        </div>

                        {/* Initial Payment Section */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                              <span className="text-green-600 text-sm">💰</span>
                            </div>
                            <h4 className="text-sm font-semibold text-gray-700">প্রাথমিক পরিমাণ</h4>
                          </div>
                          <div className="px-6 pb-4">
                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">৳</span>
                                </div>
                                <div>
                                  <div className="font-bold text-green-700">৳{getInitialAmount(debt)}</div>
                                  <div className="text-xs text-gray-600">{format(new Date(debt.date), 'PP p')}</div>
                                  <div className="text-xs text-gray-500 italic mt-1">প্রাথমিক ধার</div>
                                  {getInitialReason(debt) && (
                                    <div className="text-xs text-gray-500 italic mt-1">📝 {getInitialReason(debt)}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Payment History */}
                        {debt.payments && debt.payments.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 text-sm">📋</span>
                              </div>
                              <h4 className="text-sm font-semibold text-gray-700">পরিশোধের ইতিহাস</h4>
                            </div>
                            <div className="space-y-3">
                              {debt.payments.map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-sm font-bold">৳</span>
                                    </div>
                                    <div>
                                      <div className="font-bold text-blue-700">৳{payment.amount}</div>
                                      <div className="text-xs text-gray-600">{format(new Date(payment.date), 'PP p')}</div>
                                      {payment.note && (
                                        <div className="text-xs text-gray-500 italic mt-1">📝 {payment.note}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Amount Increase History */}
                        {debt.increases && debt.increases.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-purple-600 text-sm">➕</span>
                              </div>
                              <h4 className="text-sm font-semibold text-gray-700">পরিমাণ বৃদ্ধির তালিকা</h4>
                            </div>
                            <div className="space-y-3">
                              {debt.increases.map((increase, index) => {
                                // Calculate initial amount and total after this increase
                                const previousIncreases = debt.increases?.slice(0, index) || []
                                const previousIncreasesTotal = previousIncreases.reduce((sum, inc) => sum + inc.amount, 0)
                                const initialAmount = debt.amount  // debt.amount is always the initial amount
                                const totalAfterThisIncrease = initialAmount + previousIncreasesTotal + increase.amount
                                
                                return (
                                  <div key={increase.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">➕</span>
                                      </div>
                                      <div>
                                        <div className="font-bold text-purple-700">বৃদ্ধির পরিমাণ (৳): ৳{increase.amount}</div>
                                        <div className="text-xs text-gray-600">{format(new Date(increase.date), 'PP p')}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          <span className="font-medium">প্রাথমিক: ৳{initialAmount}</span> → 
                                          <span className="font-medium text-purple-600"> মোট: ৳{totalAfterThisIncrease}</span>
                                        </div>
                                        {increase.reason && (
                                          <div className="text-xs text-gray-500 italic mt-1">কারণ (ঐচ্ছিক): {increase.reason}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {debts.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6">
                <span className="text-4xl text-gray-400">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">কোনো ধার নেই</h3>
              <p className="text-gray-500 mb-6">এখনো কাউকে টাকা ধার দেননি</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-br from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <span>➕</span>
                প্রথম ধার যোগ করুন
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <Modal
          isOpen={!!showPaymentModal}
          onClose={handleClosePaymentModal}
          title="পেমেন্ট যোগ করুন"
          footerActions={
            <div className="flex justify-end space-x-3">
              <ActionButton
                onClick={handleClosePaymentModal}
                variant="secondary"
              >
                বাতিল
              </ActionButton>
              <ActionButton
                onClick={() => handleAddPayment(showPaymentModal)}
                variant="primary"
              >
                সংরক্ষণ করুন
              </ActionButton>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => {
                    const value = e.target.value
                    if (/^\d*\.?\d*$/.test(value)) {
                      setPaymentAmount(value)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', '.', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault()
                    const paste = e.clipboardData.getData('text')
                    if (/^\d*\.?\d*$/.test(paste)) {
                      setPaymentAmount(paste)
                    }
                  }}
                  className="input focus:ring-green-500/50 focus:border-green-500/50"
                  placeholder="০"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">তারিখ</label>
                <input
                  type="datetime-local"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="input focus:ring-green-500/50 focus:border-green-500/50"
                />
              </div>
            </div>
            <div>
              <label className="label">নোট (ঐচ্ছিক)</label>
              <textarea
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="input focus:ring-green-500/50 focus:border-green-500/50 min-h-[80px] resize-none"
                placeholder="যেমন: আংশিক পরিশোধ"
                rows={3}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Increase Amount Modal */}
      {showIncreaseModal && (
        <Modal
          isOpen={!!showIncreaseModal}
          onClose={handleCloseIncreaseModal}
          title="ধারের পরিমাণ বৃদ্ধি করুন"
          footerActions={
            <div className="flex justify-end space-x-3">
              <ActionButton
                onClick={handleCloseIncreaseModal}
                variant="secondary"
              >
                বাতিল
              </ActionButton>
              <ActionButton
                onClick={() => handleIncreaseDebtAmount(showIncreaseModal)}
                variant="primary"
              >
                সংরক্ষণ করুন
              </ActionButton>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">বৃদ্ধির পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={increaseAmount}
                  onChange={(e) => {
                    const value = e.target.value
                    if (/^\d*\.?\d*$/.test(value)) {
                      setIncreaseAmount(value)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', '.', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault()
                    const paste = e.clipboardData.getData('text')
                    if (/^\d*\.?\d*$/.test(paste)) {
                      setIncreaseAmount(paste)
                    }
                  }}
                  className="input focus:ring-purple-500/50 focus:border-purple-500/50"
                  placeholder="০"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">তারিখ</label>
                <input
                  type="datetime-local"
                  value={increaseDate}
                  onChange={(e) => setIncreaseDate(e.target.value)}
                  className="input focus:ring-purple-500/50 focus:border-purple-500/50"
                />
              </div>
            </div>
            <div>
              <label className="label">কারণ (ঐচ্ছিক)</label>
              <textarea
                value={increaseReason}
                onChange={(e) => setIncreaseReason(e.target.value)}
                className="input focus:ring-purple-500/50 focus:border-purple-500/50 min-h-[80px] resize-none"
                placeholder="যেমন: অতিরিক্ত প্রয়োজন"
                rows={3}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

