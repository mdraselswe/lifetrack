'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { getDebts, saveDebt, updateDebt, deleteDebt, addDebtPayment, deleteDebtPayment, addDebtIncrease, deleteDebtIncrease, subscribeToDebts } from '@/lib/storage'
import type { Debt, Payment, AmountIncrease } from '@/lib/types'
import { round2, toBnDigits } from '@/lib/format'
import { format } from 'date-fns'
import { bn as bnLocale } from 'date-fns/locale'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'
import Modal, { ActionButton } from '@/components/Modal'
import { useAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'
import { ListSkeleton } from '@/components/SkeletonLoader'
import AppBar from '@/components/AppBar'
import { ArrowUpRightIcon, WalletIcon, PlusIcon, EditIcon, TrashIcon, CheckIcon, RotateIcon } from '@/components/Icons'

const bn = (n: number) => n.toLocaleString('bn-BD')
const bnDate = (v: string) => toBnDigits(format(new Date(v), 'MMMM d, yyyy', { locale: bnLocale }))

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [showForm, setShowForm] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
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
    setMounted(true)
    // Set default date after mount
    setDate(new Date().toISOString().slice(0, 16))
    setPaymentDate(new Date().toISOString().slice(0, 16))
    setIncreaseDate(new Date().toISOString().slice(0, 16))
  }, [])

  // Realtime sync across all devices
  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    setDataLoading(true)
    const unsubscribe = subscribeToDebts(user.uid, (data) => {
      setDebts(data)
      setDataLoading(false)
    })
    return () => unsubscribe()
  }, [user, loading, router])

  const loadDebts = async () => {
    try {
      setDataLoading(true)
      const debts = await getDebts()
      setDebts(debts)
    } catch (error) {
      console.error('Error loading debts:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (!personName || !amount) {
      toast.error('নাম এবং পরিমাণ দিন')
      return
    }

    const debt: Debt = {
      id: '', // Will be set by Firebase
      personName,
      amount: parseFloat(amount),
      reason,
      date,
      returned: false,
      createdAt: new Date().toISOString(),
      payments: [],
      increases: [],
    }

    saveDebt(debt).then(() => {
      setPersonName('')
      setAmount('')
      setReason('')
      setDate(new Date().toISOString().slice(0, 16))
      setShowForm(false)
      loadDebts().catch(console.error)
      toast.success('ধার সফলভাবে যোগ করা হয়েছে')
    }).catch((error) => {
      console.error('Error saving debt:', error)
      toast.error('ধার যোগ করতে সমস্যা হয়েছে')
    })
  }

  const handleToggleReturned = (debt: Debt) => {
    const newStatus = !debt.returned
    const actionText = newStatus ? 'ফেরত পেয়েছেন' : 'ফেরত পাননি'
    const confirmText = newStatus ? 'ফেরত পেয়েছি' : 'ফেরত পাইনি'
    
    // Calculate total amount including increments
    const totalAmount = round2(debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))
    
    confirm.custom(
      'ধারের অবস্থা পরিবর্তন করুন',
      `${debt.personName} এর ${totalAmount} টাকার ধার ${actionText} হিসেবে চিহ্নিত করবেন?`,
      () => {
        if (newStatus) {
          // When marking as returned, ensure payment amount equals total amount
          const totalPaid = getTotalPaid(debt)
          if (totalPaid < totalAmount) {
            // Add remaining payment to make it fully paid
            const remainingAmount = round2(totalAmount - totalPaid)
            const remainingPayment: Payment = {
              id: crypto.randomUUID(),
              amount: remainingAmount,
              date: new Date().toISOString().slice(0, 16),
              note: 'সম্পূর্ণ পরিশোধ',
              createdAt: new Date().toISOString(),
            }
            addDebtPayment(debt.id, remainingPayment)
          }
        }
        updateDebt(debt.id, { returned: newStatus }).then(() => {
          loadDebts().catch(console.error)
          toast.success(`ধার ${actionText} হিসেবে চিহ্নিত করা হয়েছে`)
        }).catch((error) => {
          console.error('Error updating debt status:', error)
          toast.error('ধারের অবস্থা পরিবর্তন করতে সমস্যা হয়েছে')
        })
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
        deleteDebt(id).then(() => {
          loadDebts().catch(console.error)
          toast.success('ধার সফলভাবে মুছে ফেলা হয়েছে')
        }).catch((error) => {
          console.error('Error deleting debt:', error)
          toast.error('ধার মুছতে সমস্যা হয়েছে')
        })
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
      id: crypto.randomUUID(),
      amount,
      date: paymentDate,
      note: paymentNote,
      createdAt: new Date().toISOString(),
    }

    addDebtPayment(debtId, payment).then(() => {
      setPaymentAmount('')
      setPaymentDate(new Date().toISOString().slice(0, 16))
      setPaymentNote('')
      setShowPaymentForm(null)
      setShowPaymentModal(null)
      loadDebts().catch(console.error)
      toast.success('পেমেন্ট সফলভাবে যোগ করা হয়েছে')
    }).catch((error) => {
      console.error('Error adding payment:', error)
      toast.error('পেমেন্ট যোগ করতে সমস্যা হয়েছে')
    })
  }

  const handleOpenPaymentModal = (debtId: string) => {
    const debt = debts.find(d => d.id === debtId)
    setShowPaymentModal(debtId)
    // Default to the full remaining amount → one tap = full return; edit down for partial
    setPaymentAmount(debt ? String(calculateRemaining(debt)) : '')
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
        deleteDebtPayment(debtId, paymentId).then(() => {
          loadDebts().catch(console.error)
          toast.success('পেমেন্ট সফলভাবে মুছে ফেলা হয়েছে')
        }).catch((error) => {
          console.error('Error deleting payment:', error)
          toast.error('পেমেন্ট মুছতে সমস্যা হয়েছে')
        })
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
    const currentTotalAmount = round2(debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))
    const newTotalAmount = round2(currentTotalAmount + amount)

    confirm.update(
      'ধারের পরিমাণ বৃদ্ধি করুন',
      `${debt.personName} এর ধারের পরিমাণ ৳${currentTotalAmount} থেকে ৳${newTotalAmount} বৃদ্ধি করবেন?`,
      () => {
        // Add increase to history
        const increase: AmountIncrease = {
          id: crypto.randomUUID(),
          amount,
          date: increaseDate,
          ...(increaseReason && { reason: increaseReason }),
          createdAt: new Date().toISOString(),
        }
        
        addDebtIncrease(debtId, increase).then(() => {
          toast.success('ধারের পরিমাণ বৃদ্ধি করা হয়েছে')
          handleCloseIncreaseModal()
          loadDebts().catch(console.error)
        }).catch((error) => {
          console.error('Error increasing debt amount:', error)
          toast.error('ধারের পরিমাণ বৃদ্ধি করতে সমস্যা হয়েছে')
        })
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
    const currentTotalAmount = round2(debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))
    const newTotalAmount = round2(currentTotalAmount - increase.amount)

    confirm.delete(
      'পরিমাণ বৃদ্ধি মুছুন',
      `${increase.amount} টাকার পরিমাণ বৃদ্ধি মুছে ফেলবেন? ধারের পরিমাণ ৳${currentTotalAmount} থেকে ৳${newTotalAmount} হবে।`,
      () => {
        // Don't update debt.amount - it should always remain the initial amount
        // Just delete the increase record
        deleteDebtIncrease(debtId, increaseId).then(() => {
          loadDebts().catch(console.error)
          toast.success('পরিমাণ বৃদ্ধি সফলভাবে মুছে ফেলা হয়েছে')
        }).catch((error) => {
          console.error('Error deleting increase:', error)
          toast.error('পরিমাণ বৃদ্ধি মুছতে সমস্যা হয়েছে')
        })
      }
    )
  }

  const calculateRemaining = (debt: Debt): number => {
    // Calculate total amount including increments
    const totalAmount = round2(debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))

    if (!debt.payments || debt.payments.length === 0) {
      return round2(totalAmount)
    }
    const totalPaid = debt.payments.reduce((sum, p) => sum + p.amount, 0)
    return round2(totalAmount - totalPaid)
  }

  const getTotalPaid = (debt: Debt): number => {
    if (!debt.payments || debt.payments.length === 0) {
      return 0
    }
    return round2(debt.payments.reduce((sum, p) => sum + p.amount, 0))
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
        }).then(() => {
          setEditingDebt(null)
          setEditPersonName('')
          setEditAmount('')
          setEditReason('')
          setEditDate('')
          loadDebts().catch(console.error)
          toast.success('ধার সফলভাবে আপডেট করা হয়েছে')
        }).catch((error) => {
          console.error('Error updating debt:', error)
          toast.error('ধার আপডেট করতে সমস্যা হয়েছে')
        })
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
    const remaining = round2(debt.amount - otherPaymentsTotal)
    
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
        deleteDebtPayment(editingPayment.debtId, editingPayment.payment.id).then(() => {
          return addDebtPayment(editingPayment.debtId, updatedPayment)
        }).then(() => {
          setEditingPayment(null)
          setEditPaymentAmount('')
          setEditPaymentDate('')
          setEditPaymentNote('')
          loadDebts().catch(console.error)
          toast.success('পেমেন্ট সফলভাবে আপডেট করা হয়েছে')
        }).catch((error) => {
          console.error('Error updating payment:', error)
          toast.error('পেমেন্ট আপডেট করতে সমস্যা হয়েছে')
        })
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
        deleteDebtIncrease(editingIncrease.debtId, editingIncrease.increase.id).then(() => {
          return addDebtIncrease(editingIncrease.debtId, updatedIncrease)
        }).then(() => {
          setEditingIncrease(null)
          setEditIncreaseAmount('')
          setEditIncreaseDate('')
          setEditIncreaseReason('')
          loadDebts().catch(console.error)
          toast.success('পরিমাণ বৃদ্ধি সফলভাবে আপডেট করা হয়েছে')
        }).catch((error) => {
          console.error('Error updating increase:', error)
          toast.error('পরিমাণ বৃদ্ধি আপডেট করতে সমস্যা হয়েছে')
        })
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
  const totalActive = round2(activeDebts.reduce((sum, d) => {
    const totalPaid = d.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0
    const totalAmount = d.amount + (d.increases?.reduce((incSum, inc) => incSum + inc.amount, 0) || 0)
    const remaining = totalAmount - totalPaid
    return sum + Math.max(0, remaining)
  }, 0))

  const totalReturned = round2(returnedDebts.reduce((sum, d) => {
    const totalPaid = d.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0
    return sum + totalPaid
  }, 0))


  const numChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (/^\d*\.?\d*$/.test(v)) setter(v)
  }

  return (
    <div className="min-h-full">
      <AppBar title="ধার দিয়েছি" subtitle="আপনার পাওনা" />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-tile tint-pos">
            <div className="flex items-center gap-2 mb-2 text-positive">
              <ArrowUpRightIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-positive">বাকি পাওনা</span>
            </div>
            <p className="text-2xl font-bold text-content">৳{bn(totalActive)}</p>
          </div>
          <div className="stat-tile tint-accent">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <WalletIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-accent">ফেরত পেয়েছি</span>
            </div>
            <p className="text-2xl font-bold text-content">৳{bn(totalReturned)}</p>
          </div>
        </div>

        {dataLoading ? (
          <ListSkeleton count={3} />
        ) : debts.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center text-muted mb-4">
              <WalletIcon className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-content mb-1">কোনো ধার নেই</h3>
            <p className="text-sm text-muted mb-5">এখনো কাউকে টাকা ধার দেননি</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary mx-auto">
              <PlusIcon className="w-5 h-5" /> প্রথম ধার যোগ করুন
            </button>
          </div>
        ) : (
          <>
            {activeDebts.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted px-1">বাকি আছে</h2>
                {activeDebts.map((debt) => {
                  const remaining = calculateRemaining(debt)
                  const totalPaid = getTotalPaid(debt)
                  const total = round2(debt.amount + (debt.increases?.reduce((s, i) => s + i.amount, 0) || 0))
                  const pct = total > 0 ? Math.min(100, Math.round((totalPaid / total) * 100)) : 0
                  return (
                    <div key={debt.id} className="card bar-pos space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-content truncate">{debt.personName}</h3>
                          <p className="text-xs text-muted">{bnDate(debt.date)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button className="icon-btn" onClick={() => handleEdit(debt)} title="সম্পাদনা"><EditIcon className="w-5 h-5" /></button>
                          <button className="icon-btn" onClick={() => handleDelete(debt.id)} title="মুছুন"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div><p className="text-xs text-muted mb-0.5">মোট</p><p className="text-sm font-semibold text-content">৳{bn(total)}</p></div>
                        <div><p className="text-xs text-muted mb-0.5">পরিশোধিত</p><p className="text-sm font-semibold text-positive">৳{bn(totalPaid)}</p></div>
                        <div><p className="text-xs text-muted mb-0.5">বাকি</p><p className="text-sm font-semibold text-negative">৳{bn(remaining)}</p></div>
                      </div>

                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full rounded-full bg-positive transition-all" style={{ width: `${pct}%` }} />
                      </div>

                      {debt.payments && debt.payments.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-positive">পরিশোধের ইতিহাস</p>
                          {debt.payments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between rounded-xl tint-pos px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-positive">৳{bn(p.amount)}</p>
                                <p className="text-xs text-muted truncate">{bnDate(p.date)}{p.note ? ` · ${p.note}` : ''}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button className="icon-btn w-8 h-8" onClick={() => handleEditPayment(debt.id, p)}><EditIcon className="w-4 h-4" /></button>
                                <button className="icon-btn w-8 h-8" onClick={() => handleDeletePayment(debt.id, p.id)}><TrashIcon className="w-4 h-4" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-accent">প্রাথমিক ধার</p>
                        <div className="flex items-center justify-between rounded-xl tint-accent px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-content">৳{bn(getInitialAmount(debt))}</p>
                            <p className="text-xs text-muted truncate">{bnDate(debt.date)}{getInitialReason(debt) ? ` · ${getInitialReason(debt)}` : ''}</p>
                          </div>
                        </div>
                      </div>

                      {debt.increases && debt.increases.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-caution">পরিমাণ বৃদ্ধি</p>
                          {debt.increases.map((inc, idx) => {
                            const runningTotal = round2(debt.amount + (debt.increases ?? []).slice(0, idx + 1).reduce((s, i) => s + i.amount, 0))
                            return (
                              <div key={inc.id} className="flex items-center justify-between rounded-xl tint-warn px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-caution">+৳{bn(inc.amount)} <span className="text-muted font-normal">→ মোট ৳{bn(runningTotal)}</span></p>
                                  <p className="text-xs text-muted truncate">{bnDate(inc.date)}{inc.reason ? ` · ${inc.reason}` : ''}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button className="icon-btn w-8 h-8" onClick={() => handleEditIncrease(debt.id, inc)}><EditIcon className="w-4 h-4" /></button>
                                  <button className="icon-btn w-8 h-8" onClick={() => handleDeleteIncrease(debt.id, inc.id)}><TrashIcon className="w-4 h-4" /></button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button className="btn btn-secondary flex-1" onClick={() => handleOpenIncreaseModal(debt.id)}>বৃদ্ধি</button>
                        {remaining > 0 ? (
                          <button className="btn btn-primary flex-1" onClick={() => handleOpenPaymentModal(debt.id)}>
                            <CheckIcon className="w-4 h-4" /> ফেরত পেয়েছি
                          </button>
                        ) : (
                          <button className="btn btn-primary flex-1" onClick={() => handleToggleReturned(debt)}>
                            <CheckIcon className="w-4 h-4" /> পরিশোধিত চিহ্নিত করুন
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </section>
            )}

            {returnedDebts.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted px-1">ফেরত পেয়েছি</h2>
                {returnedDebts.map((debt) => {
                  const totalPaid = getTotalPaid(debt)
                  const total = round2(debt.amount + (debt.increases?.reduce((s, i) => s + i.amount, 0) || 0))
                  return (
                    <div key={debt.id} className="card card-settled bar-muted space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="badge badge-success">পরিশোধিত</span>
                            <h3 className="font-semibold text-content truncate">{debt.personName}</h3>
                          </div>
                          <p className="text-xs text-muted mt-1">মোট ৳{bn(total)} · পরিশোধ ৳{bn(totalPaid)}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button className="icon-btn" onClick={() => handleToggleReturned(debt)} title="ফেরত পাইনি"><RotateIcon className="w-5 h-5" /></button>
                          <button className="icon-btn" onClick={() => handleDelete(debt.id)} title="মুছুন"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                      </div>
                      {debt.payments && debt.payments.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-positive">পরিশোধের ইতিহাস</p>
                          {debt.payments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between rounded-xl tint-pos px-3 py-2">
                              <span className="text-xs text-muted truncate">{bnDate(p.date)}{p.note ? ` · ${p.note}` : ''}</span>
                              <span className="text-sm font-semibold text-positive flex-shrink-0 ml-2">৳{bn(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </section>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowForm(true)} aria-label="নতুন ধার যোগ করুন">
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* Add debt */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="নতুন ধার যোগ করুন"
        footerActions={<>
          <ActionButton onClick={() => setShowForm(false)} variant="secondary">বাতিল</ActionButton>
          <ActionButton onClick={(e) => e && handleSubmit(e)} variant="primary">সংরক্ষণ</ActionButton>
        </>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label label-required">ব্যক্তির নাম</label>
            <input type="text" value={personName} onChange={(e) => setPersonName(e.target.value)} className="input" placeholder="যেমন: আলী" required />
          </div>
          <div>
            <label className="label label-required">পরিমাণ (৳)</label>
            <input type="text" inputMode="decimal" value={amount} onChange={numChange(setAmount)} className="input" placeholder="০" required />
          </div>
          <div>
            <label className="label">প্রাথমিক কারণ (ঐচ্ছিক)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input min-h-[80px] resize-none" placeholder="যেমন: জরুরি প্রয়োজন" rows={3} />
          </div>
          <div>
            <label className="label label-required">তারিখ</label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
          </div>
        </form>
      </Modal>

      {/* Edit debt */}
      <Modal
        isOpen={editingDebt !== null}
        onClose={handleCancelEdit}
        title="ধার সম্পাদনা করুন"
        footerActions={<>
          <ActionButton onClick={handleCancelEdit} variant="secondary">বাতিল</ActionButton>
          <ActionButton onClick={(e) => e && handleEditSubmit(e)} variant="primary">আপডেট</ActionButton>
        </>}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="label label-required">ব্যক্তির নাম</label>
            <input type="text" value={editPersonName} onChange={(e) => setEditPersonName(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label label-required">পরিমাণ (৳)</label>
            <input type="text" inputMode="decimal" value={editAmount} onChange={numChange(setEditAmount)} className="input" required />
          </div>
          <div>
            <label className="label">প্রাথমিক কারণ (ঐচ্ছিক)</label>
            <textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} className="input min-h-[80px] resize-none" rows={3} />
          </div>
          <div>
            <label className="label label-required">তারিখ</label>
            <input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="input" required />
          </div>
        </form>
      </Modal>

      {/* Edit payment */}
      <Modal
        isOpen={editingPayment !== null}
        onClose={handleCancelPaymentEdit}
        title="পেমেন্ট সম্পাদনা করুন"
        footerActions={<>
          <ActionButton onClick={handleCancelPaymentEdit} variant="secondary">বাতিল</ActionButton>
          <ActionButton onClick={(e) => e && handleEditPaymentSubmit(e)} variant="primary">আপডেট</ActionButton>
        </>}
      >
        <form onSubmit={handleEditPaymentSubmit} className="space-y-4">
          <div>
            <label className="label label-required">পরিমাণ (৳)</label>
            <input type="text" inputMode="decimal" value={editPaymentAmount} onChange={numChange(setEditPaymentAmount)} className="input" required />
          </div>
          <div>
            <label className="label label-required">তারিখ</label>
            <input type="datetime-local" value={editPaymentDate} onChange={(e) => setEditPaymentDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">নোট (ঐচ্ছিক)</label>
            <input type="text" value={editPaymentNote} onChange={(e) => setEditPaymentNote(e.target.value)} className="input" placeholder="যেমন: আংশিক পরিশোধ" />
          </div>
        </form>
      </Modal>

      {/* Edit increase */}
      <Modal
        isOpen={editingIncrease !== null}
        onClose={handleCancelIncreaseEdit}
        title="পরিমাণ বৃদ্ধি সম্পাদনা করুন"
        footerActions={<>
          <ActionButton onClick={handleCancelIncreaseEdit} variant="secondary">বাতিল</ActionButton>
          <ActionButton onClick={(e) => e && handleEditIncreaseSubmit(e)} variant="primary">আপডেট</ActionButton>
        </>}
      >
        <form onSubmit={handleEditIncreaseSubmit} className="space-y-4">
          <div>
            <label className="label label-required">পরিমাণ (৳)</label>
            <input type="text" inputMode="decimal" value={editIncreaseAmount} onChange={numChange(setEditIncreaseAmount)} className="input" required />
          </div>
          <div>
            <label className="label label-required">তারিখ</label>
            <input type="datetime-local" value={editIncreaseDate} onChange={(e) => setEditIncreaseDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">কারণ (ঐচ্ছিক)</label>
            <textarea value={editIncreaseReason} onChange={(e) => setEditIncreaseReason(e.target.value)} className="input min-h-[80px] resize-none" rows={3} />
          </div>
        </form>
      </Modal>

      {/* Return money — partial or full */}
      {showPaymentModal && (() => {
        const d = debts.find(x => x.id === showPaymentModal)
        const rem = d ? calculateRemaining(d) : 0
        return (
          <Modal
            isOpen={!!showPaymentModal}
            onClose={handleClosePaymentModal}
            title="ফেরত পেয়েছি"
            footerActions={<>
              <ActionButton onClick={handleClosePaymentModal} variant="secondary">বাতিল</ActionButton>
              <ActionButton onClick={() => handleAddPayment(showPaymentModal)} variant="primary">সংরক্ষণ</ActionButton>
            </>}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
                <span className="text-sm text-muted">বাকি</span>
                <span className="text-base font-semibold text-negative">৳{bn(rem)}</span>
              </div>
              <div>
                <label className="label label-required">কত টাকা ফেরত পেলেন?</label>
                <input type="text" inputMode="decimal" value={paymentAmount} onChange={numChange(setPaymentAmount)} className="input" placeholder="০" />
                <button type="button" className="chip chip-accent mt-2" onClick={() => setPaymentAmount(String(rem))}>
                  সম্পূর্ণ ৳{bn(rem)} ফেরত
                </button>
              </div>
              <div>
                <label className="label label-required">তারিখ</label>
                <input type="datetime-local" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">নোট (ঐচ্ছিক)</label>
                <textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className="input min-h-[80px] resize-none" placeholder="যেমন: আংশিক ফেরত" rows={3} />
              </div>
            </div>
          </Modal>
        )
      })()}

      {/* Increase amount */}
      {showIncreaseModal && (
        <Modal
          isOpen={!!showIncreaseModal}
          onClose={handleCloseIncreaseModal}
          title="ধারের পরিমাণ বৃদ্ধি করুন"
          footerActions={<>
            <ActionButton onClick={handleCloseIncreaseModal} variant="secondary">বাতিল</ActionButton>
            <ActionButton onClick={() => handleIncreaseDebtAmount(showIncreaseModal)} variant="primary">সংরক্ষণ</ActionButton>
          </>}
        >
          <div className="space-y-4">
            <div>
              <label className="label label-required">বৃদ্ধির পরিমাণ (৳)</label>
              <input type="text" inputMode="decimal" value={increaseAmount} onChange={numChange(setIncreaseAmount)} className="input" placeholder="০" />
            </div>
            <div>
              <label className="label label-required">তারিখ</label>
              <input type="datetime-local" value={increaseDate} onChange={(e) => setIncreaseDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">কারণ (ঐচ্ছিক)</label>
              <textarea value={increaseReason} onChange={(e) => setIncreaseReason(e.target.value)} className="input min-h-[80px] resize-none" placeholder="যেমন: অতিরিক্ত প্রয়োজন" rows={3} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
