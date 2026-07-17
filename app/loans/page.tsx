'use client'

import { useEffect, useState, useRef, type FormEvent } from 'react'
import { getLoans, saveLoan, updateLoan, softDeleteLoan, restoreLoan, purgeLoan, deleteRemindersForSource, getRemindersForSource, updateReminder, deleteReminder, addLoanPayment, deleteLoanPayment, updateLoanPayment, addLoanIncrease, deleteLoanIncrease, updateLoanIncrease, subscribeToLoans, saveReminder } from '@/lib/storage'
import type { Loan, Payment, AmountIncrease, Reminder } from '@/lib/types'
import { round2, toMillis, num } from '@/lib/format'
import { t, useLang, fmtNum, fmtDate, fmtInt } from '@/lib/i18n'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'
import Modal, { ActionButton } from '@/components/Modal'
import { useAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ListSkeleton } from '@/components/SkeletonLoader'
import AppBar from '@/components/AppBar'
import { ArrowDownLeftIcon, WalletIcon, PlusIcon, EditIcon, TrashIcon, CheckIcon, RotateIcon, SearchIcon, SortIcon, ShareIcon, ChevronDownIcon, PhoneIcon, WhatsAppIcon, MessageIcon } from '@/components/Icons'
import { waLink, isValidBdPhone } from '@/lib/phone'
import { shareOrCopy } from '@/lib/share'
import { LEAD_OPTIONS, dueReminderTime, type LeadKey } from '@/lib/reminder-lead'
import { MoneyIllustration, NoResultsIllustration } from '@/components/Illustrations'
import { avatarColor } from '@/lib/avatar'
import { celebrate } from '@/lib/celebrate'
import { haptic } from '@/lib/haptics'

type LoanSortKey = 'recent' | 'oldest' | 'amountHigh' | 'amountLow' | 'nameAz'
type LoanFilterKey = 'all' | 'active' | 'settled' | 'overdue'
type LoanViewMode = 'list' | 'byPerson'

const bn = (n: number) => fmtNum(n)
const bnDate = (v: string) => fmtDate(v)
// datetime-local expects a LOCAL wall-clock string; toISOString() is UTC and
// would shift the prefilled value by the timezone offset.
const localDatetimeValue = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

// Generate `count` installment due-dates, `interval` steps of `unit` apart,
// starting at `start`. setMonth is calendar-accurate for months (no drift
// from month length); weeks/days step by a fixed number of days. Shared by
// the create-time and edit-time (add-a-plan-later) installment flows.
const buildInstallmentDates = (
  start: Date,
  count: number,
  unit: 'days' | 'weeks' | 'months',
  interval: number
): string[] => {
  const dates: string[] = []
  for (let i = 0; i < count; i++) {
    const at = new Date(start)
    if (unit === 'months') {
      // Clamp the day so a high day-of-month start (e.g. Jan 31 + 1 month)
      // lands on the last day of the target month instead of overflowing into
      // the next one (Feb 31 → Mar 2/3).
      const day = at.getDate()
      at.setDate(1)
      at.setMonth(at.getMonth() + i * interval)
      const lastDay = new Date(at.getFullYear(), at.getMonth() + 1, 0).getDate()
      at.setDate(Math.min(day, lastDay))
    } else if (unit === 'weeks') at.setDate(at.getDate() + i * interval * 7)
    else at.setDate(at.getDate() + i * interval)
    dates.push(new Date(at.getTime() - at.getTimezoneOffset() * 60000).toISOString().slice(0, 10))
  }
  return dates
}

// Per-installment amount. Every installment is round2(total/count) except the
// LAST, which absorbs the rounding remainder so the installments sum to exactly
// the total (e.g. ৳100/3 → 33.33, 33.33, 33.34 not 33.33×3 = 99.99).
const instAmount = (total: number, count: number, index: number): number => {
  if (count <= 0) return 0
  const per = round2(total / count)
  return index === count - 1 ? round2(total - per * (count - 1)) : per
}

