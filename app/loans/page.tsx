'use client'

import { useEffect, useState } from 'react'
import { getLoans, saveLoan, updateLoan, deleteLoan, addLoanPayment, deleteLoanPayment } from '@/lib/storage'
import type { Loan, Payment } from '@/lib/types'
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

  useEffect(() => {
    setMounted(true)
    loadLoans()
    // Set default date after mount
    setDate(new Date().toISOString().slice(0, 16))
    setPaymentDate(new Date().toISOString().slice(0, 16))
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
    loadLoans()
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
    <div className="min-h-full bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex items-center justify-between mb-6 fade-in">
          <h1 className="text-2xl font-bold text-gray-900 slide-up">💸 ধার নিয়েছি</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary flex items-center gap-2 scale-in"
          >
            <span className="text-lg">{showForm ? '✕' : '+'}</span>
            {showForm ? 'বাতিল' : 'নতুন ধার'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg stagger-item">
            <div className="text-sm mb-1 opacity-90">ফেরত দিতে হবে</div>
            <div className="text-3xl font-bold">৳{totalActive}</div>
          </div>
          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg stagger-item">
            <div className="text-sm mb-1 opacity-90">ফেরত দিয়েছি</div>
            <div className="text-3xl font-bold">৳{totalReturned}</div>
          </div>
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
                বাতিল করুন
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
                className="input"
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
                className="input"
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
                className="input"
                placeholder="যেমন: জরুরি খরচ"
              />
            </div>
            <div>
              <label className="label">তারিখ *</label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
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
                className="input"
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
                className="input"
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
                className="input"
                placeholder="যেমন: জরুরি খরচ"
              />
            </div>
            <div>
              <label className="label">তারিখ *</label>
              <input
                type="datetime-local"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="input"
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
                className="input"
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
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">নোট (ঐচ্ছিক)</label>
              <input
                type="text"
                value={editPaymentNote}
                onChange={(e) => setEditPaymentNote(e.target.value)}
                className="input"
                placeholder="যেমন: আংশিক পরিশোধ"
              />
            </div>
          </form>
        </Modal>

        <div className="space-y-6">
          {activeLoans.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">ফেরত দিতে হবে</h2>
              <div className="space-y-3">
                {activeLoans.map((loan) => {
                  const remaining = calculateRemaining(loan)
                  const totalPaid = getTotalPaid(loan)
                  return (
                    <div key={loan.id} className="card">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 mb-1">
                            {loan.personName}
                          </h3>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div>
                              <div className="text-xs text-gray-500">মোট</div>
                              <div className="text-lg font-bold text-gray-900">৳{loan.amount}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">পরিশোধিত</div>
                              <div className="text-lg font-bold text-blue-600">৳{totalPaid}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">বাকি</div>
                              <div className="text-lg font-bold text-red-600">৳{remaining}</div>
                            </div>
                          </div>
                          {loan.reason && (
                            <p className="text-gray-600 text-sm mb-2">📝 {loan.reason}</p>
                          )}
                          <div className="text-sm text-gray-500">
                            📅 {format(new Date(loan.date), 'PPP p')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(loan)}
                            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors duration-200 shadow-sm hover:shadow-md"
                            title="সম্পাদনা করুন"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleReturned(loan)}
                            className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors duration-200 shadow-sm hover:shadow-md"
                            title="ফেরত দিয়েছি"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleDelete(loan.id)}
                            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors duration-200 shadow-sm hover:shadow-md"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Payment History */}
                      {loan.payments && loan.payments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">পরিশোধের ইতিহাস:</h4>
                          <div className="space-y-1">
                            {loan.payments.map((payment) => (
                              <div key={payment.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-blue-600">৳{payment.amount}</span>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-gray-600">{format(new Date(payment.date), 'PP p')}</span>
                                  {payment.note && (
                                    <>
                                      <span className="text-gray-500">•</span>
                                      <span className="text-gray-500 italic">{payment.note}</span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditPayment(loan.id, payment)}
                                    className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded text-xs transition-colors duration-200"
                                    title="সম্পাদনা করুন"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeletePayment(loan.id, payment.id)}
                                    className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded text-xs transition-colors duration-200"
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

                      {/* Add Payment Button/Form */}
                      {remaining > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          {showPaymentForm === loan.id ? (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-gray-700">পেমেন্ট যোগ করুন:</h4>
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
                                    className="input text-sm"
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
                                    className="input text-sm"
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
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAddPayment(loan.id)}
                                  className="btn btn-primary text-xs flex-1"
                                >
                                  সংরক্ষণ করুন
                                </button>
                                <button
                                  onClick={() => setShowPaymentForm(null)}
                                  className="btn btn-secondary text-xs"
                                >
                                  বাতিল
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowPaymentForm(loan.id)}
                              className="btn btn-primary text-xs w-full"
                            >
                              💵 পেমেন্ট যোগ করুন
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {returnedLoans.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">ফেরত দিয়েছি</h2>
              <div className="space-y-3">
                {returnedLoans.map((loan) => {
                  const totalPaid = getTotalPaid(loan)
                  return (
                    <div key={loan.id} className="card bg-gray-100">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-700 mb-1">
                            {loan.personName}
                          </h3>
                          <div className="text-xl font-bold text-gray-600 mb-2">
                            ৳{loan.amount}
                            {totalPaid > 0 && (
                              <span className="text-sm text-blue-500 ml-2">(পরিশোধিত: ৳{totalPaid})</span>
                            )}
                          </div>
                          {loan.reason && (
                            <p className="text-gray-500 text-sm mb-2">📝 {loan.reason}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(loan)}
                            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors duration-200 shadow-sm hover:shadow-md"
                            title="সম্পাদনা করুন"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleReturned(loan)}
                            className="px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md transition-colors duration-200 shadow-sm hover:shadow-md"
                            title="ফেরত দেইনি"
                          >
                            ↺
                          </button>
                          <button
                            onClick={() => handleDelete(loan.id)}
                            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors duration-200 shadow-sm hover:shadow-md"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Payment History */}
                      {loan.payments && loan.payments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">পরিশোধের ইতিহাস:</h4>
                          <div className="space-y-1">
                            {loan.payments.map((payment) => (
                              <div key={payment.id} className="flex items-center justify-between text-sm bg-gray-200 p-2 rounded">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-blue-600">৳{payment.amount}</span>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-gray-600">{format(new Date(payment.date), 'PP p')}</span>
                                  {payment.note && (
                                    <>
                                      <span className="text-gray-500">•</span>
                                      <span className="text-gray-500 italic">{payment.note}</span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditPayment(loan.id, payment)}
                                    className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded text-xs transition-colors duration-200"
                                    title="সম্পাদনা করুন"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeletePayment(loan.id, payment.id)}
                                    className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded text-xs transition-colors duration-200"
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
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {loans.length === 0 && (
            <div className="card text-center py-12 bg-white">
              <p className="text-gray-500 text-lg mb-2">কোনো রেকর্ড নেই</p>
              <p className="text-gray-400 text-sm">উপরের &quot;+ নতুন&quot; বাটনে ক্লিক করে যোগ করুন</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

