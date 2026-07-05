'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { getLoans, saveLoan, updateLoan, deleteLoan, addLoanPayment, deleteLoanPayment, addLoanIncrease, deleteLoanIncrease, subscribeToLoans } from '@/lib/storage'
import type { Loan, Payment, AmountIncrease } from '@/lib/types'
import { round2, toBnDigits, toBnNumber } from '@/lib/format'
import { format } from 'date-fns'
import { bn as bnLocale } from 'date-fns/locale'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'
import Modal, { ActionButton } from '@/components/Modal'
import { useAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'
import { ListSkeleton } from '@/components/SkeletonLoader'
import AppBar from '@/components/AppBar'
import { ArrowDownLeftIcon, WalletIcon, PlusIcon, EditIcon, TrashIcon, CheckIcon, RotateIcon } from '@/components/Icons'

const bn = (n: number) => toBnNumber(n)
const bnDate = (v: string) => toBnDigits(format(new Date(v), 'MMMM d, yyyy', { locale: bnLocale }))
// datetime-local expects a LOCAL wall-clock string; toISOString() is UTC and
// would shift the prefilled value by the timezone offset.
const localDatetimeValue = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
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
  const [editingIncrease, setEditingIncrease] = useState<{loanId: string, increase: AmountIncrease} | null>(null)
  const [editIncreaseAmount, setEditIncreaseAmount] = useState('')
  const [editIncreaseDate, setEditIncreaseDate] = useState('')
  const [editIncreaseReason, setEditIncreaseReason] = useState('')
  const [showIncreaseModal, setShowIncreaseModal] = useState<string | null>(null)
  const [increaseAmount, setIncreaseAmount] = useState('')
  const [increaseDate, setIncreaseDate] = useState('')
  const [increaseReason, setIncreaseReason] = useState('')

  useEffect(() => {
    setMounted(true)
    // Set default date after mount
    setDate(localDatetimeValue())
    setPaymentDate(localDatetimeValue())
    setIncreaseDate(localDatetimeValue())
  }, [])

  // Realtime sync across all devices
  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    setDataLoading(true)
    const unsubscribe = subscribeToLoans(user.uid, (data) => {
      setLoans(data)
      setDataLoading(false)
    })
    return () => unsubscribe()
  }, [user, loading, router])

  const loadLoans = async () => {
    try {
      setDataLoading(true)
      const loans = await getLoans()
      setLoans(loans)
    } catch (error) {
      console.error('Error loading loans:', error)
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

    const parsedAmount = parseFloat(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('সঠিক পরিমাণ দিন')
      return
    }

    const loan: Loan = {
      id: '', // Will be set by Firebase
      personName,
      amount: parsedAmount,
      reason,
      date,
      returned: false,
      createdAt: new Date().toISOString(),
      payments: [],
      increases: [],
    }

    saveLoan(loan).then(() => {
      setPersonName('')
      setAmount('')
      setReason('')
      setDate(localDatetimeValue())
      setShowForm(false)
      toast.success('ধার সফলভাবে যোগ করা হয়েছে')
    }).catch((error) => {
      console.error('Error saving loan:', error)
      toast.error('ধার যোগ করতে সমস্যা হয়েছে')
    })
  }

  const handleToggleReturned = (loan: Loan) => {
    const newStatus = !loan.returned
    const actionText = newStatus ? 'ফেরত দিয়েছেন' : 'ফেরত দেননি'
    const confirmText = newStatus ? 'ফেরত দিয়েছি' : 'ফেরত দেইনি'
    
    // Calculate total amount including increments
    const totalAmount = round2(loan.amount + (loan.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))
    
    confirm.custom(
      'ধারের অবস্থা পরিবর্তন করুন',
      `${loan.personName} এর ${totalAmount} টাকার ধার ${actionText} হিসেবে চিহ্নিত করবেন?`,
      () => {
        if (newStatus) {
          // When marking as returned, ensure payment amount equals total amount
          const totalPaid = getTotalPaid(loan)
          if (totalPaid < totalAmount) {
            // Add remaining payment to make it fully paid
            const remainingAmount = round2(totalAmount - totalPaid)
            const remainingPayment: Payment = {
              id: crypto.randomUUID(),
              amount: remainingAmount,
              date: localDatetimeValue(),
              note: 'সম্পূর্ণ পরিশোধ',
              createdAt: new Date().toISOString(),
            }
            addLoanPayment(loan.id, remainingPayment)
          }
        }
        updateLoan(loan.id, { returned: newStatus }).then(() => {
          loadLoans().catch(console.error)
          toast.success(`ধার ${actionText} হিসেবে চিহ্নিত করা হয়েছে`)
        }).catch((error) => {
          console.error('Error updating loan status:', error)
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
    const loan = loans.find(l => l.id === id)
    if (!loan) return
    
    confirm.delete(
      'ধার মুছুন',
      `${loan.personName} এর ${loan.amount} টাকার ধার মুছে ফেলবেন?`,
      () => {
        deleteLoan(id).then(() => {
          loadLoans().catch(console.error)
          toast.success('ধার সফলভাবে মুছে ফেলা হয়েছে')
        }).catch((error) => {
          console.error('Error deleting loan:', error)
          toast.error('ধার মুছতে সমস্যা হয়েছে')
        })
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
      id: crypto.randomUUID(),
      amount,
      date: paymentDate,
      note: paymentNote || undefined,
      createdAt: new Date().toISOString(),
    }

    addLoanPayment(loanId, payment).then(() => {
      setPaymentAmount('')
      setPaymentDate(localDatetimeValue())
      setPaymentNote('')
      setShowPaymentForm(null)
      setShowPaymentModal(null)
      loadLoans().catch(console.error)
      toast.success('পেমেন্ট সফলভাবে যোগ করা হয়েছে')
    }).catch((error) => {
      console.error('Error adding payment:', error)
      toast.error('পেমেন্ট যোগ করতে সমস্যা হয়েছে')
    })
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

    // Calculate current total amount (initial + all increases)
    const currentTotalAmount = round2(loan.amount + (loan.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))
    const newTotalAmount = round2(currentTotalAmount + amount)

    confirm.update(
      'ধারের পরিমাণ বৃদ্ধি করুন',
      `${loan.personName} এর ধারের পরিমাণ ৳${currentTotalAmount} থেকে ৳${newTotalAmount} বৃদ্ধি করবেন?`,
      () => {
        // Add increase to history
        const increase: AmountIncrease = {
          id: crypto.randomUUID(),
          amount,
          date: increaseDate,
          ...(increaseReason && { reason: increaseReason }),
          createdAt: new Date().toISOString(),
        }
        
        addLoanIncrease(loanId, increase).then(() => {
          toast.success('ধারের পরিমাণ বৃদ্ধি করা হয়েছে')
          handleCloseIncreaseModal()
          loadLoans().catch(console.error)
        }).catch((error) => {
          console.error('Error increasing loan amount:', error)
          toast.error('ধারের পরিমাণ বৃদ্ধি করতে সমস্যা হয়েছে')
        })
      }
    )
  }

  const handleOpenPaymentModal = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId)
    setShowPaymentModal(loanId)
    // Default to full remaining → one tap = full return; edit down for partial
    setPaymentAmount(loan ? String(calculateRemaining(loan)) : '')
    setPaymentDate(localDatetimeValue())
    setPaymentNote('')
  }

  const handleClosePaymentModal = () => {
    setShowPaymentModal(null)
    setPaymentAmount('')
    setPaymentDate(localDatetimeValue())
    setPaymentNote('')
  }

  const handleOpenIncreaseModal = (loanId: string) => {
    setShowIncreaseModal(loanId)
    setIncreaseAmount('')
    setIncreaseDate(localDatetimeValue())
    setIncreaseReason('')
  }

  const handleCloseIncreaseModal = () => {
    setShowIncreaseModal(null)
    setIncreaseAmount('')
    setIncreaseDate(localDatetimeValue())
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
        deleteLoanPayment(loanId, paymentId).then(() => {
          loadLoans().catch(console.error)
          toast.success('পেমেন্ট সফলভাবে মুছে ফেলা হয়েছে')
        }).catch((error) => {
          console.error('Error deleting payment:', error)
          toast.error('পেমেন্ট মুছতে সমস্যা হয়েছে')
        })
      }
    )
  }

  const handleDeleteIncrease = (loanId: string, increaseId: string) => {
    const loan = loans.find(l => l.id === loanId)
    const increase = loan?.increases?.find(i => i.id === increaseId)
    if (!loan || !increase) return

    // Calculate current total amount (initial + all increases)
    const currentTotalAmount = round2(loan.amount + (loan.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))
    const newTotalAmount = round2(currentTotalAmount - increase.amount)

    confirm.delete(
      'পরিমাণ বৃদ্ধি মুছুন',
      `${increase.amount} টাকার পরিমাণ বৃদ্ধি মুছে ফেলবেন? ধারের পরিমাণ ৳${currentTotalAmount} থেকে ৳${newTotalAmount} হবে।`,
      () => {
        // Don't update loan.amount - it should always remain the initial amount
        // Just delete the increase record
        deleteLoanIncrease(loanId, increaseId).then(() => {
          loadLoans().catch(console.error)
          toast.success('পরিমাণ বৃদ্ধি সফলভাবে মুছে ফেলা হয়েছে')
        }).catch((error) => {
          console.error('Error deleting increase:', error)
          toast.error('পরিমাণ বৃদ্ধি মুছতে সমস্যা হয়েছে')
        })
      }
    )
  }


  const calculateRemaining = (loan: Loan): number => {
    // Calculate total amount including increments
    const totalAmount = round2(loan.amount + (loan.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))

    if (!loan.payments || loan.payments.length === 0) {
      return round2(totalAmount)
    }
    const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0)
    return round2(totalAmount - totalPaid)
  }

  const getTotalPaid = (loan: Loan): number => {
    if (!loan.payments || loan.payments.length === 0) {
      return 0
    }
    return round2(loan.payments.reduce((sum, p) => sum + p.amount, 0))
  }

  // Helper function to get initial amount (always the original amount, never affected by increments)
  const getInitialAmount = (loan: Loan): number => {
    return loan.amount
  }

  // Return the reason unmodified. (Legacy versions split on ' + ' to strip
  // appended increase reasons, but that truncated reasons legitimately
  // containing ' + '. Reasons are no longer concatenated, so return as-is.)
  const getInitialReason = (loan: Loan): string => {
    return loan.reason || ''
  }



  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan)
    setEditPersonName(loan.personName)
    setEditAmount(loan.amount.toString())
    setEditReason(getInitialReason(loan))
    setEditDate(loan.date)
  }

  const handleEditSubmit = (e: FormEvent) => {
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
        // Returned only when total paid covers the full total (base + increases)
        const increasesTotal = editingLoan.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0
        const shouldBeReturned = round2(totalPaid) >= round2(newAmount + increasesTotal)

        updateLoan(editingLoan.id, {
          personName: editPersonName,
          amount: newAmount,
          reason: editReason,
          date: editDate,
          returned: shouldBeReturned,
        }).then(() => {
          setEditingLoan(null)
          setEditPersonName('')
          setEditAmount('')
          setEditReason('')
          setEditDate('')
          loadLoans().catch(console.error)
          toast.success('ধার সফলভাবে আপডেট করা হয়েছে')
        }).catch((error) => {
          console.error('Error updating loan:', error)
          toast.error('ধার আপডেট করতে সমস্যা হয়েছে')
        })
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

  const handleEditIncrease = (loanId: string, increase: AmountIncrease) => {
    setEditingIncrease({ loanId, increase })
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

    const loan = loans.find(l => l.id === editingPayment.loanId)
    if (!loan) return

    // Calculate remaining amount excluding the current payment being edited
    // (total base = initial amount + all increases, mirroring calculateRemaining)
    const otherPayments = loan.payments?.filter(p => p.id !== editingPayment.payment.id) || []
    const otherPaymentsTotal = otherPayments.reduce((sum, p) => sum + p.amount, 0)
    const increasesTotal = loan.increases?.reduce((sum, i) => sum + i.amount, 0) || 0
    const remaining = round2(loan.amount + increasesTotal - otherPaymentsTotal)
    
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
        // Delete old payment then add updated payment (chained to avoid a race)
        deleteLoanPayment(editingPayment.loanId, editingPayment.payment.id).then(() => {
          return addLoanPayment(editingPayment.loanId, updatedPayment)
        }).then(() => {
          setEditingPayment(null)
          setEditPaymentAmount('')
          setEditPaymentDate('')
          setEditPaymentNote('')
          loadLoans().catch(console.error)
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
        deleteLoanIncrease(editingIncrease.loanId, editingIncrease.increase.id).then(() => {
          return addLoanIncrease(editingIncrease.loanId, updatedIncrease)
        }).then(() => {
          setEditingIncrease(null)
          setEditIncreaseAmount('')
          setEditIncreaseDate('')
          setEditIncreaseReason('')
          loadLoans().catch(console.error)
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

  const activeLoans = loans.filter(l => !l.returned)
  const returnedLoans = loans.filter(l => l.returned)
  
  // Calculate remaining amounts after payments
  const totalActive = round2(activeLoans.reduce((sum, l) => {
    const totalPaid = l.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0
    const totalAmount = l.amount + (l.increases?.reduce((incSum, inc) => incSum + inc.amount, 0) || 0)
    const remaining = totalAmount - totalPaid
    return sum + Math.max(0, remaining)
  }, 0))

  const totalReturned = round2(returnedLoans.reduce((sum, l) => {
    const totalPaid = l.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0
    return sum + totalPaid
  }, 0))


  const numChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (/^\d*\.?\d*$/.test(v)) setter(v)
  }

  return (
    <div className="min-h-full">
      <AppBar title="ধার নিয়েছি" subtitle="আপনার ঋণ" />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-tile tint-neg">
            <div className="flex items-center gap-2 mb-2 text-negative">
              <ArrowDownLeftIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-negative">দিতে হবে</span>
            </div>
            <p className="text-2xl font-bold text-content">৳{bn(totalActive)}</p>
          </div>
          <div className="stat-tile tint-accent">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <WalletIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-accent">ফেরত দিয়েছি</span>
            </div>
            <p className="text-2xl font-bold text-content">৳{bn(totalReturned)}</p>
          </div>
        </div>

        {dataLoading ? (
          <ListSkeleton count={3} />
        ) : loans.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center text-muted mb-4">
              <WalletIcon className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-content mb-1">কোনো ঋণ নেই</h3>
            <p className="text-sm text-muted mb-5">এখনো কারো থেকে টাকা ধার নেননি</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary mx-auto">
              <PlusIcon className="w-5 h-5" /> প্রথম ঋণ যোগ করুন
            </button>
          </div>
        ) : (
          <>
            {activeLoans.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted px-1">ফেরত দিতে হবে</h2>
                {activeLoans.map((loan) => {
                  const remaining = calculateRemaining(loan)
                  const totalPaid = getTotalPaid(loan)
                  const total = round2(loan.amount + (loan.increases?.reduce((s, i) => s + i.amount, 0) || 0))
                  const pct = total > 0 ? Math.min(100, Math.round((totalPaid / total) * 100)) : 0
                  return (
                    <div key={loan.id} className="card bar-neg space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-content truncate">{loan.personName}</h3>
                          <p className="text-xs text-muted">{bnDate(loan.date)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button className="icon-btn" onClick={() => handleEdit(loan)} title="সম্পাদনা"><EditIcon className="w-5 h-5" /></button>
                          <button className="icon-btn" onClick={() => handleDelete(loan.id)} title="মুছুন"><TrashIcon className="w-5 h-5" /></button>
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

                      {loan.payments && loan.payments.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-positive">পরিশোধের ইতিহাস</p>
                          {loan.payments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between rounded-xl tint-pos px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-positive">৳{bn(p.amount)}</p>
                                <p className="text-xs text-muted truncate">{bnDate(p.date)}{p.note ? ` · ${p.note}` : ''}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button className="icon-btn w-8 h-8" onClick={() => handleEditPayment(loan.id, p)}><EditIcon className="w-4 h-4" /></button>
                                <button className="icon-btn w-8 h-8" onClick={() => handleDeletePayment(loan.id, p.id)}><TrashIcon className="w-4 h-4" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-accent">প্রাথমিক ধার</p>
                        <div className="flex items-center justify-between rounded-xl tint-accent px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-content">৳{bn(getInitialAmount(loan))}</p>
                            <p className="text-xs text-muted truncate">{bnDate(loan.date)}{getInitialReason(loan) ? ` · ${getInitialReason(loan)}` : ''}</p>
                          </div>
                        </div>
                      </div>

                      {loan.increases && loan.increases.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-caution">পরিমাণ বৃদ্ধি</p>
                          {loan.increases.map((inc, idx) => {
                            const runningTotal = round2(loan.amount + (loan.increases ?? []).slice(0, idx + 1).reduce((s, i) => s + i.amount, 0))
                            return (
                              <div key={inc.id} className="flex items-center justify-between rounded-xl tint-warn px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-caution">+৳{bn(inc.amount)} <span className="text-muted font-normal">→ মোট ৳{bn(runningTotal)}</span></p>
                                  <p className="text-xs text-muted truncate">{bnDate(inc.date)}{inc.reason ? ` · ${inc.reason}` : ''}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button className="icon-btn w-8 h-8" onClick={() => handleEditIncrease(loan.id, inc)}><EditIcon className="w-4 h-4" /></button>
                                  <button className="icon-btn w-8 h-8" onClick={() => handleDeleteIncrease(loan.id, inc.id)}><TrashIcon className="w-4 h-4" /></button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button className="btn btn-secondary flex-1" onClick={() => handleOpenIncreaseModal(loan.id)}>বৃদ্ধি</button>
                        {remaining > 0 ? (
                          <button className="btn btn-primary flex-1" onClick={() => handleOpenPaymentModal(loan.id)}>
                            <CheckIcon className="w-4 h-4" /> ফেরত দিয়েছি
                          </button>
                        ) : (
                          <button className="btn btn-primary flex-1" onClick={() => handleToggleReturned(loan)}>
                            <CheckIcon className="w-4 h-4" /> পরিশোধিত চিহ্নিত করুন
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </section>
            )}

            {returnedLoans.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted px-1">ফেরত দিয়েছি</h2>
                {returnedLoans.map((loan) => {
                  const totalPaid = getTotalPaid(loan)
                  const total = round2(loan.amount + (loan.increases?.reduce((s, i) => s + i.amount, 0) || 0))
                  return (
                    <div key={loan.id} className="card card-settled bar-muted space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="badge badge-success">পরিশোধিত</span>
                            <h3 className="font-semibold text-content truncate">{loan.personName}</h3>
                          </div>
                          <p className="text-xs text-muted mt-1">মোট ৳{bn(total)} · পরিশোধ ৳{bn(totalPaid)}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button className="icon-btn" onClick={() => handleToggleReturned(loan)} title="ফেরত দেইনি"><RotateIcon className="w-5 h-5" /></button>
                          <button className="icon-btn" onClick={() => handleDelete(loan.id)} title="মুছুন"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                      </div>
                      {loan.payments && loan.payments.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-positive">পরিশোধের ইতিহাস</p>
                          {loan.payments.map((p) => (
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
      <button className="fab" onClick={() => setShowForm(true)} aria-label="নতুন ঋণ যোগ করুন">
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* Add loan */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="নতুন ঋণ যোগ করুন"
        footerActions={<>
          <ActionButton onClick={() => setShowForm(false)} variant="secondary">বাতিল</ActionButton>
          <ActionButton onClick={(e) => e && handleSubmit(e)} variant="primary">সংরক্ষণ</ActionButton>
        </>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label label-required">ব্যক্তির নাম</label>
            <input type="text" value={personName} onChange={(e) => setPersonName(e.target.value)} className="input" placeholder="যেমন: রহিম" required />
          </div>
          <div>
            <label className="label label-required">পরিমাণ (৳)</label>
            <input type="text" inputMode="decimal" value={amount} onChange={numChange(setAmount)} className="input" placeholder="০" required />
          </div>
          <div>
            <label className="label">প্রাথমিক কারণ (ঐচ্ছিক)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input min-h-[80px] resize-none" placeholder="যেমন: জরুরি খরচ" rows={3} />
          </div>
          <div>
            <label className="label label-required">তারিখ</label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
          </div>
        </form>
      </Modal>

      {/* Edit loan */}
      <Modal
        isOpen={editingLoan !== null}
        onClose={handleCancelEdit}
        title="ঋণ সম্পাদনা করুন"
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
        const l = loans.find(x => x.id === showPaymentModal)
        const rem = l ? calculateRemaining(l) : 0
        return (
          <Modal
            isOpen={!!showPaymentModal}
            onClose={handleClosePaymentModal}
            title="ফেরত দিয়েছি"
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
                <label className="label label-required">কত টাকা ফেরত দিলেন?</label>
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
            <ActionButton onClick={() => handleIncreaseLoanAmount(showIncreaseModal)} variant="primary">সংরক্ষণ</ActionButton>
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