export default function LoansPage() {
  useLang() // re-render on language switch
  const [loans, setLoans] = useState<Loan[]>([])
  const [showForm, setShowForm] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [personName, setPersonName] = useState('')
  const [personPhone, setPersonPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [reminderLead, setReminderLead] = useState<LeadKey>('onTime')
  // কিস্তি: optionally split repayment into N installments, every M days
  const [instCount, setInstCount] = useState('')
  const [instIntervalDays, setInstIntervalDays] = useState('30')
  const [instIntervalUnit, setInstIntervalUnit] = useState<'days' | 'weeks' | 'months'>('months')
  const [showTrash, setShowTrash] = useState(false)
  // Phone / promise date / কিস্তি are collapsed by default — most loans don't
  // need them, and having every field flat made the form hard to scan.
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [showMoreOptionsEdit, setShowMoreOptionsEdit] = useState(false)
  // Installment plan management from the edit form: shows a summary + cancel
  // button when a plan already exists (editInstReminders non-empty), or lets
  // the user set up a brand-new plan for a loan that didn't have one.
  const [editInstReminders, setEditInstReminders] = useState<Reminder[]>([])
  const [editInstCount, setEditInstCount] = useState('')
  const [editInstIntervalDays, setEditInstIntervalDays] = useState('30')
  const [editInstIntervalUnit, setEditInstIntervalUnit] = useState<'days' | 'weeks' | 'months'>('months')
  const [mounted, setMounted] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [editPersonName, setEditPersonName] = useState('')
  const [editPersonPhone, setEditPersonPhone] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editReminderLead, setEditReminderLead] = useState<LeadKey>('onTime')
  // Standalone "remind me again" action (replaces the old promiseDate field).
  const [promiseModalId, setPromiseModalId] = useState<string | null>(null)
  const [promiseModalDate, setPromiseModalDate] = useState('')
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false) // synchronous guard against double-submit
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<LoanSortKey>('recent')
  const [filterBy, setFilterBy] = useState<LoanFilterKey>('all')
  const [viewMode, setViewMode] = useState<LoanViewMode>('list')

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

  // Due-date chip: days left / due today / overdue
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
    if (savingRef.current) return

    if (!personName || !amount) {
      toast.error(t('loans.errNameAmount'))
      return
    }

    const parsedAmount = parseFloat(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('loans.errValidAmount'))
      return
    }
    // The due date can't precede the loan itself — catches an accidental
    // wrong-month pick instead of creating an instantly-overdue loan.
    if (dueDate && dueDate < date) {
      toast.error(t('loans.errDueBeforeDate'))
      return
    }
    if (!isValidBdPhone(personPhone)) {
      toast.error(t('common.invalidPhone'))
      return
    }

    savingRef.current = true
    setSaving(true)

    const loan: Loan = {
      id: '', // Will be set by Firebase
      personName,
      ...(personPhone.trim() && { personPhone: personPhone.trim() }),
      amount: parsedAmount,
      reason,
      date,
      ...(dueDate && { dueDate }),
      returned: false,
      createdAt: new Date().toISOString(),
      payments: [],
      increases: [],
    }

    const capturedDueDate = dueDate
    const capturedLead = reminderLead
    const capturedInstCount = parseInt(instCount, 10) || 0
    const capturedInstUnit = instIntervalUnit
    // Only the custom (days) preset uses a free-typed number; weekly/monthly
    // presets are a fixed 1 week / 1 month step.
    const capturedInstInterval = capturedInstUnit === 'days' ? Math.max(1, parseInt(instIntervalDays, 10) || 30) : 1
    const hasInstallmentPlan = capturedInstCount > 1
    saveLoan(loan).then((newId) => {
      // Skip the separate due-date reminder when an installment plan exists —
      // installment #1 always lands on the due date (it's the stepping start),
      // so a parallel due reminder would just duplicate it on the same day.
      if (capturedDueDate && !hasInstallmentPlan) {
        saveReminder({
          id: crypto.randomUUID(),
          title: t('loans.dueReminderTitle', { name: loan.personName }),
          description: t('loans.dueReminderDesc', { name: loan.personName, amount: bn(parsedAmount), date: bnDate(capturedDueDate) }),
          scheduledTime: dueReminderTime(capturedDueDate, capturedLead),
          dismissed: false,
          createdAt: new Date().toISOString(),
          sourceId: newId,
          sourceType: 'loan',
          reminderKind: 'due',
          autoParams: { name: loan.personName, amount: parsedAmount, date: capturedDueDate },
        }).then(() => toast.info(t('loans.dueReminderCreated'))).catch(console.error)
      }
      // Promise date is no longer set at creation — it's set afterward via the
      // "আবার মনে করিয়ে দিন" action on the card (see handleSavePromiseReminder).
      // কিস্তি plan: N reminders, one per installment, every M days from the
      // due date (or from the loan date when no due date is set).
      if (hasInstallmentPlan) {
        const start = new Date(capturedDueDate || loan.date)
        if (!isNaN(start.getTime())) {
          buildInstallmentDates(start, capturedInstCount, capturedInstUnit, capturedInstInterval).forEach((local, i) => {
            const per = instAmount(parsedAmount, capturedInstCount, i)
            saveReminder({
              id: crypto.randomUUID(),
              title: t('loans.instReminderTitle', { name: loan.personName, i: fmtInt(i + 1), n: fmtInt(capturedInstCount) }),
              description: t('loans.instReminderDesc', { name: loan.personName, amount: bn(per) }),
              scheduledTime: `${local}T09:00`,
              dismissed: false,
              createdAt: new Date().toISOString(),
              sourceId: newId,
              sourceType: 'loan',
              reminderKind: 'installment',
              autoParams: { name: loan.personName, amount: per, i: i + 1, n: capturedInstCount },
            }).catch(console.error)
          })
          toast.info(t('loans.instCreated', { n: fmtInt(capturedInstCount) }))
        }
      }
    }).catch((error) => {
      console.error('Error saving loan:', error)
      toast.error(t('loans.addError'))
    })

    // Optimistic close — Firestore applies locally now, syncs when online.
    setPersonName('')
    setPersonPhone('')
    setAmount('')
    setReason('')
    setDate(localDatetimeValue())
    setDueDate('')
    setInstCount('')
    setInstIntervalDays('30')
    setInstIntervalUnit('months')
    setShowMoreOptions(false)
    setReminderLead('onTime')
    setShowForm(false)
    savingRef.current = false
    setSaving(false)
    toast.success(t('loans.addSuccess'))
  }

  const handleToggleReturned = (loan: Loan) => {
    const newStatus = !loan.returned
    const actionText = newStatus ? t('loans.statusReturned') : t('loans.statusNotReturned')
    const confirmText = newStatus ? t('loans.confirmReturned') : t('loans.confirmNotReturned')

    // Calculate total amount including increments
    const totalAmount = round2(loan.amount + (loan.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))

    confirm.custom(
      t('loans.toggleTitle'),
      t('loans.toggleMessage', { name: loan.personName, amount: fmtNum(totalAmount), action: actionText }),
      () => {
        const done = () => {
          loadLoans().catch(console.error)
          toast.success(t('loans.toggleSuccess', { action: actionText }))
        }
        const fail = (error: unknown) => {
          console.error('Error updating loan status:', error)
          toast.error(t('loans.toggleError'))
        }
        if (newStatus) {
          haptic([20, 40, 20])
          celebrate(t('loans.celebratePaid', { name: loan.personName }))
          deleteRemindersForSource(loan.id) // settled → drop its due-date reminder
          const totalPaid = getTotalPaid(loan)
          if (totalPaid < totalAmount) {
            const remainingPayment: Payment = {
              id: crypto.randomUUID(),
              amount: round2(totalAmount - totalPaid),
              date: localDatetimeValue(),
              note: t('loans.fullPaymentNote'),
              createdAt: new Date().toISOString(),
              auto: true,
            }
            addLoanPayment(loan.id, remainingPayment).then(done).catch(fail)
          } else {
            updateLoan(loan.id, { returned: true }).then(done).catch(fail)
          }
        } else {
          // Revert to unpaid: drop the auto "full payment" so the balance is due
          // again (keep any real partial payments). Re-fetch first so a payment
          // added on another device since this render isn't clobbered by writing
          // back a stale payments array. Only the auto-added full payment
          // (flagged) is dropped, never a real one.
          getLoans().then((fresh) => {
            const current = fresh.find((l) => l.id === loan.id) || loan
            const kept = (current.payments || []).filter((p) => p.auto !== true)
            return updateLoan(loan.id, { payments: kept, returned: false })
          }).then(done).catch(fail)
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
    const loan = loans.find(l => l.id === id)
    if (!loan) return
    
    confirm.delete(
      t('loans.deleteTitle'),
      t('loans.deleteMessage', { name: loan.personName, amount: bn(round2(loan.amount + (loan.increases?.reduce((s, i) => s + i.amount, 0) || 0))) }),
      () => {
        // Soft delete → Trash (restorable); linked reminders are removed now.
        softDeleteLoan(id).then(() => {
          deleteRemindersForSource(id) // remove the linked due-date reminder, if any
          loadLoans().catch(console.error)
          toast.success(t('loans.deleteSuccess'))
        }).catch((error) => {
          console.error('Error deleting loan:', error)
          toast.error(t('loans.deleteError'))
        })
      }
    )
  }

  const handleRestore = (id: string) => {
    restoreLoan(id).then(() => {
      loadLoans().catch(console.error)
      toast.success(t('common.trashRestored'))
    }).catch(() => toast.error(t('loans.deleteError')))
  }

  const handlePurge = (id: string) => {
    confirm.delete(t('common.trashPurgeTitle'), t('common.trashPurgeMsg'), () => {
      purgeLoan(id).then(() => {
        loadLoans().catch(console.error)
        toast.success(t('common.trashPurged'))
      }).catch(() => toast.error(t('loans.deleteError')))
    })
  }

  const handleEmptyTrash = () => {
    const ids = loans.filter(l => !!l.deletedAt).map(l => l.id)
    if (ids.length === 0) return
    confirm.delete(t('common.trashEmptyTitle'), t('common.trashEmptyMsg', { count: fmtInt(ids.length) }), () => {
      Promise.all(ids.map((id) => purgeLoan(id)))
        .then(() => {
          loadLoans().catch(console.error)
          toast.success(t('common.trashPurged'))
        })
        .catch(() => toast.error(t('loans.deleteError')))
    })
  }

  // The promise-date reminder's amount is written once (at creation) into a
  // static push payload — it can't recompute itself at fire time. Keep it
  // honest by patching the stored description whenever the remaining balance
  // changes (partial payment, or the loan amount itself being edited).
  const syncPromiseReminderAmount = (sourceId: string, name: string, remainingAmt: number) => {
    getRemindersForSource(sourceId).then((all) => {
      all.filter((r) => r.reminderKind === 'promise' && !r.autoParams?.generic).forEach((r) => {
        updateReminder(r.id, {
          description: t('loans.promiseReminderDesc', { name, amount: bn(remainingAmt) }),
          autoParams: { ...r.autoParams, name, amount: remainingAmt },
        }).catch(console.error)
      })
    }).catch(console.error)
  }

  // Same staleness problem for কিস্তি reminders: each one's per-installment
  // amount is frozen at plan-creation time. Whenever the loan's total changes
  // (amount edit or an increase), re-split the new total evenly across every
  // installment reminder — including already-completed ones, so the split
  // stays simple and predictable rather than tracking partial collection.
  const syncInstallmentAmounts = (sourceId: string, name: string, newTotalAmount: number) => {
    getRemindersForSource(sourceId).then((all) => {
      const installments = all.filter((r) => r.reminderKind === 'installment')
      if (installments.length === 0) return
      const count = installments.length
      installments.forEach((r) => {
        // Use the reminder's own 1-based position (autoParams.i) so the last one
        // absorbs the rounding remainder and the split still sums to the total.
        const idx = (r.autoParams?.i ?? 1) - 1
        const per = instAmount(newTotalAmount, count, idx)
        updateReminder(r.id, {
          description: t('loans.instReminderDesc', { name, amount: bn(per) }),
          autoParams: { ...r.autoParams, name, amount: per },
        }).catch(console.error)
      })
    }).catch(console.error)
  }

  // The due-date reminder's amount is likewise frozen at creation. Keep it in
  // sync with the outstanding balance so a payment/increase doesn't leave it
  // saying "repay ৳<old>". Preserves each reminder's own due date.
  const syncDueReminderAmount = (sourceId: string, name: string, remainingAmt: number) => {
    getRemindersForSource(sourceId).then((all) => {
      // Legacy reminders predate reminderKind — an undefined kind means "due"
      // (the original single-reminder shape), matching the edit-path filter.
      all.filter((r) => !r.reminderKind || r.reminderKind === 'due').forEach((r) => {
        const date = r.autoParams?.date || ''
        updateReminder(r.id, {
          description: t('loans.dueReminderDesc', { name, amount: bn(remainingAmt), date: bnDate(date) }),
          autoParams: { ...r.autoParams, name, amount: remainingAmt, date },
        }).catch(console.error)
      })
    }).catch(console.error)
  }

  // "আবার মনে করিয়ে দিন" — replaces the old promiseDate form field entirely.
  // Tapping the chip on a card opens a tiny modal to set/change/clear a single
  // follow-up reminder, independent of the due-date reminder and any কিস্তি plan.
  const handleOpenPromiseModal = (loan: Loan) => {
    setPromiseModalId(loan.id)
    // promiseDate is a datetime-local string now. Legacy values are date-only
    // (YYYY-MM-DD) — pad them to 09:00 so the datetime-local input accepts them.
    const p = loan.promiseDate || ''
    setPromiseModalDate(p && !p.includes('T') ? `${p}T09:00` : p)
  }

  const handleClosePromiseModal = () => {
    setPromiseModalId(null)
    setPromiseModalDate('')
  }

  const handleSavePromiseReminder = () => {
    const loan = loans.find((l) => l.id === promiseModalId)
    if (!loan || !promiseModalDate) return
    if (promiseModalDate.slice(0, 10) < loan.date.slice(0, 10)) {
      toast.error(t('loans.errPromiseBeforeDate'))
      return
    }
    updateLoan(loan.id, { promiseDate: promiseModalDate }).catch(console.error)
    getRemindersForSource(loan.id).then((all) => {
      const hasInstallmentPlan = all.some((r) => r.reminderKind === 'installment')
      const existing = all.filter((r) => r.reminderKind === 'promise')
      // promiseModalDate already carries the user-chosen time.
      const scheduledTime = promiseModalDate
      const description = hasInstallmentPlan
        ? t('loans.promiseReminderDescGeneric', { name: loan.personName })
        : t('loans.promiseReminderDesc', { name: loan.personName, amount: bn(calculateRemaining(loan)) })
      const autoParams = { name: loan.personName, amount: calculateRemaining(loan), generic: hasInstallmentPlan }
      if (existing.length) {
        existing.forEach((r) => updateReminder(r.id, { scheduledTime, description, autoParams }).catch(console.error))
      } else {
        saveReminder({
          id: crypto.randomUUID(),
          title: t('loans.promiseReminderTitle', { name: loan.personName }),
          description,
          scheduledTime,
          dismissed: false,
          createdAt: new Date().toISOString(),
          sourceId: loan.id,
          sourceType: 'loan',
          reminderKind: 'promise',
          autoParams,
        }).catch(console.error)
      }
    }).catch(console.error)
    loadLoans().catch(console.error)
    toast.success(t('loans.promiseSet'))
    handleClosePromiseModal()
  }

  const handleClearPromiseReminder = () => {
    const loan = loans.find((l) => l.id === promiseModalId)
    if (!loan) return
    confirm.delete(t('loans.promiseClearTitle'), t('loans.promiseClearMsg'), () => {
      updateLoan(loan.id, { promiseDate: null as unknown as string }).catch(console.error)
      getRemindersForSource(loan.id).then((all) => {
        all.filter((r) => r.reminderKind === 'promise').forEach((r) => deleteReminder(r.id).catch(console.error))
      }).catch(console.error)
      loadLoans().catch(console.error)
      toast.success(t('loans.promiseCleared'))
      handleClosePromiseModal()
    })
  }

  const handleAddPayment = (loanId: string) => {
    if (savingRef.current) return
    if (!paymentAmount || !paymentDate) {
      toast.error(t('loans.errAmountDate'))
      return
    }

    const amount = Number(parseFloat(paymentAmount).toFixed(2))
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('loans.errValidAmount'))
      return
    }

    const loan = loans.find(l => l.id === loanId)
    if (!loan) return

    const remaining = calculateRemaining(loan)

    if (amount > remaining) {
      toast.error(t('loans.errOverpay', { remaining: fmtNum(remaining) }))
      return
    }

    const payment: Payment = {
      id: crypto.randomUUID(),
      amount,
      date: paymentDate,
      note: paymentNote || undefined,
      createdAt: new Date().toISOString(),
    }

    const fullPayoff = amount >= remaining
    savingRef.current = true; setSaving(true)
    addLoanPayment(loanId, payment).then(() => {
      haptic(fullPayoff ? [20, 40, 20] : 12)
      if (fullPayoff) {
        celebrate()
        deleteRemindersForSource(loanId)
      } else {
        syncPromiseReminderAmount(loanId, loan.personName, round2(remaining - amount))
        syncDueReminderAmount(loanId, loan.personName, round2(remaining - amount))
      }
      setPaymentAmount('')
      setPaymentDate(localDatetimeValue())
      setPaymentNote('')
      setShowPaymentForm(null)
      setShowPaymentModal(null)
      loadLoans().catch(console.error)
      toast.success(t('loans.paymentAddSuccess'))
    }).catch((error) => {
      console.error('Error adding payment:', error)
      toast.error(t('loans.paymentAddError'))
    }).finally(() => { savingRef.current = false; setSaving(false) })
  }

  const handleIncreaseLoanAmount = (loanId: string) => {
    if (!increaseAmount || !increaseDate) {
      toast.error(t('loans.errAmountDate'))
      return
    }

    const amount = Number(parseFloat(increaseAmount).toFixed(2))
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('loans.errValidAmount'))
      return
    }

    const loan = loans.find(l => l.id === loanId)
    if (!loan) return

    // Calculate current total amount (initial + all increases)
    const currentTotalAmount = round2(loan.amount + (loan.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0))
    const newTotalAmount = round2(currentTotalAmount + amount)

    confirm.update(
      t('loans.increaseTitle'),
      t('loans.increaseConfirmMessage', { name: loan.personName, from: fmtNum(currentTotalAmount), to: fmtNum(newTotalAmount) }),
      () => {
        // Guard against a fast double-confirm racing two writes on the same
        // increases array (read-modify-write) and losing one.
        if (savingRef.current) return
        savingRef.current = true
        // Add increase to history
        const increase: AmountIncrease = {
          id: crypto.randomUUID(),
          amount,
          date: increaseDate,
          ...(increaseReason && { reason: increaseReason }),
          createdAt: new Date().toISOString(),
        }

        addLoanIncrease(loanId, increase).then(() => {
          syncPromiseReminderAmount(loanId, loan.personName, round2(Math.max(0, newTotalAmount - getTotalPaid(loan))))
          syncDueReminderAmount(loanId, loan.personName, round2(Math.max(0, newTotalAmount - getTotalPaid(loan))))
          syncInstallmentAmounts(loanId, loan.personName, newTotalAmount)
          toast.success(t('loans.increaseSuccess'))
          handleCloseIncreaseModal()
          loadLoans().catch(console.error)
        }).catch((error) => {
          console.error('Error increasing loan amount:', error)
          toast.error(t('loans.increaseError'))
        }).finally(() => { savingRef.current = false })
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
      t('loans.paymentDeleteTitle'),
      t('loans.paymentDeleteMessage', { amount: fmtNum(payment.amount) }),
      () => {
        deleteLoanPayment(loanId, paymentId).then(() => {
          // Deleting a payment un-pays it — remaining goes back up.
          syncPromiseReminderAmount(loanId, loan.personName, round2(calculateRemaining(loan) + payment.amount))
          syncDueReminderAmount(loanId, loan.personName, round2(calculateRemaining(loan) + payment.amount))
          loadLoans().catch(console.error)
          toast.success(t('loans.paymentDeleteSuccess'))
        }).catch((error) => {
          console.error('Error deleting payment:', error)
          toast.error(t('loans.paymentDeleteError'))
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

    // Block if removing this increase would drop the total below what's already paid.
    if (newTotalAmount < getTotalPaid(loan)) {
      toast.error(t('loans.errAmountBelowPaid', { paid: fmtNum(getTotalPaid(loan)) }))
      return
    }

    confirm.delete(
      t('loans.increaseDeleteTitle'),
      t('loans.increaseDeleteMessage', { amount: fmtNum(increase.amount), from: fmtNum(currentTotalAmount), to: fmtNum(newTotalAmount) }),
      () => {
        // Don't update loan.amount - it should always remain the initial amount
        // Just delete the increase record
        deleteLoanIncrease(loanId, increaseId).then(() => {
          syncPromiseReminderAmount(loanId, loan.personName, round2(Math.max(0, newTotalAmount - getTotalPaid(loan))))
          syncDueReminderAmount(loanId, loan.personName, round2(Math.max(0, newTotalAmount - getTotalPaid(loan))))
          syncInstallmentAmounts(loanId, loan.personName, newTotalAmount)
          loadLoans().catch(console.error)
          toast.success(t('loans.increaseDeleteSuccess'))
        }).catch((error) => {
          console.error('Error deleting increase:', error)
          toast.error(t('loans.increaseDeleteError'))
        })
      }
    )
  }


  const calculateRemaining = (loan: Loan): number => {
    // Calculate total amount including increments. num() coerces any legacy
    // string amounts so a stray "500" can't trigger string concatenation.
    const totalAmount = round2(num(loan.amount) + (loan.increases?.reduce((sum, inc) => sum + num(inc.amount), 0) || 0))

    if (!loan.payments || loan.payments.length === 0) {
      return round2(totalAmount)
    }
    const totalPaid = loan.payments.reduce((sum, p) => sum + num(p.amount), 0)
    // Clamp at 0 so deleting an increase after a large payment never shows a
    // negative balance and aggregate sums stay correct.
    return round2(Math.max(0, totalAmount - totalPaid))
  }

  const getTotalPaid = (loan: Loan): number => {
    if (!loan.payments || loan.payments.length === 0) {
      return 0
    }
    return round2(loan.payments.reduce((sum, p) => sum + num(p.amount), 0))
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
    setEditPersonPhone(loan.personPhone || '')
    setEditAmount(loan.amount.toString())
    setEditReason(getInitialReason(loan))
    setEditDate(loan.date)
    setEditDueDate(loan.dueDate || '')
    setEditReminderLead('onTime')
    setEditInstCount('')
    setEditInstIntervalDays('30')
    setEditInstIntervalUnit('months')
    setEditInstReminders([])
    // Load any existing installment plan so the edit form can show/cancel it
    // instead of letting the user set up a conflicting second plan.
    getRemindersForSource(loan.id)
      .then((linked) => setEditInstReminders(linked.filter((r) => r.reminderKind === 'installment')))
      .catch(console.error)
    // Auto-expand if phone already has data — otherwise editing would
    // silently hide it behind a closed toggle.
    setShowMoreOptionsEdit(!!loan.personPhone)
  }

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (!editingLoan || !editPersonName || !editAmount) {
      toast.error(t('loans.errNameAmount'))
      return
    }

    const newAmount = parseFloat(editAmount)
    if (isNaN(newAmount) || newAmount <= 0) {
      toast.error(t('loans.errValidAmount'))
      return
    }
    if (editDueDate && editDueDate < editDate) {
      toast.error(t('loans.errDueBeforeDate'))
      return
    }
    if (!isValidBdPhone(editPersonPhone)) {
      toast.error(t('common.invalidPhone'))
      return
    }

    // Block only if the new TOTAL (initial + increases) would fall below what's
    // already paid — payments are against the total, not the initial amount.
    const totalPaid = getTotalPaid(editingLoan)
    const increasesTotal = editingLoan.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0
    if (round2(newAmount + increasesTotal) < totalPaid) {
      toast.error(t('loans.errAmountBelowPaid', { paid: fmtNum(totalPaid) }))
      return
    }

    confirm.update(
      t('loans.updateTitle'),
      t('loans.updateMessage', { name: editPersonName }),
      () => {
        // Returned only when total paid covers the full total (base + increases)
        const increasesTotal = editingLoan.increases?.reduce((sum, inc) => sum + inc.amount, 0) || 0
        const shouldBeReturned = round2(totalPaid) >= round2(newAmount + increasesTotal)

        const sourceId = editingLoan.id
        const dueName = editPersonName
        // Due reminder shows the outstanding balance (base + increases − paid),
        // not the raw base amount, so it stays correct after edits/payments.
        const dueAmt = round2(Math.max(0, newAmount + increasesTotal - totalPaid))
        const dueVal = editDueDate
        const dueLead = editReminderLead
        updateLoan(sourceId, {
          personName: editPersonName,
          personPhone: editPersonPhone.trim(),
          amount: newAmount,
          reason: editReason,
          date: editDate,
          dueDate: editDueDate || '',
          // promiseDate is intentionally NOT written here — it's now managed
          // independently via the "আবার মনে করিয়ে দিন" card action.
          returned: shouldBeReturned,
        }).then(() => {
          const newInstCount = parseInt(editInstCount, 10) || 0
          // True whether the plan already existed or is being created in this
          // same submit — either way, a standalone due reminder would
          // duplicate installment #1 (which always lands on the due date).
          const willHaveInstallmentPlan = editInstReminders.length > 0 || newInstCount > 1

          // Keep any promise-date reminder's frozen amount honest after an
          // amount edit.
          syncPromiseReminderAmount(sourceId, dueName, round2(Math.max(0, newAmount + increasesTotal - totalPaid)))
          // Existing কিস্তি reminders split the OLD total — if this plan
          // already existed (not the brand-new-plan branch below), rebalance
          // them across the new total.
          if (editInstReminders.length > 0) {
            syncInstallmentAmounts(sourceId, dueName, round2(newAmount + increasesTotal))
          }

          // Keep the linked due-date reminder in sync (update / create / delete
          // it, or delete it when an installment plan now covers it instead).
          getRemindersForSource(sourceId).then((all) => {
            // Only touch the due-date reminder — promise-date and installment
            // reminders share the same sourceId and must survive a due-date
            // edit untouched. Older reminders predate reminderKind, so an
            // undefined kind is treated as "due" (the original single-reminder shape).
            const linked = all.filter((r) => !r.reminderKind || r.reminderKind === 'due')
            if (dueVal && !willHaveInstallmentPlan) {
              const patch = {
                title: t('loans.dueReminderTitle', { name: dueName }),
                description: t('loans.dueReminderDesc', { name: dueName, amount: bn(dueAmt), date: bnDate(dueVal) }),
                scheduledTime: dueReminderTime(dueVal, dueLead),
                autoParams: { name: dueName, amount: dueAmt, date: dueVal },
              }
              if (linked.length) {
                linked.forEach((r) => updateReminder(r.id, patch).catch(console.error))
              } else {
                saveReminder({
                  id: crypto.randomUUID(), ...patch,
                  dismissed: false, createdAt: new Date().toISOString(),
                  sourceId, sourceType: 'loan', reminderKind: 'due',
                }).then(() => toast.info(t('loans.dueReminderCreated'))).catch(console.error)
              }
            } else if (linked.length) {
              linked.forEach((r) => deleteReminder(r.id).catch(console.error))
            }
          }).catch(console.error)

          // Set up a brand-new কিস্তি plan if this loan didn't already have
          // one (an existing plan is managed via handleCancelInstallmentPlan,
          // not overwritten here).
          if (editInstReminders.length === 0 && newInstCount > 1) {
            // Split the full outstanding total (base + increases), not just base.
            const planTotal = round2(newAmount + increasesTotal)
            const unit = editInstIntervalUnit
            const interval = unit === 'days' ? Math.max(1, parseInt(editInstIntervalDays, 10) || 30) : 1
            const start = new Date(dueVal || editDate)
            if (!isNaN(start.getTime())) {
              buildInstallmentDates(start, newInstCount, unit, interval).forEach((local, i) => {
                const per = instAmount(planTotal, newInstCount, i)
                saveReminder({
                  id: crypto.randomUUID(),
                  title: t('loans.instReminderTitle', { name: dueName, i: fmtInt(i + 1), n: fmtInt(newInstCount) }),
                  description: t('loans.instReminderDesc', { name: dueName, amount: bn(per) }),
                  scheduledTime: `${local}T09:00`,
                  dismissed: false,
                  createdAt: new Date().toISOString(),
                  sourceId, sourceType: 'loan', reminderKind: 'installment',
                  autoParams: { name: dueName, amount: per, i: i + 1, n: newInstCount },
                }).catch(console.error)
              })
              toast.info(t('loans.instCreated', { n: fmtInt(newInstCount) }))
            }
          }

          setEditingLoan(null)
          setEditPersonName('')
          setEditAmount('')
          setEditReason('')
          setEditDate('')
          setEditDueDate('')
          setShowMoreOptionsEdit(false)
          setEditInstReminders([])
          setEditInstCount('')
          setEditInstIntervalDays('30')
          setEditInstIntervalUnit('months')
          loadLoans().catch(console.error)
          toast.success(t('loans.updateSuccess'))
        }).catch((error) => {
          console.error('Error updating loan:', error)
          toast.error(t('loans.updateError'))
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
    setEditDueDate('')
    setShowMoreOptionsEdit(false)
    setEditInstReminders([])
    setEditInstCount('')
    setEditInstIntervalDays('30')
    setEditInstIntervalUnit('months')
  }

  // Delete every reminder in an existing installment plan at once.
  const handleCancelInstallmentPlan = () => {
    if (editInstReminders.length === 0 || !editingLoan) return
    const sourceId = editingLoan.id
    const dueVal = editDueDate
    const dueName = editPersonName
    // Show the outstanding balance on the restored due reminder, not raw base.
    const dueAmt = round2(Math.max(0, calculateRemaining(editingLoan)))
    const dueLead = editReminderLead
    confirm.delete(
      t('loans.instCancelTitle'),
      t('loans.instCancelMsg', { n: fmtInt(editInstReminders.length) }),
      () => {
        Promise.all(editInstReminders.map((r) => deleteReminder(r.id)))
          .then(() => {
            setEditInstReminders([])
            // The installment plan was the only thing covering the due date —
            // restore a standalone due reminder now that it's gone, otherwise
            // cancelling silently leaves the due date with no reminder at all.
            if (dueVal) {
              saveReminder({
                id: crypto.randomUUID(),
                title: t('loans.dueReminderTitle', { name: dueName }),
                description: t('loans.dueReminderDesc', { name: dueName, amount: bn(dueAmt), date: bnDate(dueVal) }),
                scheduledTime: dueReminderTime(dueVal, dueLead),
                dismissed: false,
                createdAt: new Date().toISOString(),
                sourceId, sourceType: 'loan', reminderKind: 'due',
                autoParams: { name: dueName, amount: dueAmt, date: dueVal },
              }).catch(console.error)
            }
            toast.success(t('loans.instCancelled'))
          })
          .catch(() => toast.error(t('loans.instCancelError')))
      }
    )
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
      toast.error(t('loans.errAmountDate'))
      return
    }

    const amount = Number(parseFloat(editPaymentAmount).toFixed(2))
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('loans.errValidAmount'))
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
      toast.error(t('loans.errOverpay', { remaining: fmtNum(remaining) }))
      return
    }

    const updatedPayment: Payment = {
      ...editingPayment.payment,
      amount,
      date: editPaymentDate,
      note: editPaymentNote || undefined,
    }

    confirm.update(
      t('loans.paymentUpdateTitle'),
      t('loans.paymentUpdateMessage', { amount: fmtNum(amount) }),
      () => {
        // Atomic in-place edit — a single transaction can't half-fail and lose
        // the payment the way a delete-then-add pair could.
        updateLoanPayment(editingPayment.loanId, editingPayment.payment.id, {
          amount: updatedPayment.amount,
          date: updatedPayment.date,
          note: updatedPayment.note,
        }).then(() => {
          syncPromiseReminderAmount(editingPayment.loanId, loan.personName, round2(remaining - amount))
          syncDueReminderAmount(editingPayment.loanId, loan.personName, round2(remaining - amount))
          setEditingPayment(null)
          setEditPaymentAmount('')
          setEditPaymentDate('')
          setEditPaymentNote('')
          loadLoans().catch(console.error)
          toast.success(t('loans.paymentUpdateSuccess'))
        }).catch((error) => {
          console.error('Error updating payment:', error)
          toast.error(t('loans.paymentUpdateError'))
        })
      }
    )
  }

  const handleEditIncreaseSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (!editingIncrease || !editIncreaseAmount || !editIncreaseDate) {
      toast.error(t('loans.errAmountDate'))
      return
    }

    const amount = Number(parseFloat(editIncreaseAmount).toFixed(2))
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('loans.errValidAmount'))
      return
    }

    const loan = loans.find(l => l.id === editingIncrease.loanId)
    if (!loan) return

    const otherIncreasesTotal = (loan.increases || [])
      .filter(i => i.id !== editingIncrease.increase.id)
      .reduce((sum, i) => sum + i.amount, 0)
    const newTotalAmount = round2(loan.amount + otherIncreasesTotal + amount)

    // Block an edit that would drop the total below what's already been paid,
    // which would silently discard collected money and force returned=true.
    const totalPaid = getTotalPaid(loan)
    if (newTotalAmount < totalPaid) {
      toast.error(t('loans.errAmountBelowPaid', { paid: fmtNum(totalPaid) }))
      return
    }

    const updatedIncrease: AmountIncrease = {
      ...editingIncrease.increase,
      amount,
      date: editIncreaseDate,
      reason: editIncreaseReason || undefined,
    }

    confirm.update(
      t('loans.increaseUpdateTitle'),
      t('loans.increaseUpdateMessage', { amount: fmtNum(amount) }),
      () => {
        // Atomic in-place edit (single transaction, no half-fail window).
        updateLoanIncrease(editingIncrease.loanId, editingIncrease.increase.id, {
          amount: updatedIncrease.amount,
          date: updatedIncrease.date,
          reason: updatedIncrease.reason,
        }).then(() => {
          syncPromiseReminderAmount(editingIncrease.loanId, loan.personName, round2(Math.max(0, newTotalAmount - getTotalPaid(loan))))
          syncDueReminderAmount(editingIncrease.loanId, loan.personName, round2(Math.max(0, newTotalAmount - getTotalPaid(loan))))
          syncInstallmentAmounts(editingIncrease.loanId, loan.personName, newTotalAmount)
          setEditingIncrease(null)
          setEditIncreaseAmount('')
          setEditIncreaseDate('')
          setEditIncreaseReason('')
          loadLoans().catch(console.error)
          toast.success(t('loans.increaseUpdateSuccess'))
        }).catch((error) => {
          console.error('Error updating increase:', error)
          toast.error(t('loans.increaseUpdateError'))
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

  const buildStatement = (loan: Loan): string => {
    const total = round2(loan.amount + (loan.increases?.reduce((s, i) => s + i.amount, 0) || 0))
    return `${t('loans.remaining')}: ৳${bn(calculateRemaining(loan))}\n${t('loans.total')}: ৳${bn(total)} · ${t('loans.paid')}: ৳${bn(getTotalPaid(loan))}\n${bnDate(loan.date)}`
  }

  const toastShareResult = (result: 'shared' | 'copied' | 'failed') => {
    if (result === 'shared') toast.success(t('share.shared'))
    else if (result === 'copied') toast.success(t('share.copied'))
    else toast.error(t('share.failed'))
  }

  const handleShareLoan = async (loan: Loan) => {
    toastShareResult(await shareOrCopy(loan.personName, buildStatement(loan)))
  }

  const handleSharePerson = async (name: string, personLoans: Loan[], total: number) => {
    const body = personLoans.map(buildStatement).join('\n\n')
    const text = `${t('person.totalDue')}: ৳${bn(total)}\n\n${body}`
    toastShareResult(await shareOrCopy(name, text))
  }

  const handleBulkPaid = () => {
    const ids = selectedLoans.map((l) => l.id)
    confirm.custom(
      t('select.markPaid'),
      t('select.bulkPaidConfirm', { count: fmtInt(ids.length) }),
      () => {
        Promise.all(ids.map((id) => {
          const l = loans.find((x) => x.id === id)
          if (!l) return updateLoan(id, { returned: true })
          const remaining = calculateRemaining(l)
          // Record a payment for the outstanding balance so পরিশোধ matches মোট
          // (addLoanPayment auto-sets returned when fully paid), mirroring the
          // single-card flow. No balance left → just flag returned.
          if (remaining > 0) {
            return addLoanPayment(id, {
              id: crypto.randomUUID(),
              amount: remaining,
              date: localDatetimeValue(),
              note: t('loans.fullPaymentNote'),
              createdAt: new Date().toISOString(),
              auto: true,
            })
          }
          return updateLoan(id, { returned: true })
        }))
          .then(() => {
            setSelectedIds(new Set())
            ids.forEach((id) => deleteRemindersForSource(id))
            loadLoans().catch(console.error)
            toast.success(t('select.bulkPaidDone'))
            haptic([20, 40, 20])
            celebrate()
          })
          .catch((error) => {
            console.error('Error bulk marking loans paid:', error)
            toast.error(t('loans.toggleError'))
          })
      },
      { confirmText: t('select.markPaid'), cancelText: t('common.cancel'), type: 'info' }
    )
  }

  const handleBulkDelete = () => {
    const ids = selectedLoans.map((l) => l.id)
    confirm.delete(
      t('select.delete'),
      t('select.bulkDeleteConfirm', { count: fmtInt(ids.length) }),
      () => {
        Promise.all(ids.map((id) => softDeleteLoan(id).then(() => deleteRemindersForSource(id))))
          .then(() => {
            setSelectedIds(new Set())
            loadLoans().catch(console.error)
            toast.success(t('select.bulkDeleteDone'))
          })
          .catch((error) => {
            console.error('Error bulk deleting loans:', error)
            toast.error(t('loans.deleteError'))
          })
      }
    )
  }

  if (!mounted) {
    return null
  }

  // Trash: soft-deleted docs are hidden from every live list, restorable below.
  const trashedLoans = loans.filter(l => !!l.deletedAt)
  const liveLoans = loans.filter(l => !l.deletedAt)
  const activeLoans = liveLoans.filter(l => !l.returned)
  const returnedLoans = liveLoans.filter(l => l.returned)
  
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

  // Selection: only active cards are selectable; total is their remaining sum.
  const selectedLoans = activeLoans.filter((l) => selectedIds.has(l.id))
  const selectedTotal = round2(selectedLoans.reduce((sum, l) => sum + calculateRemaining(l), 0))
  const selectedCount = selectedLoans.length

  // Search + filter + sort + view
  const now = Date.now()
  const isOverdue = (l: Loan) => !l.returned && !!l.dueDate && new Date(l.dueDate).getTime() < now
  const query = search.trim().toLowerCase()
  const matchesSearch = (l: Loan) => l.personName.toLowerCase().includes(query)

  const sortLoans = (list: Loan[]): Loan[] => {
    const arr = [...list]
    switch (sortBy) {
      case 'oldest':
        return arr.sort((a, b) => (toMillis(a.createdAt) || toMillis(a.date)) - (toMillis(b.createdAt) || toMillis(b.date)))
      case 'amountHigh':
        return arr.sort((a, b) => calculateRemaining(b) - calculateRemaining(a))
      case 'amountLow':
        return arr.sort((a, b) => calculateRemaining(a) - calculateRemaining(b))
      case 'nameAz':
        return arr.sort((a, b) => a.personName.localeCompare(b.personName))
      case 'recent':
      default:
        return arr.sort((a, b) => (toMillis(b.createdAt) || toMillis(b.date)) - (toMillis(a.createdAt) || toMillis(a.date)))
    }
  }

  const showActiveSection = filterBy === 'all' || filterBy === 'active' || filterBy === 'overdue'
  const showReturnedSection = filterBy === 'all' || filterBy === 'settled'

  let filteredActive = activeLoans.filter(matchesSearch)
  if (filterBy === 'overdue') filteredActive = filteredActive.filter(isOverdue)
  const displayActive = showActiveSection ? sortLoans(filteredActive) : []
  const displayReturned = showReturnedSection ? sortLoans(returnedLoans.filter(matchesSearch)) : []

  // By-person grouping (active loans only), sorted by total due desc
  const personGroups = Object.values(
    displayActive.reduce((acc, l) => {
      // Key on the trimmed name so "Rahim" and "Rahim " merge into one group
      // (matches the debts page).
      const key = l.personName.trim()
      if (!acc[key]) acc[key] = { name: key, loans: [], total: 0 }
      acc[key].loans.push(l)
      acc[key].total = round2(acc[key].total + calculateRemaining(l))
      return acc
    }, {} as Record<string, { name: string; loans: Loan[]; total: number }>)
  ).sort((a, b) => b.total - a.total)

  const nothingToShow = displayActive.length === 0 && displayReturned.length === 0
  const selectionActive = viewMode === 'list' && selectedCount > 0


  const numChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (/^\d*\.?\d*$/.test(v)) setter(v)
  }

  return (
    <div className="min-h-full">
      <AppBar title={t('loans.title')} subtitle={t('loans.subtitle')} />

      <div className={`max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in ${selectionActive ? 'pb-44' : ''}`}>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-tile tint-neg">
            <div className="flex items-center gap-2 mb-2 text-negative">
              <ArrowDownLeftIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-negative">{t('loans.statToPay')}</span>
            </div>
            <p className="text-[clamp(0.85rem,4.2vw,1.5rem)] font-bold text-content tracking-tight tabular-nums leading-tight">৳{bn(totalActive)}</p>
          </div>
          <div className="stat-tile tint-accent">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <WalletIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-accent">{t('loans.statReturned')}</span>
            </div>
            <p className="text-[clamp(0.85rem,4.2vw,1.5rem)] font-bold text-content tracking-tight tabular-nums leading-tight">৳{bn(totalReturned)}</p>
          </div>
        </div>

        {/* Search + filter + sort + view controls */}
        {!dataLoading && loans.length > 0 && (
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
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'active', 'settled', 'overdue'] as const).map((f) => (
                <button
                  key={f}
                  className={`chip ${filterBy === f ? 'chip-accent' : ''}`}
                  onClick={() => setFilterBy(f)}
                >
                  {t(`filter.${f}`)}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <SortIcon className="w-4 h-4 text-muted" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as LoanSortKey)}
                  className="input input-sm w-auto"
                  aria-label={t('sort.label')}
                >
                  <option value="recent">{t('sort.recent')}</option>
                  <option value="oldest">{t('sort.oldest')}</option>
                  <option value="amountHigh">{t('sort.amountHigh')}</option>
                  <option value="amountLow">{t('sort.amountLow')}</option>
                  <option value="nameAz">{t('sort.nameAz')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                className={`chip ${viewMode === 'list' ? 'chip-accent' : ''}`}
                onClick={() => setViewMode('list')}
              >
                {t('view.list')}
              </button>
              <button
                className={`chip ${viewMode === 'byPerson' ? 'chip-accent' : ''}`}
                onClick={() => setViewMode('byPerson')}
              >
                {t('view.byPerson')}
              </button>
              {trashedLoans.length > 0 && (
                <button type="button" className="chip flex-shrink-0" onClick={() => setShowTrash(true)}>
                  <TrashIcon className="w-3.5 h-3.5 inline-block mr-1" />{t('common.trash')} · {fmtInt(trashedLoans.length)}
                </button>
              )}
            </div>
          </div>
        )}

        {dataLoading ? (
          <ListSkeleton count={3} />
        ) : loans.length === 0 ? (
          <div className="text-center py-16">
            <MoneyIllustration tone="neg" className="w-56 h-40 mx-auto mb-2 ill-float" />
            <h3 className="text-base font-semibold text-content mb-1">{t('loans.emptyTitle')}</h3>
            <p className="text-sm text-muted mb-5">{t('loans.emptyDesc')}</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary mx-auto">
              <PlusIcon className="w-5 h-5" /> {t('loans.addFirst')}
            </button>
          </div>
        ) : viewMode === 'byPerson' ? (
          personGroups.length > 0 ? (
            <section className="space-y-3 list-stagger">
              <h2 className="text-sm font-semibold text-muted px-1 section-sticky">{t('loans.sectionActive')}</h2>
              {personGroups.map((g) => {
                const initial = g.name.trim().charAt(0).toUpperCase()
                return (
                  <div key={g.name} className="card bar-neg space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/person/${encodeURIComponent(g.name)}`} className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
                          style={{ backgroundColor: avatarColor(g.name).bg, color: avatarColor(g.name).fg }}
                        >{initial}</div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-content truncate">{g.name}</h3>
                          <p className="text-xs text-muted">{t('person.entries', { count: fmtInt(g.loans.length) })}</p>
                        </div>
                      </Link>
                      <button className="icon-btn flex-shrink-0" onClick={() => handleSharePerson(g.name, g.loans, g.total)} title={t('share.action')} aria-label={t('share.action')}><ShareIcon className="w-5 h-5" /></button>
                    </div>
                    <div className="flex items-center justify-between rounded-xl tint-neg px-3 py-2">
                      <span className="text-sm text-muted">{t('person.totalDue')}</span>
                      <span className="text-base font-semibold text-negative">৳{bn(g.total)}</span>
                    </div>
                  </div>
                )
              })}
            </section>
          ) : (
            <div className="text-center py-12"><NoResultsIllustration className="w-48 h-28 mx-auto mb-3" /><p className="text-muted text-sm">{t('search.noResults')}</p></div>
          )
        ) : nothingToShow ? (
          <div className="text-center py-12"><NoResultsIllustration className="w-48 h-28 mx-auto mb-3" /><p className="text-muted text-sm">{t('search.noResults')}</p></div>
        ) : (
          <>
            {showActiveSection && displayActive.length > 0 && (
              <section className="space-y-3 list-stagger">
                <h2 className="text-sm font-semibold text-muted px-1 section-sticky">{t('loans.sectionActive')}</h2>
                {displayActive.map((loan) => {
                  const remaining = calculateRemaining(loan)
                  const totalPaid = getTotalPaid(loan)
                  const total = round2(loan.amount + (loan.increases?.reduce((s, i) => s + i.amount, 0) || 0))
                  const pct = total > 0 ? Math.min(100, Math.round((totalPaid / total) * 100)) : 0
                  const isSelected = selectedIds.has(loan.id)
                  return (
                    <div key={loan.id} className={`card bar-neg space-y-4 transition-shadow ${isSelected ? 'ring-2 ring-accent' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            onClick={() => toggleSelect(loan.id)}
                            className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${isSelected ? 'bg-accent border-accent text-accent-fg' : 'border-line text-transparent'}`}
                            aria-label={t('select.selectItem')}
                            aria-pressed={isSelected}
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                          <div className="min-w-0">
                            <Link href={`/person/${encodeURIComponent(loan.personName)}`} className="font-semibold text-content truncate block hover:text-accent transition-colors">{loan.personName}</Link>
                            <p className="text-xs text-muted truncate">
                              {bnDate(loan.date)}{getInitialReason(loan) ? ` · ${getInitialReason(loan)}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {loan.personPhone && (
                            <>
                              <a className="icon-btn" href={`tel:${loan.personPhone}`} title={t('common.call')}><PhoneIcon className="w-5 h-5" /></a>
                              <a
                                className="icon-btn"
                                href={waLink(loan.personPhone, t('loans.waNudge', { name: loan.personName, amount: bn(remaining) }))}
                                target="_blank" rel="noopener noreferrer"
                                title={t('common.whatsapp')}
                              ><WhatsAppIcon className="w-5 h-5" /></a>
                            </>
                          )}
                          <button className="icon-btn" onClick={() => handleShareLoan(loan)} title={t('share.action')} aria-label={t('share.action')}><ShareIcon className="w-5 h-5" /></button>
                          <button className="icon-btn" onClick={() => handleEdit(loan)} title={t('common.edit')}><EditIcon className="w-5 h-5" /></button>
                          <button className="icon-btn" onClick={() => handleDelete(loan.id)} title={t('common.delete')}><TrashIcon className="w-5 h-5" /></button>
                        </div>
                      </div>

                      {/* Due date (formal deadline — amber/red, urgency-coded) and
                          promise date (a verbal check-in — accent/indigo, never
                          confused for urgency) are deliberately on separate rows
                          with different colors: they answer different questions
                          ("when is it formally due" vs "what did I tell them"). */}
                      {loan.dueDate && (
                        <div className="flex items-center gap-2 flex-wrap -mt-2">
                          {dueBadge(loan.dueDate)}
                          <span className="text-xs text-muted whitespace-nowrap">{t('due.on', { date: bnDate(loan.dueDate) })}</span>
                        </div>
                      )}
                      {/* Tap to set/change a "remind me again" follow-up date —
                          replaces the old always-visible form field entirely. */}
                      <div className="flex items-center -mt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPromiseModal(loan)}
                          className={`chip text-[11px] flex items-center gap-1 ${loan.promiseDate ? 'tint-accent text-accent' : ''}`}
                        >
                          <MessageIcon className="w-3 h-3 flex-shrink-0" />
                          {loan.promiseDate ? t('loans.promiseChip', { date: bnDate(loan.promiseDate) }) : t('loans.promiseCta')}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div><p className="text-xs text-muted mb-0.5">{t('loans.total')}</p><p className="text-sm font-semibold text-content">৳{bn(total)}</p></div>
                        <div><p className="text-xs text-muted mb-0.5">{t('loans.paid')}</p><p className="text-sm font-semibold text-positive">৳{bn(totalPaid)}</p></div>
                        <div><p className="text-xs text-muted mb-0.5">{t('loans.remaining')}</p><p className="text-sm font-semibold text-negative">৳{bn(remaining)}</p></div>
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
                        onClick={() => toggleExpand(loan.id)}
                        aria-expanded={expandedIds.has(loan.id)}
                      >
                        {expandedIds.has(loan.id) ? t('common.showLess') : t('common.details')}
                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${expandedIds.has(loan.id) ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedIds.has(loan.id) && (<div className="space-y-4 fade-in">
                      {loan.payments && loan.payments.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-positive">{t('loans.paymentHistory')}</p>
                          <div className="timeline space-y-1.5">
                          {loan.payments.map((p) => (
                            <div key={p.id} className="timeline-row flex items-center justify-between rounded-xl tint-pos px-3 py-2">
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
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-accent">{t('loans.initialLoan')}</p>
                        <div className="flex items-center justify-between rounded-xl tint-accent px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-content">৳{bn(getInitialAmount(loan))}</p>
                            <p className="text-xs text-muted truncate">{bnDate(loan.date)}{getInitialReason(loan) ? ` · ${getInitialReason(loan)}` : ''}</p>
                          </div>
                        </div>
                      </div>

                      {loan.increases && loan.increases.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-caution">{t('loans.amountIncrease')}</p>
                          {loan.increases.map((inc, idx) => {
                            const runningTotal = round2(loan.amount + (loan.increases ?? []).slice(0, idx + 1).reduce((s, i) => s + i.amount, 0))
                            return (
                              <div key={inc.id} className="flex items-center justify-between rounded-xl tint-warn px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-caution">+৳{bn(inc.amount)} <span className="text-muted font-normal">→ {t('loans.total')} ৳{bn(runningTotal)}</span></p>
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

                      </div>)}

                      <div className="flex gap-2 pt-1">
                        <button className="btn btn-secondary flex-1" onClick={() => handleOpenIncreaseModal(loan.id)}>{t('loans.increaseBtn')}</button>
                        {remaining > 0 ? (
                          <button className="btn btn-primary flex-1" onClick={() => handleOpenPaymentModal(loan.id)}>
                            <CheckIcon className="w-4 h-4" /> {t('loans.paidBackBtn')}
                          </button>
                        ) : (
                          <button className="btn btn-primary flex-1" onClick={() => handleToggleReturned(loan)}>
                            <CheckIcon className="w-4 h-4" /> {t('loans.markPaid')}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </section>
            )}

            {showReturnedSection && displayReturned.length > 0 && (
              <section className="space-y-3 list-stagger">
                <h2 className="text-sm font-semibold text-muted px-1 section-sticky">{t('loans.sectionReturned')}</h2>
                {displayReturned.map((loan) => {
                  const totalPaid = getTotalPaid(loan)
                  const total = round2(loan.amount + (loan.increases?.reduce((s, i) => s + i.amount, 0) || 0))
                  return (
                    <div key={loan.id} className="card card-settled bar-muted space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="badge badge-success">{t('loans.paid')}</span>
                            <Link href={`/person/${encodeURIComponent(loan.personName)}`} className="font-semibold text-content truncate hover:text-accent transition-colors">{loan.personName}</Link>
                          </div>
                          <p className="text-xs text-muted mt-1">{t('loans.total')} ৳{bn(total)} · {t('loans.paidLabel')} ৳{bn(totalPaid)}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button className="icon-btn" onClick={() => handleShareLoan(loan)} title={t('share.action')} aria-label={t('share.action')}><ShareIcon className="w-5 h-5" /></button>
                          <button className="icon-btn" onClick={() => handleToggleReturned(loan)} title={t('loans.confirmNotReturned')}><RotateIcon className="w-5 h-5" /></button>
                          <button className="icon-btn" onClick={() => handleDelete(loan.id)} title={t('common.delete')}><TrashIcon className="w-5 h-5" /></button>
                        </div>
                      </div>
                      {loan.payments && loan.payments.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-positive">{t('loans.paymentHistory')}</p>
                          <div className="timeline space-y-1.5">
                          {loan.payments.map((p) => (
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
      {selectionActive && (
        <div
          className="fixed left-0 right-0 z-40 px-4"
          style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-2xl mx-auto card bar-neg shadow-pop py-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted truncate">{t('select.count', { count: fmtInt(selectedCount) })} · {t('select.totalDue')}</p>
                <p className="text-xl font-bold text-negative">৳{bn(selectedTotal)}</p>
              </div>
              <button className="btn btn-secondary text-xs px-3 py-2 flex-shrink-0" onClick={() => setSelectedIds(new Set())}>
                {t('select.clear')}
              </button>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" onClick={handleBulkPaid}>
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
      {!selectionActive && (
        <button className="fab" onClick={() => setShowForm(true)} aria-label={t('loans.addNew')}>
          <PlusIcon className="w-6 h-6" />
        </button>
      )}

      {/* "আবার মনে করিয়ে দিন" — set/change/clear a follow-up promise reminder */}
      <Modal
        isOpen={promiseModalId !== null}
        onClose={handleClosePromiseModal}
        title={t('loans.promiseModalTitle')}
        footerActions={<>
          {loans.find((l) => l.id === promiseModalId)?.promiseDate && (
            <ActionButton onClick={handleClearPromiseReminder} variant="secondary">{t('loans.promiseClear')}</ActionButton>
          )}
          <ActionButton onClick={handleClosePromiseModal} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={handleSavePromiseReminder} variant="primary">{t('loans.promiseSave')}</ActionButton>
        </>}
      >
        <div>
          <label className="label">{t('loans.promiseModalLabel')}</label>
          <input
            type="datetime-local"
            value={promiseModalDate}
            min={(() => { const l = loans.find((x) => x.id === promiseModalId); return l ? l.date.slice(0, 16) : undefined })()}
            onChange={(e) => setPromiseModalDate(e.target.value)}
            className="input"
          />
          <p className="text-xs text-muted mt-1">{t('loans.promiseModalHelp')}</p>
        </div>
      </Modal>

      {/* Trash: soft-deleted loans — restore or purge permanently */}
      <Modal
        isOpen={showTrash}
        onClose={() => setShowTrash(false)}
        title={t('common.trash')}
        footerActions={<>
          {trashedLoans.length > 0 && (
            <ActionButton onClick={handleEmptyTrash} variant="danger">{t('common.trashEmptyAll')}</ActionButton>
          )}
          <ActionButton onClick={() => setShowTrash(false)} variant="secondary">{t('common.close')}</ActionButton>
        </>}
      >
        {trashedLoans.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">{t('common.trashEmpty')}</p>
        ) : (
          <div className="space-y-2">
            {trashedLoans.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-content truncate">{l.personName} — ৳{bn(round2(l.amount + (l.increases?.reduce((s, i) => s + i.amount, 0) || 0)))}</p>
                  <p className="text-xs text-muted">{l.deletedAt ? bnDate(l.deletedAt) : ''}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button className="icon-btn w-8 h-8" onClick={() => handleRestore(l.id)} title={t('common.trashRestore')}><RotateIcon className="w-4 h-4" /></button>
                  <button className="icon-btn w-8 h-8 text-negative" onClick={() => handlePurge(l.id)} title={t('common.trashPurge')}><TrashIcon className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Add loan */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={t('loans.addNew')}
        footerActions={<>
          <ActionButton onClick={() => setShowForm(false)} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={(e) => e && handleSubmit(e)} variant="primary" loading={saving}>{t('common.save')}</ActionButton>
        </>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label label-required">{t('loans.personName')}</label>
            <input type="text" value={personName} onChange={(e) => setPersonName(e.target.value)} className="input" placeholder={t('loans.personPlaceholder')} required />
          </div>
          <div>
            <label className="label label-required">{t('loans.amountLabel')}</label>
            <input type="text" inputMode="decimal" value={amount} onChange={numChange(setAmount)} className="input" placeholder={t('loans.zero')} required />
          </div>
          <div>
            <label className="label">{t('loans.initialReasonOptional')}</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input min-h-[80px] resize-none" placeholder={t('loans.reasonPlaceholder')} rows={3} />
          </div>
          <div>
            <label className="label label-required">{t('common.date')}</label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">{t('loans.dueDateOptional')}</label>
            <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={date || undefined} className="input" />
            <p className="text-xs text-muted mt-1">{t('loans.dueDateHelp')}</p>
          </div>
          {dueDate && (
          <div>
            <label className="label">{t('lead.label')}</label>
            <select value={reminderLead} onChange={(e) => setReminderLead(e.target.value as LeadKey)} className="input">
              {LEAD_OPTIONS.map((o) => <option key={o} value={o}>{t(`lead.${o}`)}</option>)}
            </select>
          </div>
          )}

          {/* Phone / promise date / কিস্তি are secondary — collapsed by default
              so the common case (name, amount, date, maybe a due date) stays a
              short form. */}
          <button
            type="button"
            onClick={() => setShowMoreOptions((v) => !v)}
            className="flex items-center gap-1 text-sm font-medium text-accent"
          >
            {showMoreOptions ? t('loans.lessOptions') : t('loans.moreOptions')}
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showMoreOptions ? 'rotate-180' : ''}`} />
          </button>

          {showMoreOptions && (<>
          <div>
            <label className="label">{t('common.phoneOptional')}</label>
            <input type="tel" inputMode="tel" value={personPhone} onChange={(e) => setPersonPhone(e.target.value)} className="input" placeholder="01XXXXXXXXX" />
          </div>
          {/* No promise-date field here — it's a post-creation card action now
              (see handleOpenPromiseModal), not something you set up front. */}
          {/* কিস্তি: split into N installments with a reminder per installment */}
          <div>
            <label className="label">{t('loans.instCountLabel')}</label>
            <input type="text" inputMode="numeric" value={instCount} onChange={(e) => setInstCount(e.target.value.replace(/\D/g, ''))} className="input" placeholder={t('loans.instCountPlaceholder')} />
          </div>
          {parseInt(instCount, 10) > 1 && (
            <div>
              <label className="label">{t('loans.instIntervalLabel')}</label>
              <div className="flex gap-2">
                {(['weeks', 'months', 'days'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setInstIntervalUnit(u)}
                    className={`chip ${instIntervalUnit === u ? 'chip-accent' : ''}`}
                  >
                    {t(`loans.interval${u === 'weeks' ? 'Weekly' : u === 'months' ? 'Monthly' : 'Custom'}`)}
                  </button>
                ))}
              </div>
              {instIntervalUnit === 'days' && (
                <input
                  type="text" inputMode="numeric" value={instIntervalDays}
                  onChange={(e) => setInstIntervalDays(e.target.value.replace(/\D/g, ''))}
                  className="input mt-2" placeholder={t('loans.instCustomDaysPlaceholder')}
                />
              )}
            </div>
          )}
          {parseInt(instCount, 10) > 1 && amount && (
            <p className="text-xs text-muted -mt-2">{t('loans.instPreview', { n: fmtInt(parseInt(instCount, 10)), per: bn(round2((parseFloat(amount) || 0) / parseInt(instCount, 10))) })}</p>
          )}
          </>)}
        </form>
      </Modal>

      {/* Edit loan */}
      <Modal
        isOpen={editingLoan !== null}
        onClose={handleCancelEdit}
        title={t('loans.editTitle')}
        footerActions={<>
          <ActionButton onClick={handleCancelEdit} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={(e) => e && handleEditSubmit(e)} variant="primary">{t('loans.updateBtn')}</ActionButton>
        </>}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="label label-required">{t('loans.personName')}</label>
            <input type="text" value={editPersonName} onChange={(e) => setEditPersonName(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label label-required">{t('loans.amountLabel')}</label>
            <input type="text" inputMode="decimal" value={editAmount} onChange={numChange(setEditAmount)} className="input" required />
          </div>
          <div>
            <label className="label">{t('loans.initialReasonOptional')}</label>
            <textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} className="input min-h-[80px] resize-none" rows={3} />
          </div>
          <div>
            <label className="label label-required">{t('common.date')}</label>
            <input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">{t('loans.dueDateOptional')}</label>
            <input type="datetime-local" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} min={editDate || undefined} className="input" />
            <p className="text-xs text-muted mt-1">{t('loans.dueDateHelp')}</p>
          </div>
          {editDueDate && (
          <div>
            <label className="label">{t('lead.label')}</label>
            <select value={editReminderLead} onChange={(e) => setEditReminderLead(e.target.value as LeadKey)} className="input">
              {LEAD_OPTIONS.map((o) => <option key={o} value={o}>{t(`lead.${o}`)}</option>)}
            </select>
          </div>
          )}

          <button
            type="button"
            onClick={() => setShowMoreOptionsEdit((v) => !v)}
            className="flex items-center gap-1 text-sm font-medium text-accent"
          >
            {showMoreOptionsEdit ? t('loans.lessOptions') : t('loans.moreOptions')}
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showMoreOptionsEdit ? 'rotate-180' : ''}`} />
          </button>

          {showMoreOptionsEdit && (<>
          <div>
            <label className="label">{t('common.phoneOptional')}</label>
            <input type="tel" inputMode="tel" value={editPersonPhone} onChange={(e) => setEditPersonPhone(e.target.value)} className="input" placeholder="01XXXXXXXXX" />
          </div>
          {/* No promise-date field here — it's a post-creation card action now
              (see handleOpenPromiseModal), not part of this form. */}

          {/* কিস্তি: show/cancel an existing plan, or set one up for this loan */}
          {editInstReminders.length > 0 ? (
            <div className="rounded-xl bg-surface-2 p-3 space-y-2">
              <p className="text-sm font-medium text-content">{t('loans.instPlanSummary', { n: fmtInt(editInstReminders.length) })}</p>
              <button type="button" className="btn btn-danger text-xs px-3 py-2" onClick={handleCancelInstallmentPlan}>
                {t('loans.instCancelPlan')}
              </button>
            </div>
          ) : (<>
            <div>
              <label className="label">{t('loans.instCountLabel')}</label>
              <input type="text" inputMode="numeric" value={editInstCount} onChange={(e) => setEditInstCount(e.target.value.replace(/\D/g, ''))} className="input" placeholder={t('loans.instCountPlaceholder')} />
            </div>
            {parseInt(editInstCount, 10) > 1 && (
              <div>
                <label className="label">{t('loans.instIntervalLabel')}</label>
                <div className="flex gap-2">
                  {(['weeks', 'months', 'days'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setEditInstIntervalUnit(u)}
                      className={`chip ${editInstIntervalUnit === u ? 'chip-accent' : ''}`}
                    >
                      {t(`loans.interval${u === 'weeks' ? 'Weekly' : u === 'months' ? 'Monthly' : 'Custom'}`)}
                    </button>
                  ))}
                </div>
                {editInstIntervalUnit === 'days' && (
                  <input
                    type="text" inputMode="numeric" value={editInstIntervalDays}
                    onChange={(e) => setEditInstIntervalDays(e.target.value.replace(/\D/g, ''))}
                    className="input mt-2" placeholder={t('loans.instCustomDaysPlaceholder')}
                  />
                )}
              </div>
            )}
            {parseInt(editInstCount, 10) > 1 && editAmount && (
              <p className="text-xs text-muted -mt-2">{t('loans.instPreview', { n: fmtInt(parseInt(editInstCount, 10)), per: bn(round2((parseFloat(editAmount) || 0) / parseInt(editInstCount, 10))) })}</p>
            )}
          </>)}
          </>)}
        </form>
      </Modal>

      {/* Edit payment */}
      <Modal
        isOpen={editingPayment !== null}
        onClose={handleCancelPaymentEdit}
        title={t('loans.editPaymentTitle')}
        footerActions={<>
          <ActionButton onClick={handleCancelPaymentEdit} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={(e) => e && handleEditPaymentSubmit(e)} variant="primary">{t('loans.updateBtn')}</ActionButton>
        </>}
      >
        <form onSubmit={handleEditPaymentSubmit} className="space-y-4">
          <div>
            <label className="label label-required">{t('loans.amountLabel')}</label>
            <input type="text" inputMode="decimal" value={editPaymentAmount} onChange={numChange(setEditPaymentAmount)} className="input" required />
          </div>
          <div>
            <label className="label label-required">{t('common.date')}</label>
            <input type="datetime-local" value={editPaymentDate} onChange={(e) => setEditPaymentDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">{t('loans.noteOptional')}</label>
            <input type="text" value={editPaymentNote} onChange={(e) => setEditPaymentNote(e.target.value)} className="input" placeholder={t('loans.paymentNotePlaceholder')} />
          </div>
        </form>
      </Modal>

      {/* Edit increase */}
      <Modal
        isOpen={editingIncrease !== null}
        onClose={handleCancelIncreaseEdit}
        title={t('loans.editIncreaseTitle')}
        footerActions={<>
          <ActionButton onClick={handleCancelIncreaseEdit} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={(e) => e && handleEditIncreaseSubmit(e)} variant="primary">{t('loans.updateBtn')}</ActionButton>
        </>}
      >
        <form onSubmit={handleEditIncreaseSubmit} className="space-y-4">
          <div>
            <label className="label label-required">{t('loans.amountLabel')}</label>
            <input type="text" inputMode="decimal" value={editIncreaseAmount} onChange={numChange(setEditIncreaseAmount)} className="input" required />
          </div>
          <div>
            <label className="label label-required">{t('common.date')}</label>
            <input type="datetime-local" value={editIncreaseDate} onChange={(e) => setEditIncreaseDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">{t('loans.reasonOptional')}</label>
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
            title={t('loans.paidBackBtn')}
            footerActions={<>
              <ActionButton onClick={handleClosePaymentModal} variant="secondary">{t('common.cancel')}</ActionButton>
              <ActionButton onClick={() => handleAddPayment(showPaymentModal)} variant="primary" loading={saving}>{t('common.save')}</ActionButton>
            </>}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
                <span className="text-sm text-muted">{t('loans.remaining')}</span>
                <span className="text-base font-semibold text-negative">৳{bn(rem)}</span>
              </div>
              <div>
                <label className="label label-required">{t('loans.howMuchReturned')}</label>
                <input type="text" inputMode="decimal" value={paymentAmount} onChange={numChange(setPaymentAmount)} className="input" placeholder={t('loans.zero')} />
                <button type="button" className="chip chip-accent mt-2" onClick={() => setPaymentAmount(String(rem))}>
                  {t('loans.fullReturnChip', { amount: bn(rem) })}
                </button>
              </div>
              <div>
                <label className="label label-required">{t('common.date')}</label>
                <input type="datetime-local" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">{t('loans.noteOptional')}</label>
                <textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className="input min-h-[80px] resize-none" placeholder={t('loans.returnNotePlaceholder')} rows={3} />
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
          title={t('loans.increaseTitle')}
          footerActions={<>
            <ActionButton onClick={handleCloseIncreaseModal} variant="secondary">{t('common.cancel')}</ActionButton>
            <ActionButton onClick={() => handleIncreaseLoanAmount(showIncreaseModal)} variant="primary" loading={saving}>{t('common.save')}</ActionButton>
          </>}
        >
          <div className="space-y-4">
            <div>
              <label className="label label-required">{t('loans.increaseAmountLabel')}</label>
              <input type="text" inputMode="decimal" value={increaseAmount} onChange={numChange(setIncreaseAmount)} className="input" placeholder={t('loans.zero')} />
            </div>
            <div>
              <label className="label label-required">{t('common.date')}</label>
              <input type="datetime-local" value={increaseDate} onChange={(e) => setIncreaseDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">{t('loans.reasonOptional')}</label>
              <textarea value={increaseReason} onChange={(e) => setIncreaseReason(e.target.value)} className="input min-h-[80px] resize-none" placeholder={t('loans.increaseReasonPlaceholder')} rows={3} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
