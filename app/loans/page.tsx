'use client'

import { useEffect, useState } from 'react'
import { getLoans, saveLoan, updateLoan, deleteLoan, addLoanPayment, deleteLoanPayment, addLoanIncrease, deleteLoanIncrease } from '@/lib/storage'
import type { Loan, Payment, AmountIncrease } from '@/lib/types'
import { format } from 'date-fns'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'
import Modal, { ActionButton } from '@/components/Modal'

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [showForm, setShowForm] = useState(false)
  const [personName, setPersonName] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState('')
  const [mounted, setMounted] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [editPersonName, setEditPersonName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editingPayment, setEditingPayment] = useState<{loanId: string, payment: Payment} | null>(null)
  const [editPaymentAmount, setEditPaymentAmount] = useState('')
  const [editPaymentDate, setEditPaymentDate] = useState('')
  const [editPaymentNote, setEditPaymentNote] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null)
  const [showIncreaseModal, setShowIncreaseModal] = useState<string | null>(null)
  const [increaseAmount, setIncreaseAmount] = useState('')
  const [increaseDate, setIncreaseDate] = useState('')
  const [increaseReason, setIncreaseReason] = useState('')

  useEffect(() => {
    setMounted(true)
    loadLoans()
    // Set default date after mount
    setDate(new Date().toISOString().slice(0, 16))
    setPaymentDate(new Date().toISOString().slice(0, 16))
    setIncreaseDate(new Date().toISOString().slice(0, 16))
  }, [])

  const loadLoans = () => {
    setLoans(getLoans())
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!personName || !amount) {
      toast.error('নাম এবং পরিমাণ দিন')
      return
    }

    const loan: Loan = {
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

    saveLoan(loan)
    setPersonName('')
    setAmount('')
    setReason('')
    setDate(new Date().toISOString().slice(0, 16))
    setShowForm(false)
    loadLoans()
    toast.success('ধার সফলভাবে যোগ করা হয়েছে')
  }

  const handleToggleReturned = (loan: Loan) => {
    const newStatus = !loan.returned
    const actionText = newStatus ? 'ফেরত দিয়েছেন' : 'ফেরত দেননি'
    const confirmText = newStatus ? 'ফেরত দিয়েছি' : 'ফেরত দেইনি'
    
    confirm.custom(
      'ধারের অবস্থা পরিবর্তন করুন',
      `${loan.personName} এর ${loan.amount} টাকার ধার ${actionText} হিসেবে চিহ্নিত করবেন?`,
      () => {
        if (newStatus) {
          // When marking as returned, ensure payment amount equals total amount
          const totalPaid = getTotalPaid(loan)
          if (totalPaid < loan.amount) {
            // Add remaining payment to make it fully paid
            const remainingAmount = loan.amount - totalPaid
            const remainingPayment: Payment = {
              id: Date.now().toString(),
              amount: remainingAmount,
              date: new Date().toISOString().slice(0, 16),
              note: 'সম্পূর্ণ পরিশোধ',
              createdAt: new Date().toISOString(),
            }
            addLoanPayment(loan.id, remainingPayment)
          }
        }
        updateLoan(loan.id, { returned: newStatus })
        loadLoans()
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
    const loan = loans.find(l => l.id === id)
    if (!loan) return
    
    confirm.delete(
      'ধার মুছুন',
      `${loan.personName} এর ${loan.amount} টাকার ধার মুছে ফেলবেন?`,
      () => {
        deleteLoan(id)
        loadLoans()
        toast.success('ধার সফলভাবে মুছে ফেলা হয়েছে')
      }
    )
  }

  const handleAddPayment = (loanId: string) => {
    if (!paymentAmount || !paymentDate) {
      toast.error('পরিমাণ এবং তারিখ প্রয়োজন')
      return
    }

    const amount = Number(parseFloat(paymentAmount).toFixed(2))
    if (isNaN(amount) || amount <= 0) {
      toast.error('সঠিক পরিমাণ দিন')
      return
    }

    const loan = loans.find(l => l.id === loanId)
    if (!loan) return

    const remaining = calculateRemaining(loan)
    
    if (amount > remaining) {
      toast.error(`বাকি পরিমাণ: ৳${remaining}. তার চেয়ে বেশি পরিশোধ করা যাবে না।`)
      return
    }

    const payment: Payment = {
      id: Date.now().toString(),
      amount,
      date: paymentDate,
      note: paymentNote || undefined,
      createdAt: new Date().toISOString(),
    }

    addLoanPayment(loanId, payment)
    setPaymentAmount('')
    setPaymentDate(new Date().toISOString().slice(0, 16))
    setPaymentNote('')
    setShowPaymentForm(null)
    setShowPaymentModal(null)
    loadLoans()
    toast.success('পেমেন্ট সফলভাবে যোগ করা হয়েছে')
  }

  const handleIncreaseLoanAmount = (loanId: string) => {
    if (!increaseAmount || !increaseDate) {
      toast.error('পরিমাণ এবং তারিখ প্রয়োজন')
      return
    }

    const amount = Number(parseFloat(increaseAmount).toFixed(2))
    if (isNaN(amount) || amount <= 0) {
      toast.error('সঠিক পরিমাণ দিন')
      return
    }

    const loan = loans.find(l => l.id === loanId)
    if (!loan) return

    const newTotalAmount = loan.amount + amount

    confirm.update(
      'ধারের পরিমাণ বৃদ্ধি করুন',
      `${loan.personName} এর ধারের পরিমাণ ৳${loan.amount} থেকে ৳${newTotalAmount} বৃদ্ধি করবেন?`,
      () => {
        // Add increase to history
        const increase: AmountIncrease = {
          id: Date.now().toString(),
          amount,
          date: increaseDate,
          reason: increaseReason || undefined,
          createdAt: new Date().toISOString(),
        }
        
        addLoanIncrease(loanId, increase)
        
        // Update loan amount
        updateLoan(loanId, { 
          amount: newTotalAmount,
          reason: increaseReason ? `${loan.reason || ''} + ${increaseReason}`.trim() : loan.reason
        })
        
        toast.success('ধারের পরিমাণ বৃদ্ধি করা হয়েছে')
        handleCloseIncreaseModal()
        loadLoans()
      }
    )
  }

  const handleOpenPaymentModal = (loanId: string) => {
    setShowPaymentModal(loanId)
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

  const handleOpenIncreaseModal = (loanId: string) => {
    setShowIncreaseModal(loanId)
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

  const handleDeletePayment = (loanId: string, paymentId: string) => {
    const loan = loans.find(l => l.id === loanId)
    const payment = loan?.payments?.find(p => p.id === paymentId)
    if (!loan || !payment) return
    
    confirm.delete(
      'পেমেন্ট মুছুন',
      `${payment.amount} টাকার পেমেন্ট মুছে ফেলবেন?`,
      () => {
        deleteLoanPayment(loanId, paymentId)
        loadLoans()
        toast.success('পেমেন্ট সফলভাবে মুছে ফেলা হয়েছে')
      }
    )
  }

  const handleDeleteIncrease = (loanId: string, increaseId: string) => {
    const loan = loans.find(l => l.id === loanId)
    const increase = loan?.increases?.find(i => i.id === increaseId)
    if (!loan || !increase) return

    const newTotalAmount = loan.amount - increase.amount

    confirm.delete(
      'পরিমাণ বৃদ্ধি মুছুন',
      `${increase.amount} টাকার পরিমাণ বৃদ্ধি মুছে ফেলবেন? ধারের পরিমাণ ৳${loan.amount} থেকে ৳${newTotalAmount} হবে।`,
      () => {
        // Update loan amount first
        updateLoan(loanId, { 
          amount: newTotalAmount,
          reason: loan.reason
        })
        
        // Then delete the increase record
        deleteLoanIncrease(loanId, increaseId)
        loadLoans()
        toast.success('পরিমাণ বৃদ্ধি সফলভাবে মুছে ফেলা হয়েছে')
      }
    )
  }


  const calculateRemaining = (loan: Loan): number => {
    if (!loan.payments || loan.payments.length === 0) {
      return loan.amount
    }
    const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0)
    return loan.amount - totalPaid
  }

  const getTotalPaid = (loan: Loan): number => {
    if (!loan.payments || loan.payments.length === 0) {
      return 0
    }
    return loan.payments.reduce((sum, p) => sum + p.amount, 0)
  }


  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan)
    setEditPersonName(loan.personName)
    setEditAmount(loan.amount.toString())
    setEditReason(loan.reason || '')
    setEditDate(loan.date)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingLoan || !editPersonName || !editAmount) {
      toast.error('নাম এবং পরিমাণ দিন')
      return
    }

    const newAmount = parseFloat(editAmount)
    if (isNaN(newAmount) || newAmount <= 0) {
      toast.error('সঠিক পরিমাণ দিন')
      return
    }

    // Check if new amount is less than total paid amount
    const totalPaid = getTotalPaid(editingLoan)
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
        
        updateLoan(editingLoan.id, {
          personName: editPersonName,
          amount: newAmount,
          reason: editReason,
          date: editDate,
          returned: shouldBeReturned,
        })

        setEditingLoan(null)
        setEditPersonName('')
        setEditAmount('')
        setEditReason('')
        setEditDate('')
        loadLoans()
        toast.success('ধার সফলভাবে আপডেট করা হয়েছে')
      }
    )
  }

  const handleCancelEdit = () => {
    setEditingLoan(null)
    setEditPersonName('')
    setEditAmount('')
    setEditReason('')
    setEditDate('')
  }

  const handleEditPayment = (loanId: string, payment: Payment) => {
    setEditingPayment({ loanId, payment })
    setEditPaymentAmount(payment.amount.toString())
    setEditPaymentDate(payment.date)
    setEditPaymentNote(payment.note || '')
  }

  const handleEditPaymentSubmit = (e: React.FormEvent) => {
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

    const loan = loans.find(l => l.id === editingPayment.loanId)
    if (!loan) return

    // Calculate remaining amount excluding the current payment being edited
    const otherPayments = loan.payments?.filter(p => p.id !== editingPayment.payment.id) || []
    const otherPaymentsTotal = otherPayments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = loan.amount - otherPaymentsTotal
    
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
        deleteLoanPayment(editingPayment.loanId, editingPayment.payment.id)
        addLoanPayment(editingPayment.loanId, updatedPayment)

        setEditingPayment(null)
        setEditPaymentAmount('')
        setEditPaymentDate('')
        setEditPaymentNote('')
        loadLoans()
        toast.success('পেমেন্ট সফলভাবে আপডেট করা হয়েছে')
      }
    )
  }

  const handleCancelPaymentEdit = () => {
    setEditingPayment(null)
    setEditPaymentAmount('')
    setEditPaymentDate('')
    setEditPaymentNote('')
  }

  if (!mounted) {
    return null
  }

  const activeLoans = loans.filter(l => !l.returned)
  const returnedLoans = loans.filter(l => l.returned)
  
  // Calculate remaining amounts after payments
  const totalActive = activeLoans.reduce((sum, l) => {
    const totalPaid = l.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0
    const remaining = l.amount - totalPaid
    return sum + Math.max(0, remaining)
  }, 0)
  
  const totalReturned = returnedLoans.reduce((sum, l) => {
    const totalPaid = l.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0
    return sum + totalPaid
  }, 0)

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-red-50 to-rose-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-400/20 to-rose-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-rose-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12 fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-xl mb-4 sm:mb-6 float-gentle">
            <span className="text-2xl sm:text-3xl">💸</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-red-800 to-rose-800 bg-clip-text text-transparent mb-3 sm:mb-4 float-gentle">
            ধার নিয়েছি
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 slide-up max-w-md mx-auto leading-relaxed px-4">
            আপনি যাদের থেকে টাকা ধার নিয়েছেন
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 stagger-item">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">ফেরত দিতে হবে</p>
                <p className="text-2xl font-bold text-red-600">৳{totalActive}</p>
                <p className="text-xs text-gray-500">বাকি ঋণ</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <span className="text-2xl">💸</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 stagger-item">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">ফেরত দিয়েছি</p>
                <p className="text-2xl font-bold text-purple-600">৳{totalReturned}</p>
                <p className="text-xs text-gray-500">মোট ফেরত</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Add Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowForm(!showForm)}
            className="group relative overflow-hidden bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 rounded-2xl px-8 py-4 shadow-2xl hover:shadow-red-500/25 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:-translate-y-1"
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

        {/* Add Loan Modal */}
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="নতুন ধার যোগ করুন"
          className="border-red-200"
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
                className="input focus:ring-red-500/50 focus:border-red-500/50"
                placeholder="যেমন: রহিম"
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
                className="input focus:ring-red-500/50 focus:border-red-500/50"
                placeholder="০"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="label">কারণ (ঐচ্ছিক)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input focus:ring-red-500/50 focus:border-red-500/50"
                placeholder="যেমন: জরুরি খরচ"
              />
            </div>
            <div>
              <label className="label">তারিখ *</label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input focus:ring-red-500/50 focus:border-red-500/50"
                required
              />
            </div>
          </form>
        </Modal>

        {/* Edit Loan Modal */}
        <Modal
          isOpen={editingLoan !== null}
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
                className="input focus:ring-red-500/50 focus:border-red-500/50"
                placeholder="যেমন: রহিম"
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
                className="input focus:ring-red-500/50 focus:border-red-500/50"
                placeholder="০"
                min={editingLoan ? getTotalPaid(editingLoan) : 0}
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="label">কারণ (ঐচ্ছিক)</label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="input focus:ring-red-500/50 focus:border-red-500/50"
                placeholder="যেমন: জরুরি খরচ"
              />
            </div>
            <div>
              <label className="label">তারিখ *</label>
              <input
                type="datetime-local"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="input focus:ring-red-500/50 focus:border-red-500/50"
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
                className="input focus:ring-red-500/50 focus:border-red-500/50"
                placeholder="০"
                min="0"
                max={editingPayment ? (() => {
                  const loan = loans.find(l => l.id === editingPayment.loanId)
                  if (!loan) return 0
                  const otherPayments = loan.payments?.filter(p => p.id !== editingPayment.payment.id) || []
                  const otherPaymentsTotal = otherPayments.reduce((sum, p) => sum + p.amount, 0)
                  return loan.amount - otherPaymentsTotal
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
                className="input focus:ring-red-500/50 focus:border-red-500/50"
                required
              />
            </div>
            <div>
              <label className="label">নোট (ঐচ্ছিক)</label>
              <input
                type="text"
                value={editPaymentNote}
                onChange={(e) => setEditPaymentNote(e.target.value)}
                className="input focus:ring-red-500/50 focus:border-red-500/50"
                placeholder="যেমন: আংশিক পরিশোধ"
              />
            </div>
          </form>
        </Modal>

        <div className="space-y-8">
          {activeLoans.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600">💸</span>
                </div>
                ফেরত দিতে হবে
              </h2>
              <div className="grid gap-6">
                {activeLoans.map((loan) => {
                  const remaining = calculateRemaining(loan)
                  const totalPaid = getTotalPaid(loan)
                  return (
                    <div key={loan.id} className="space-y-6">
                      {/* Main Loan Card */}
                      <div className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg border border-orange-200 hover:shadow-xl transition-all duration-300">
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                                <span className="text-white text-xl">👤</span>
                              </div>
                              <div>
                                <h3 className="font-bold text-xl text-gray-900 mb-1">
                                  {loan.personName}
                                </h3>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(loan)}
                                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all duration-200 hover:scale-110"
                                title="সম্পাদনা করুন"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleToggleReturned(loan)}
                                className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all duration-200 hover:scale-110"
                                title="ফেরত দিয়েছি"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => handleDelete(loan.id)}
                                className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all duration-200 hover:scale-110"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center p-3 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl border border-orange-300">
                              <div className="text-xs text-orange-700 mb-2 font-medium">মোট</div>
                              <div className="text-lg sm:text-xl font-bold text-orange-800">৳{loan.amount}</div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                              <div className="text-xs text-gray-500 mb-2 font-medium">পরিশোধিত</div>
                              <div className="text-lg sm:text-xl font-bold text-blue-600">৳{totalPaid}</div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                              <div className="text-xs text-red-700 mb-2 font-medium">বাকি</div>
                              <div className="text-lg sm:text-xl font-bold text-red-600">৳{remaining}</div>
                            </div>
                          </div>
                          
                          
                          <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                            📅 {format(new Date(loan.date), 'PPP p')}
                          </div>
                        </div>

                        {/* Payment History - Inside main card */}
                        {loan.payments && loan.payments.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-4 px-6">
                              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 text-sm">📋</span>
                              </div>
                              <h4 className="text-sm font-semibold text-gray-700">পরিশোধের ইতিহাস</h4>
                            </div>
                            <div className="space-y-3 px-6 pb-4">
                              {loan.payments.map((payment) => (
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
                                      onClick={() => handleEditPayment(loan.id, payment)}
                                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg text-xs transition-all duration-200 hover:scale-110"
                                      title="সম্পাদনা করুন"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleDeletePayment(loan.id, payment.id)}
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
                        {loan.increases && loan.increases.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-4 px-6">
                              <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-purple-600 text-sm">➕</span>
                              </div>
                              <h4 className="text-sm font-semibold text-gray-700">পরিমাণ বৃদ্ধির ইতিহাস</h4>
                            </div>
                            <div className="space-y-3 px-6 pb-4">
                              {loan.increases.map((increase) => (
                                <div key={increase.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-sm font-bold">➕</span>
                                    </div>
                                    <div>
                                      <div className="font-bold text-purple-700">বৃদ্ধির পরিমাণ (৳): ৳{increase.amount}</div>
                                      <div className="text-xs text-gray-600">{format(new Date(increase.date), 'PP p')}</div>
                                      {increase.reason && (
                                        <div className="text-xs text-gray-500 italic mt-1">কারণ (ঐচ্ছিক): {increase.reason}</div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleDeleteIncrease(loan.id, increase.id)}
                                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs transition-all duration-200 hover:scale-110"
                                      title="মুছে ফেলুন"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add Payment Button/Form - Inside main card */}
                        {remaining > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            {showPaymentForm === loan.id ? (
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
                                    className="input input-sm focus:ring-red-500/50 focus:border-red-500/50"
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
                                    className="input input-sm focus:ring-red-500/50 focus:border-red-500/50"
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
                                  onClick={() => handleAddPayment(loan.id)}
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
                                  onClick={() => handleOpenPaymentModal(loan.id)}
                                  className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl px-4 py-3 w-full shadow-lg hover:shadow-green-500/25 transition-all duration-300 cursor-pointer"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  <div className="relative z-10 flex items-center justify-center gap-2 text-white font-semibold text-sm">
                                    <span className="text-lg">💵</span>
                                    পেমেন্ট যোগ করুন
                                  </div>
                                </button>
                                <button
                                  onClick={() => handleOpenIncreaseModal(loan.id)}
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

          {returnedLoans.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">ফেরত দিয়েছি</h2>
              <div className="space-y-4">
                {returnedLoans.map((loan) => {
                  const totalPaid = getTotalPaid(loan)
                  return (
                    <div key={loan.id} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border border-blue-200 overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                              <span className="text-white text-xl">✅</span>
                            </div>
                            <div>
                              <h3 className="font-bold text-xl text-gray-900 mb-1">
                                {loan.personName}
                              </h3>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(loan)}
                              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all duration-200 hover:scale-110"
                              title="সম্পাদনা করুন"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleToggleReturned(loan)}
                              className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-all duration-200 hover:scale-110"
                              title="ফেরত দেইনি"
                            >
                              ↺
                            </button>
                            <button
                              onClick={() => handleDelete(loan.id)}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all duration-200 hover:scale-110"
                              title="মুছে ফেলুন"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center p-4 bg-blue-100 rounded-xl border border-blue-200">
                            <div className="text-xs text-blue-700 mb-2 font-medium">মূল পরিমাণ</div>
                            <div className="text-lg sm:text-xl font-bold text-blue-800">৳{loan.amount}</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                            <div className="text-xs text-green-700 mb-2 font-medium">পরিশোধিত</div>
                            <div className="text-lg sm:text-xl font-bold text-green-600">৳{totalPaid}</div>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                          📅 {format(new Date(loan.date), 'PPP p')}
                        </div>

                        {/* Payment History */}
                        {loan.payments && loan.payments.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 text-sm">📋</span>
                              </div>
                              <h4 className="text-sm font-semibold text-gray-700">পরিশোধের ইতিহাস</h4>
                            </div>
                            <div className="space-y-3">
                              {loan.payments.map((payment) => (
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
                                      onClick={() => handleEditPayment(loan.id, payment)}
                                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg text-xs transition-all duration-200 hover:scale-110"
                                      title="সম্পাদনা করুন"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleDeletePayment(loan.id, payment.id)}
                                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs transition-all duration-200 hover:scale-110"
                                      title="মুছে ফেলুন"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Amount Increase History */}
                        {loan.increases && loan.increases.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-purple-600 text-sm">➕</span>
                              </div>
                              <h4 className="text-sm font-semibold text-gray-700">পরিমাণ বৃদ্ধির ইতিহাস</h4>
                            </div>
                            <div className="space-y-3">
                              {loan.increases.map((increase) => (
                                <div key={increase.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-sm font-bold">➕</span>
                                    </div>
                                    <div>
                                      <div className="font-bold text-purple-700">বৃদ্ধির পরিমাণ (৳): ৳{increase.amount}</div>
                                      <div className="text-xs text-gray-600">{format(new Date(increase.date), 'PP p')}</div>
                                      {increase.reason && (
                                        <div className="text-xs text-gray-500 italic mt-1">কারণ (ঐচ্ছিক): {increase.reason}</div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleDeleteIncrease(loan.id, increase.id)}
                                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs transition-all duration-200 hover:scale-110"
                                      title="মুছে ফেলুন"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              ))}
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

          {loans.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6">
                <span className="text-4xl text-gray-400">💸</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">কোনো ঋণ নেই</h3>
              <p className="text-gray-500 mb-6">এখনো কাউকে থেকে টাকা ধার নেননি</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-br from-red-500 to-rose-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <span>➕</span>
                প্রথম ঋণ যোগ করুন
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
                  className="input focus:ring-red-500/50 focus:border-red-500/50"
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
                  className="input focus:ring-red-500/50 focus:border-red-500/50"
                />
              </div>
            </div>
            <div>
              <label className="label">নোট (ঐচ্ছিক)</label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="input focus:ring-red-500/50 focus:border-red-500/50"
                placeholder="যেমন: আংশিক পরিশোধ"
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
                onClick={() => handleIncreaseLoanAmount(showIncreaseModal)}
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
              <input
                type="text"
                value={increaseReason}
                onChange={(e) => setIncreaseReason(e.target.value)}
                className="input focus:ring-purple-500/50 focus:border-purple-500/50"
                placeholder="যেমন: অতিরিক্ত প্রয়োজন"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

