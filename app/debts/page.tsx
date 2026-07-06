'use client'

import { useEffect, useState, useRef, type FormEvent } from 'react'
import { getDebts, saveDebt, updateDebt, deleteDebt, addDebtPayment, deleteDebtPayment, addDebtIncrease, deleteDebtIncrease, subscribeToDebts, saveReminder } from '@/lib/storage'
import type { Debt, Payment, AmountIncrease, Reminder } from '@/lib/types'
import { round2, toMillis } from '@/lib/format'
import { t, useLang, fmtNum, fmtDate, fmtInt } from '@/lib/i18n'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'
import Modal, { ActionButton } from '@/components/Modal'
import { useAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'
import { ListSkeleton } from '@/components/SkeletonLoader'
import AppBar from '@/components/AppBar'
import { ArrowUpRightIcon, WalletIcon, PlusIcon, EditIcon, TrashIcon, CheckIcon, RotateIcon, SearchIcon, SortIcon, ShareIcon, ChevronDownIcon } from '@/components/Icons'
import { shareOrCopy } from '@/lib/share'
import { MoneyIllustration, NoResultsIllustration } from '@/components/Illustrations'
import { avatarColor } from '@/lib/avatar'
import { celebrate } from '@/lib/celebrate'
import { haptic } from '@/lib/haptics'

const bn = (n: number) => fmtNum(n)
const bnDate = (v: string) => fmtDate(v)
// datetime-local expects a LOCAL wall-clock string; toISOString() is UTC and
// would shift the prefilled value by the timezone offset.
const localDatetimeValue = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

export default function DebtsPage() {
  useLang() // re-render on language switch
  const [debts, setDebts] = useState<Debt[]>([])
  const [showForm, setShowForm] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [personName, setPersonName] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState('')
  const [dueDate, setDueDate] = useState('')
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
  const [editDueDate, setEditDueDate] = useState('')
  const [editingPayment, setEditingPayment] = useState<{debtId: string, payment: Payment} | null>(null)
  const [editPaymentAmount, setEditPaymentAmount] = useState('')
  const [editPaymentDate, setEditPaymentDate] = useState('')
  const [editPaymentNote, setEditPaymentNote] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null)
  const [editingIncrease, setEditingIncrease] = useState<{debtId: string, increase: AmountIncrease} | null>(null)
  const [editIncreaseAmount, setEditIncreaseAmount] = useState('')
  const [editIncreaseDate, setEditIncreaseDate] = useState('')
  const [editIncreaseReason, setEditIncreaseReason] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false) // synchronous guard against double-submit
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'amountHigh' | 'amountLow' | 'nameAz'>('recent')
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'settled' | 'overdue'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'byPerson'>('list')

  const toggleSelect = (id: string) => {
    haptic(8)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 2) Due-date chip: days left / due today / overdue
  const dueBadge = (dueDate?: string) => {
    if (!dueDate) return null
    const at = new Date(dueDate).getTime()
    if (!Number.isFinite(at)) return null
    const days = Math.ceil((at - Date.now()) / 86400000)
    if (days < 0) return <span className="chip text-[11px] tint-neg text-negative">{t('due.overdue', { count: fmtInt(-days) })}</span>
    if (days === 0) return <span className="chip text-[11px] tint-warn text-caution">{t('due.today')}</span>
    return <span className="chip text-[11px] tint-warn text-caution">{t('due.daysLeft', { count: fmtInt(days) })}</span>
  }

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
    if (savingRef.current) return

    if (!personName || !amount) {
      toast.error(t('debts.errNameAmount'))
      return
    }

    const parsedAmount = parseFloat(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('debts.errValidAmount'))
      return
    }

    savingRef.current = true
    setSaving(true)

    const debt: Debt = {
      id: '', // Will be set by Firebase
      personName,
      amount: parsedAmount,
      reason,
      date,
      ...(dueDate && { dueDate }),
      returned: false,
      createdAt: new Date().toISOString(),
      payments: [],
      increases: [],
    }

    saveDebt(debt).then(() => {
      if (dueDate) {
        const reminder: Reminder = {
          id: crypto.randomUUID(),
          title: t('debts.dueReminderTitle', { name: personName }),
          description: t('debts.dueReminderDesc', { name: personName, amount: bn(parsedAmount) }),
          scheduledTime: dueDate,
          dismissed: false,
          createdAt: new Date().toISOString(),
        }
        saveReminder(reminder).then(() => {
          toast.info(t('debts.dueReminderCreated'))
        }).catch(console.error)
      }
      setPersonName('')
      setAmount('')
      setReason('')
      setDate(localDatetimeValue())
      setDueDate('')
      setShowForm(false)
      loadDebts().catch(console.error)
      toast.success(t('debts.addSuccess'))
    }).catch((error) => {
      console.error('Error saving debt:', error)
      toast.error(t('debts.addError'))
    }).finally(() => {
      savingRef.current = false
      setSaving(false)
    })
  }

  const handleToggleReturned = (debt: Debt) => {
    const newStatus = !debt.returned
    const confirmText = newStatus ? t('debts.confirmReceived') : t('debts.confirmNotReceived')

    // Calculate total amount including increments
    const totalAmount = round2(debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))

    confirm.custom(
      t('debts.statusTitle'),
      t(newStatus ? 'debts.statusConfirmReceived' : 'debts.statusConfirmNotReceived', { name: debt.personName, amount: totalAmount }),
      () => {
        const done = () => {
          loadDebts().catch(console.error)
          toast.success(t(newStatus ? 'debts.statusMarkedReceived' : 'debts.statusMarkedNotReceived'))
        }
        const fail = (error: unknown) => {
          console.error('Error updating debt status:', error)
          toast.error(t('debts.statusError'))
        }
        if (newStatus) {
          haptic([20, 40, 20])
          celebrate()
          // Mark paid: add a payment covering the balance (auto-flagged).
          const totalPaid = getTotalPaid(debt)
          if (totalPaid < totalAmount) {
            const remainingPayment: Payment = {
              id: crypto.randomUUID(),
              amount: round2(totalAmount - totalPaid),
              date: localDatetimeValue(),
              note: t('debts.fullPaymentNote'),
              createdAt: new Date().toISOString(),
              auto: true,
            }
            addDebtPayment(debt.id, remainingPayment).then(done).catch(fail)
          } else {
            updateDebt(debt.id, { returned: true }).then(done).catch(fail)
          }
        } else {
          // Revert to unpaid: drop the auto "full payment" so the balance is due
          // again (keep any real partial payments the user entered).
          const kept = (debt.payments || []).filter((p) => !(p.auto === true || p.note === t('debts.fullPaymentNote')))
          updateDebt(debt.id, { payments: kept, returned: false }).then(done).catch(fail)
        }
      },
      {
        confirmText: confirmText,
        cancelText: t('common.cancel'),
        type: newStatus ? 'info' : 'warning'
      }
    )
  }

  const handleDelete = (id: string) => {
    const debt = debts.find(d => d.id === id)
    if (!debt) return
    
    confirm.delete(
      t('debts.deleteTitle'),
      t('debts.deleteMsg', { name: debt.personName, amount: bn(round2(debt.amount + (debt.increases?.reduce((s, i) => s + i.amount, 0) || 0))) }),
      () => {
        deleteDebt(id).then(() => {
          loadDebts().catch(console.error)
          toast.success(t('debts.deleteSuccess'))
        }).catch((error) => {
          console.error('Error deleting debt:', error)
          toast.error(t('debts.deleteError'))
        })
      }
    )
  }

  const handleAddPayment = (debtId: string) => {
    if (savingRef.current) return
    const parsedAmount = parseFloat(paymentAmount)
    if (!paymentAmount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('debts.errValidAmount'))
      return
    }

    const amount = Number(parsedAmount.toFixed(2))
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return

    const remaining = calculateRemaining(debt)

    if (amount > remaining) {
      toast.error(t('debts.errExceedsRemaining', { remaining }))
      return
    }

    const payment: Payment = {
      id: crypto.randomUUID(),
      amount,
      date: paymentDate,
      note: paymentNote,
      createdAt: new Date().toISOString(),
    }

    const fullPayoff = amount >= remaining
    savingRef.current = true; setSaving(true)
    addDebtPayment(debtId, payment).then(() => {
      haptic(fullPayoff ? [20, 40, 20] : 12)
      if (fullPayoff) celebrate()
      setPaymentAmount('')
      setPaymentDate(localDatetimeValue())
      setPaymentNote('')
      setShowPaymentForm(null)
      setShowPaymentModal(null)
      loadDebts().catch(console.error)
      toast.success(t('debts.paymentAddSuccess'))
    }).catch((error) => {
      console.error('Error adding payment:', error)
      toast.error(t('debts.paymentAddError'))
    }).finally(() => { savingRef.current = false; setSaving(false) })
  }

  const handleOpenPaymentModal = (debtId: string) => {
    const debt = debts.find(d => d.id === debtId)
    setShowPaymentModal(debtId)
    // Default to the full remaining amount → one tap = full return; edit down for partial
    setPaymentAmount(debt ? String(calculateRemaining(debt)) : '')
    setPaymentDate(localDatetimeValue())
    setPaymentNote('')
  }

  const handleClosePaymentModal = () => {
    setShowPaymentModal(null)
    setPaymentAmount('')
    setPaymentDate(localDatetimeValue())
    setPaymentNote('')
  }

  const handleDeletePayment = (debtId: string, paymentId: string) => {
    const debt = debts.find(d => d.id === debtId)
    const payment = debt?.payments?.find(p => p.id === paymentId)
    if (!debt || !payment) return
    
    confirm.delete(
      t('debts.paymentDeleteTitle'),
      t('debts.paymentDeleteMsg', { amount: payment.amount }),
      () => {
        deleteDebtPayment(debtId, paymentId).then(() => {
          loadDebts().catch(console.error)
          toast.success(t('debts.paymentDeleteSuccess'))
        }).catch((error) => {
          console.error('Error deleting payment:', error)
          toast.error(t('debts.paymentDeleteError'))
        })
      }
    )
  }

  const handleIncreaseDebtAmount = (debtId: string) => {
    if (!increaseAmount || !increaseDate) {
      toast.error(t('debts.errAmountDate'))
      return
    }

    const amount = Number(parseFloat(increaseAmount).toFixed(2))
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('debts.errValidAmount'))
      return
    }

    const debt = debts.find(d => d.id === debtId)
    if (!debt) return

    // Calculate current total amount (initial + all increases)
    const currentTotalAmount = round2(debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))
    const newTotalAmount = round2(currentTotalAmount + amount)

    confirm.update(
      t('debts.increaseTitle'),
      t('debts.increaseConfirmMsg', { name: debt.personName, from: currentTotalAmount, to: newTotalAmount }),
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
          toast.success(t('debts.increaseSuccess'))
          handleCloseIncreaseModal()
          loadDebts().catch(console.error)
        }).catch((error) => {
          console.error('Error increasing debt amount:', error)
          toast.error(t('debts.increaseError'))
        })
      }
    )
  }

  const handleOpenIncreaseModal = (debtId: string) => {
    setShowIncreaseModal(debtId)
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

  const handleDeleteIncrease = (debtId: string, increaseId: string) => {
    const debt = debts.find(d => d.id === debtId)
    const increase = debt?.increases?.find(i => i.id === increaseId)
    if (!debt || !increase) return

    // Calculate current total amount (initial + all increases)
    const currentTotalAmount = round2(debt.amount + (debt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))
    const newTotalAmount = round2(currentTotalAmount - increase.amount)

    confirm.delete(
      t('debts.increaseDeleteTitle'),
      t('debts.increaseDeleteMsg', { amount: increase.amount, from: currentTotalAmount, to: newTotalAmount }),
      () => {
        // Don't update debt.amount - it should always remain the initial amount
        // Just delete the increase record
        deleteDebtIncrease(debtId, increaseId).then(() => {
          loadDebts().catch(console.error)
          toast.success(t('debts.increaseDeleteSuccess'))
        }).catch((error) => {
          console.error('Error deleting increase:', error)
          toast.error(t('debts.increaseDeleteError'))
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

  // Return the reason unmodified. (Legacy versions split on ' + ' to strip
  // appended increase reasons, but that truncated reasons legitimately
  // containing ' + '. Reasons are no longer concatenated, so return as-is.)
  const getInitialReason = (debt: Debt): string => {
    return debt.reason || ''
  }


  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt)
    setEditPersonName(debt.personName)
    setEditAmount(debt.amount.toString())
    setEditReason(getInitialReason(debt))
    setEditDate(debt.date)
    setEditDueDate(debt.dueDate || '')
  }

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (!editingDebt || !editPersonName || !editAmount) {
      toast.error(t('debts.errNameAmount'))
      return
    }

    const newAmount = parseFloat(editAmount)
    if (isNaN(newAmount) || newAmount <= 0) {
      toast.error(t('debts.errValidAmount'))
      return
    }

    // Check if new amount is less than total paid amount
    const totalPaid = getTotalPaid(editingDebt)
    if (newAmount < totalPaid) {
      toast.error(t('debts.errLessThanPaid', { paid: totalPaid }))
      return
    }

    confirm.update(
      t('debts.updateTitle'),
      t('debts.updateConfirmMsg', { name: editPersonName }),
      () => {
        // Returned only when total paid covers the full total (base + increases)
        const increasesTotal = editingDebt.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0
        const shouldBeReturned = round2(totalPaid) >= round2(newAmount + increasesTotal)

        const dueNewlySet = !editingDebt.dueDate && !!editDueDate
        updateDebt(editingDebt.id, {
          personName: editPersonName,
          amount: newAmount,
          reason: editReason,
          date: editDate,
          dueDate: editDueDate || '',
          returned: shouldBeReturned,
        }).then(() => {
          // A due date added during edit spawns a reminder (mirrors the add flow);
          // only when it was previously empty, to avoid duplicates.
          if (dueNewlySet) {
            saveReminder({
              id: crypto.randomUUID(),
              title: t('debts.dueReminderTitle', { name: editPersonName }),
              description: t('debts.dueReminderDesc', { name: editPersonName, amount: bn(newAmount) }),
              scheduledTime: editDueDate,
              dismissed: false,
              createdAt: new Date().toISOString(),
            }).then(() => toast.info(t('debts.dueReminderCreated'))).catch(console.error)
          }
          setEditingDebt(null)
          setEditPersonName('')
          setEditAmount('')
          setEditReason('')
          setEditDate('')
          setEditDueDate('')
          loadDebts().catch(console.error)
          toast.success(t('debts.updateSuccess'))
        }).catch((error) => {
          console.error('Error updating debt:', error)
          toast.error(t('debts.updateError'))
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
    setEditDueDate('')
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
      toast.error(t('debts.errAmountDate'))
      return
    }

    const amount = parseFloat(editPaymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('debts.errValidAmount'))
      return
    }

    const debt = debts.find(d => d.id === editingPayment.debtId)
    if (!debt) return

    // Calculate remaining amount excluding the current payment being edited
    // (total base = initial amount + all increases, mirroring calculateRemaining)
    const otherPayments = debt.payments?.filter(p => p.id !== editingPayment.payment.id) || []
    const otherPaymentsTotal = otherPayments.reduce((sum, p) => sum + p.amount, 0)
    const increasesTotal = debt.increases?.reduce((sum, i) => sum + i.amount, 0) || 0
    const remaining = round2(debt.amount + increasesTotal - otherPaymentsTotal)
    
    if (amount > remaining) {
      toast.error(t('debts.errExceedsRemaining', { remaining }))
      return
    }

    const updatedPayment: Payment = {
      ...editingPayment.payment,
      amount,
      date: editPaymentDate,
      note: editPaymentNote || undefined,
    }

    confirm.update(
      t('debts.paymentUpdateTitle'),
      t('debts.paymentUpdateMsg', { amount }),
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
          toast.success(t('debts.paymentUpdateSuccess'))
        }).catch((error) => {
          console.error('Error updating payment:', error)
          toast.error(t('debts.paymentUpdateError'))
        })
      }
    )
  }

  const handleEditIncreaseSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (!editingIncrease || !editIncreaseAmount || !editIncreaseDate) {
      toast.error(t('debts.errAmountDate'))
      return
    }

    const amount = parseFloat(editIncreaseAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('debts.errValidAmount'))
      return
    }

    const updatedIncrease: AmountIncrease = {
      ...editingIncrease.increase,
      amount,
      date: editIncreaseDate,
      reason: editIncreaseReason || undefined,
    }

    confirm.update(
      t('debts.increaseUpdateTitle'),
      t('debts.increaseUpdateMsg', { amount }),
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
          toast.success(t('debts.increaseUpdateSuccess'))
        }).catch((error) => {
          console.error('Error updating increase:', error)
          toast.error(t('debts.increaseUpdateError'))
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

  const handleBulkMarkPaid = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    confirm.custom(
      t('select.markPaid'),
      t('select.bulkPaidConfirm', { count: fmtInt(ids.length) }),
      () => {
        Promise.all(ids.map((id) => {
          const d = debts.find((x) => x.id === id)
          if (!d) return updateDebt(id, { returned: true })
          const remaining = calculateRemaining(d)
          // Record a payment for the outstanding balance so পরিশোধ matches মোট
          // (addDebtPayment auto-sets returned when fully paid), mirroring the
          // single-card "mark paid" flow. No balance left → just flag returned.
          if (remaining > 0) {
            return addDebtPayment(id, {
              id: crypto.randomUUID(),
              amount: remaining,
              date: localDatetimeValue(),
              note: t('debts.fullPaymentNote'),
              createdAt: new Date().toISOString(),
              auto: true,
            })
          }
          return updateDebt(id, { returned: true })
        }))
          .then(() => {
            setSelectedIds(new Set())
            loadDebts().catch(console.error)
            toast.success(t('select.bulkPaidDone'))
            haptic([20, 40, 20])
            celebrate()
          })
          .catch((error) => {
            console.error('Error bulk marking paid:', error)
            toast.error(t('debts.statusError'))
          })
      },
      { confirmText: t('select.markPaid'), cancelText: t('common.cancel'), type: 'info' }
    )
  }

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    confirm.delete(
      t('select.delete'),
      t('select.bulkDeleteConfirm', { count: fmtInt(ids.length) }),
      () => {
        Promise.all(ids.map((id) => deleteDebt(id)))
          .then(() => {
            setSelectedIds(new Set())
            loadDebts().catch(console.error)
            toast.success(t('select.bulkDeleteDone'))
          })
          .catch((error) => {
            console.error('Error bulk deleting:', error)
            toast.error(t('debts.deleteError'))
          })
      }
    )
  }

  const notifyShareResult = (result: 'shared' | 'copied' | 'failed') => {
    if (result === 'shared') toast.success(t('share.shared'))
    else if (result === 'copied') toast.success(t('share.copied'))
    else toast.error(t('share.failed'))
  }

  const handleShareDebt = async (debt: Debt) => {
    const total = round2(debt.amount + (debt.increases?.reduce((s, i) => s + i.amount, 0) || 0))
    const text =
      `${t('debts.remaining')}: ৳${bn(calculateRemaining(debt))}\n` +
      `${t('debts.total')}: ৳${bn(total)} · ${t('debts.paid')}: ৳${bn(getTotalPaid(debt))}\n` +
      `${bnDate(debt.date)}`
    notifyShareResult(await shareOrCopy(debt.personName, text))
  }

  const handleSharePerson = async (name: string, entries: Debt[]) => {
    const totalDue = round2(entries.reduce((s, d) => s + calculateRemaining(d), 0))
    const lines = entries
      .map((d) => `${bnDate(d.date)} — ৳${bn(calculateRemaining(d))}`)
      .join('\n')
    const text = `${lines}\n${t('person.totalDue')}: ৳${bn(totalDue)}`
    notifyShareResult(await shareOrCopy(name, text))
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

  // Selection: only active cards are selectable; total is their remaining sum.
  const selectedDebts = activeDebts.filter((d) => selectedIds.has(d.id))
  const selectedTotal = round2(selectedDebts.reduce((sum, d) => sum + calculateRemaining(d), 0))
  const selectedCount = selectedDebts.length

  // Search + filter + sort applied to the rendered lists.
  const now = Date.now()
  const q = search.trim().toLowerCase()
  const matchesSearch = (d: Debt) => !q || d.personName.toLowerCase().includes(q)
  const isOverdue = (d: Debt) => !d.returned && !!d.dueDate && new Date(d.dueDate).getTime() < now

  const sortDebts = (arr: Debt[]): Debt[] => {
    const sorted = [...arr]
    const ts = (d: Debt) => toMillis(d.createdAt) || toMillis(d.date)
    switch (sortBy) {
      case 'recent':
        sorted.sort((a, b) => ts(b) - ts(a))
        break
      case 'oldest':
        sorted.sort((a, b) => ts(a) - ts(b))
        break
      case 'amountHigh':
        sorted.sort((a, b) => calculateRemaining(b) - calculateRemaining(a))
        break
      case 'amountLow':
        sorted.sort((a, b) => calculateRemaining(a) - calculateRemaining(b))
        break
      case 'nameAz':
        sorted.sort((a, b) => a.personName.localeCompare(b.personName))
        break
    }
    return sorted
  }

  const showActiveSection = filterBy === 'all' || filterBy === 'active' || filterBy === 'overdue'
  const showSettledSection = filterBy === 'all' || filterBy === 'settled'
  const filteredActive = sortDebts(
    activeDebts.filter((d) => matchesSearch(d) && (filterBy === 'overdue' ? isOverdue(d) : true))
  )
  const filteredReturned = sortDebts(returnedDebts.filter(matchesSearch))
  const visibleCount =
    (showActiveSection ? filteredActive.length : 0) + (showSettledSection ? filteredReturned.length : 0)

  // By-person grouping (active debts only), sorted by total due desc.
  const personGroups = (() => {
    const map = new Map<string, Debt[]>()
    for (const d of filteredActive) {
      const key = d.personName.trim()
      const arr = map.get(key)
      if (arr) arr.push(d)
      else map.set(key, [d])
    }
    return Array.from(map.entries())
      .map(([name, entries]) => ({
        name,
        entries,
        totalDue: round2(entries.reduce((s, d) => s + calculateRemaining(d), 0)),
      }))
      .sort((a, b) => b.totalDue - a.totalDue)
  })()


  const numChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (/^\d*\.?\d*$/.test(v)) setter(v)
  }

  return (
    <div className="min-h-full">
      <AppBar title={t('debts.title')} subtitle={t('debts.subtitle')} />

      <div className={`max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in ${selectedCount > 0 && viewMode === 'list' ? 'pb-44' : ''}`}>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-tile tint-pos">
            <div className="flex items-center gap-2 mb-2 text-positive">
              <ArrowUpRightIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-positive">{t('debts.statOutstanding')}</span>
            </div>
            <p className="text-2xl font-bold text-content">৳{bn(totalActive)}</p>
          </div>
          <div className="stat-tile tint-accent">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <WalletIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-accent">{t('debts.receivedBack')}</span>
            </div>
            <p className="text-2xl font-bold text-content">৳{bn(totalReturned)}</p>
          </div>
        </div>

        {/* Search + filter + sort + view controls */}
        {!dataLoading && debts.length > 0 && (
          <div className="space-y-3">
            <div className="relative">
              <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
                placeholder={t('search.placeholder')}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'active', 'settled', 'overdue'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterBy(f)}
                  className={`chip ${filterBy === f ? 'chip-accent' : ''}`}
                >
                  {t(`filter.${f}`)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[9rem]">
                <SortIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="input input-sm pl-9"
                  aria-label={t('sort.label')}
                >
                  <option value="recent">{t('sort.recent')}</option>
                  <option value="oldest">{t('sort.oldest')}</option>
                  <option value="amountHigh">{t('sort.amountHigh')}</option>
                  <option value="amountLow">{t('sort.amountLow')}</option>
                  <option value="nameAz">{t('sort.nameAz')}</option>
                </select>
              </div>

              <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1 flex-shrink-0">
                {(['list', 'byPerson'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setViewMode(v)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${viewMode === v ? 'bg-surface text-content font-medium shadow-sm' : 'text-muted'}`}
                  >
                    {t(`view.${v}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {dataLoading ? (
          <ListSkeleton count={3} />
        ) : debts.length === 0 ? (
          <div className="text-center py-16">
            <MoneyIllustration tone="pos" className="w-56 h-40 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-content mb-1">{t('debts.emptyTitle')}</h3>
            <p className="text-sm text-muted mb-5">{t('debts.emptyDesc')}</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary mx-auto">
              <PlusIcon className="w-5 h-5" /> {t('debts.addFirst')}
            </button>
          </div>
        ) : viewMode === 'byPerson' ? (
          personGroups.length === 0 ? (
            <div className="text-center py-12"><NoResultsIllustration className="w-48 h-28 mx-auto mb-3" /><p className="text-muted text-sm">{t('search.noResults')}</p></div>
          ) : (
            <section className="space-y-3 list-stagger">
              <h2 className="text-sm font-semibold text-muted px-1 section-sticky">{t('debts.sectionActive')}</h2>
              {personGroups.map((group) => (
                <div key={group.name} className="card bar-pos flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
                      style={{ backgroundColor: avatarColor(group.name).bg, color: avatarColor(group.name).fg }}
                    >
                      {(group.name.trim().charAt(0) || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-content truncate">{group.name}</h3>
                      <p className="text-xs text-muted">
                        {t('person.entries', { count: fmtInt(group.entries.length) })} · {t('person.totalDue')} ৳{bn(group.totalDue)}
                      </p>
                    </div>
                  </div>
                  <button className="icon-btn flex-shrink-0" onClick={() => handleSharePerson(group.name, group.entries)} title={t('share.action')}>
                    <ShareIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </section>
          )
        ) : visibleCount === 0 ? (
          <div className="text-center py-12"><NoResultsIllustration className="w-48 h-28 mx-auto mb-3" /><p className="text-muted text-sm">{t('search.noResults')}</p></div>
        ) : (
          <>
            {showActiveSection && filteredActive.length > 0 && (
              <section className="space-y-3 list-stagger">
                <h2 className="text-sm font-semibold text-muted px-1 section-sticky">{t('debts.sectionActive')}</h2>
                {filteredActive.map((debt) => {
                  const remaining = calculateRemaining(debt)
                  const totalPaid = getTotalPaid(debt)
                  const total = round2(debt.amount + (debt.increases?.reduce((s, i) => s + i.amount, 0) || 0))
                  const pct = total > 0 ? Math.min(100, Math.round((totalPaid / total) * 100)) : 0
                  const isSelected = selectedIds.has(debt.id)
                  return (
                    <div key={debt.id} className={`card bar-pos space-y-4 transition-shadow ${isSelected ? 'ring-2 ring-accent' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            onClick={() => toggleSelect(debt.id)}
                            className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${isSelected ? 'bg-accent border-accent text-accent-fg' : 'border-line text-transparent'}`}
                            aria-label={t('select.selectItem')}
                            aria-pressed={isSelected}
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-content truncate">{debt.personName}</h3>
                            <p className="text-xs text-muted">{bnDate(debt.date)}</p>
                            {dueBadge(debt.dueDate) && <div className="mt-1.5">{dueBadge(debt.dueDate)}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button className="icon-btn" onClick={() => handleShareDebt(debt)} title={t('share.action')}><ShareIcon className="w-5 h-5" /></button>
                          <button className="icon-btn" onClick={() => handleEdit(debt)} title={t('common.edit')}><EditIcon className="w-5 h-5" /></button>
                          <button className="icon-btn" onClick={() => handleDelete(debt.id)} title={t('common.delete')}><TrashIcon className="w-5 h-5" /></button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div><p className="text-xs text-muted mb-0.5">{t('debts.total')}</p><p className="text-sm font-semibold text-content">৳{bn(total)}</p></div>
                        <div><p className="text-xs text-muted mb-0.5">{t('debts.paid')}</p><p className="text-sm font-semibold text-positive">৳{bn(totalPaid)}</p></div>
                        <div><p className="text-xs text-muted mb-0.5">{t('debts.remaining')}</p><p className="text-sm font-semibold text-negative">৳{bn(remaining)}</p></div>
                      </div>

                      <div>
                        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full bar-animate transition-all ${pct < 30 ? 'bg-negative' : pct < 70 ? 'bg-caution' : 'bg-positive'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted text-right mt-1">{t('common.paidPct', { pct: fmtInt(pct) })}</p>
                      </div>

                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-1 text-xs font-medium text-accent py-1"
                        onClick={() => toggleExpand(debt.id)}
                        aria-expanded={expandedIds.has(debt.id)}
                      >
                        {expandedIds.has(debt.id) ? t('common.showLess') : t('common.details')}
                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${expandedIds.has(debt.id) ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedIds.has(debt.id) && (<div className="space-y-4 fade-in">
                      {debt.payments && debt.payments.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-positive">{t('debts.paymentHistory')}</p>
                          <div className="timeline space-y-1.5">
                          {debt.payments.map((p) => (
                            <div key={p.id} className="timeline-row flex items-center justify-between rounded-xl tint-pos px-3 py-2">
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
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-accent">{t('debts.initialDebt')}</p>
                        <div className="flex items-center justify-between rounded-xl tint-accent px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-content">৳{bn(getInitialAmount(debt))}</p>
                            <p className="text-xs text-muted truncate">{bnDate(debt.date)}{getInitialReason(debt) ? ` · ${getInitialReason(debt)}` : ''}</p>
                          </div>
                        </div>
                      </div>

                      {debt.increases && debt.increases.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-caution">{t('debts.increases')}</p>
                          {debt.increases.map((inc, idx) => {
                            const runningTotal = round2(debt.amount + (debt.increases ?? []).slice(0, idx + 1).reduce((s, i) => s + i.amount, 0))
                            return (
                              <div key={inc.id} className="flex items-center justify-between rounded-xl tint-warn px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-caution">+৳{bn(inc.amount)} <span className="text-muted font-normal">→ {t('debts.total')} ৳{bn(runningTotal)}</span></p>
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

                      </div>)}

                      <div className="flex gap-2 pt-1">
                        <button className="btn btn-secondary flex-1" onClick={() => handleOpenIncreaseModal(debt.id)}>{t('debts.increaseBtn')}</button>
                        {remaining > 0 ? (
                          <button className="btn btn-primary flex-1" onClick={() => handleOpenPaymentModal(debt.id)}>
                            <CheckIcon className="w-4 h-4" /> {t('debts.receivedBack')}
                          </button>
                        ) : (
                          <button className="btn btn-primary flex-1" onClick={() => handleToggleReturned(debt)}>
                            <CheckIcon className="w-4 h-4" /> {t('debts.markPaid')}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </section>
            )}

            {showSettledSection && filteredReturned.length > 0 && (
              <section className="space-y-3 list-stagger">
                <h2 className="text-sm font-semibold text-muted px-1 section-sticky">{t('debts.receivedBack')}</h2>
                {filteredReturned.map((debt) => {
                  const totalPaid = getTotalPaid(debt)
                  const total = round2(debt.amount + (debt.increases?.reduce((s, i) => s + i.amount, 0) || 0))
                  return (
                    <div key={debt.id} className="card card-settled bar-muted space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="badge badge-success">{t('debts.paid')}</span>
                            <h3 className="font-semibold text-content truncate">{debt.personName}</h3>
                          </div>
                          <p className="text-xs text-muted mt-1">{t('debts.settledSummary', { total: bn(total), paid: bn(totalPaid) })}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button className="icon-btn" onClick={() => handleShareDebt(debt)} title={t('share.action')}><ShareIcon className="w-5 h-5" /></button>
                          <button className="icon-btn" onClick={() => handleToggleReturned(debt)} title={t('debts.confirmNotReceived')}><RotateIcon className="w-5 h-5" /></button>
                          <button className="icon-btn" onClick={() => handleDelete(debt.id)} title={t('common.delete')}><TrashIcon className="w-5 h-5" /></button>
                        </div>
                      </div>
                      {debt.payments && debt.payments.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-positive">{t('debts.paymentHistory')}</p>
                          <div className="timeline space-y-1.5">
                          {debt.payments.map((p) => (
                            <div key={p.id} className="timeline-row flex items-center justify-between rounded-xl tint-pos px-3 py-2">
                              <span className="text-xs text-muted truncate">{bnDate(p.date)}{p.note ? ` · ${p.note}` : ''}</span>
                              <span className="text-sm font-semibold text-positive flex-shrink-0 ml-2">৳{bn(p.amount)}</span>
                            </div>
                          ))}
                          </div>
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

      {/* Selected-total bar — floats above the bottom nav while cards are selected */}
      {selectedCount > 0 && viewMode === 'list' && (
        <div
          className="fixed left-0 right-0 z-40 px-4"
          style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-2xl mx-auto card bar-pos shadow-pop py-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted truncate">{t('select.count', { count: fmtInt(selectedCount) })} · {t('select.totalDue')}</p>
                <p className="text-xl font-bold text-positive">৳{bn(selectedTotal)}</p>
              </div>
              <button className="btn btn-secondary text-xs px-3 py-2 flex-shrink-0" onClick={() => setSelectedIds(new Set())}>
                {t('select.clear')}
              </button>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" onClick={handleBulkMarkPaid}>
                <CheckIcon className="w-4 h-4" /> {t('select.markPaid')}
              </button>
              <button className="btn btn-danger flex-1" onClick={handleBulkDelete}>
                <TrashIcon className="w-4 h-4" /> {t('select.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      {(selectedCount === 0 || viewMode === 'byPerson') && (
        <button className="fab" onClick={() => setShowForm(true)} aria-label={t('debts.addNew')}>
          <PlusIcon className="w-6 h-6" />
        </button>
      )}

      {/* Add debt */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={t('debts.addNew')}
        footerActions={<>
          <ActionButton onClick={() => setShowForm(false)} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={(e) => e && handleSubmit(e)} variant="primary" loading={saving}>{t('common.save')}</ActionButton>
        </>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label label-required">{t('debts.personName')}</label>
            <input type="text" value={personName} onChange={(e) => setPersonName(e.target.value)} className="input" placeholder={t('debts.personNamePlaceholder')} required />
          </div>
          <div>
            <label className="label label-required">{t('debts.amountLabel')}</label>
            <input type="text" inputMode="decimal" value={amount} onChange={numChange(setAmount)} className="input" placeholder={t('debts.zeroPlaceholder')} required />
          </div>
          <div>
            <label className="label">{t('debts.initialReasonOptional')}</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input min-h-[80px] resize-none" placeholder={t('debts.reasonPlaceholder')} rows={3} />
          </div>
          <div>
            <label className="label label-required">{t('common.date')}</label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">{t('debts.dueDateOptional')}</label>
            <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
          </div>
        </form>
      </Modal>

      {/* Edit debt */}
      <Modal
        isOpen={editingDebt !== null}
        onClose={handleCancelEdit}
        title={t('debts.editTitle')}
        footerActions={<>
          <ActionButton onClick={handleCancelEdit} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={(e) => e && handleEditSubmit(e)} variant="primary">{t('debts.update')}</ActionButton>
        </>}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="label label-required">{t('debts.personName')}</label>
            <input type="text" value={editPersonName} onChange={(e) => setEditPersonName(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label label-required">{t('debts.amountLabel')}</label>
            <input type="text" inputMode="decimal" value={editAmount} onChange={numChange(setEditAmount)} className="input" required />
          </div>
          <div>
            <label className="label">{t('debts.initialReasonOptional')}</label>
            <textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} className="input min-h-[80px] resize-none" rows={3} />
          </div>
          <div>
            <label className="label label-required">{t('common.date')}</label>
            <input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">{t('debts.dueDateOptional')}</label>
            <input type="datetime-local" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="input" />
          </div>
        </form>
      </Modal>

      {/* Edit payment */}
      <Modal
        isOpen={editingPayment !== null}
        onClose={handleCancelPaymentEdit}
        title={t('debts.editPaymentTitle')}
        footerActions={<>
          <ActionButton onClick={handleCancelPaymentEdit} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={(e) => e && handleEditPaymentSubmit(e)} variant="primary">{t('debts.update')}</ActionButton>
        </>}
      >
        <form onSubmit={handleEditPaymentSubmit} className="space-y-4">
          <div>
            <label className="label label-required">{t('debts.amountLabel')}</label>
            <input type="text" inputMode="decimal" value={editPaymentAmount} onChange={numChange(setEditPaymentAmount)} className="input" required />
          </div>
          <div>
            <label className="label label-required">{t('common.date')}</label>
            <input type="datetime-local" value={editPaymentDate} onChange={(e) => setEditPaymentDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">{t('debts.noteOptional')}</label>
            <input type="text" value={editPaymentNote} onChange={(e) => setEditPaymentNote(e.target.value)} className="input" placeholder={t('debts.partialPaymentPlaceholder')} />
          </div>
        </form>
      </Modal>

      {/* Edit increase */}
      <Modal
        isOpen={editingIncrease !== null}
        onClose={handleCancelIncreaseEdit}
        title={t('debts.editIncreaseTitle')}
        footerActions={<>
          <ActionButton onClick={handleCancelIncreaseEdit} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={(e) => e && handleEditIncreaseSubmit(e)} variant="primary">{t('debts.update')}</ActionButton>
        </>}
      >
        <form onSubmit={handleEditIncreaseSubmit} className="space-y-4">
          <div>
            <label className="label label-required">{t('debts.amountLabel')}</label>
            <input type="text" inputMode="decimal" value={editIncreaseAmount} onChange={numChange(setEditIncreaseAmount)} className="input" required />
          </div>
          <div>
            <label className="label label-required">{t('common.date')}</label>
            <input type="datetime-local" value={editIncreaseDate} onChange={(e) => setEditIncreaseDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">{t('debts.reasonOptional')}</label>
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
            title={t('debts.receivedBack')}
            footerActions={<>
              <ActionButton onClick={handleClosePaymentModal} variant="secondary">{t('common.cancel')}</ActionButton>
              <ActionButton onClick={() => handleAddPayment(showPaymentModal)} variant="primary" loading={saving}>{t('common.save')}</ActionButton>
            </>}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
                <span className="text-sm text-muted">{t('debts.remaining')}</span>
                <span className="text-base font-semibold text-negative">৳{bn(rem)}</span>
              </div>
              <div>
                <label className="label label-required">{t('debts.howMuchReceived')}</label>
                <input type="text" inputMode="decimal" value={paymentAmount} onChange={numChange(setPaymentAmount)} className="input" placeholder={t('debts.zeroPlaceholder')} />
                <button type="button" className="chip chip-accent mt-2" onClick={() => setPaymentAmount(String(rem))}>
                  {t('debts.fullReturnChip', { amount: bn(rem) })}
                </button>
              </div>
              <div>
                <label className="label label-required">{t('common.date')}</label>
                <input type="datetime-local" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">{t('debts.noteOptional')}</label>
                <textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className="input min-h-[80px] resize-none" placeholder={t('debts.partialReturnPlaceholder')} rows={3} />
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
          title={t('debts.increaseTitle')}
          footerActions={<>
            <ActionButton onClick={handleCloseIncreaseModal} variant="secondary">{t('common.cancel')}</ActionButton>
            <ActionButton onClick={() => handleIncreaseDebtAmount(showIncreaseModal)} variant="primary" loading={saving}>{t('common.save')}</ActionButton>
          </>}
        >
          <div className="space-y-4">
            <div>
              <label className="label label-required">{t('debts.increaseAmountLabel')}</label>
              <input type="text" inputMode="decimal" value={increaseAmount} onChange={numChange(setIncreaseAmount)} className="input" placeholder={t('debts.zeroPlaceholder')} />
            </div>
            <div>
              <label className="label label-required">{t('common.date')}</label>
              <input type="datetime-local" value={increaseDate} onChange={(e) => setIncreaseDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">{t('debts.reasonOptional')}</label>
              <textarea value={increaseReason} onChange={(e) => setIncreaseReason(e.target.value)} className="input min-h-[80px] resize-none" placeholder={t('debts.increaseReasonPlaceholder')} rows={3} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
