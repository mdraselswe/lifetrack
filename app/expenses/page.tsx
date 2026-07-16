'use client'

import { useEffect, useState, useRef, type FormEvent } from 'react'
import { subscribeToExpenses, saveExpense, updateExpense, deleteExpense, getUserPrefs, setUserPrefs } from '@/lib/storage'
import type { Expense, ExpenseCategory } from '@/lib/types'
import { t, useLang, fmtNum, fmtInt, fmtDate } from '@/lib/i18n'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'
import Modal, { ActionButton } from '@/components/Modal'
import { useAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'
import { ListSkeleton } from '@/components/SkeletonLoader'
import AppBar from '@/components/AppBar'
import { WalletIcon, ChartIcon, PlusIcon, EditIcon, TrashIcon } from '@/components/Icons'
import { MoneyIllustration } from '@/components/Illustrations'

const bn = (n: number) => fmtNum(n)

// 7 distinct category colors (dots, bars)
const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: '#f97316', // orange
  transport: '#3b82f6', // blue
  bills: '#eab308', // yellow
  shopping: '#ec4899', // pink
  health: '#10b981', // emerald
  education: '#8b5cf6', // violet
  other: '#64748b', // slate
}
const CATEGORIES = Object.keys(CATEGORY_COLORS) as ExpenseCategory[]
const catLabel = (c: ExpenseCategory) => t(`expenses.cat.${c}`)

// Local (not UTC) YYYY-MM-DD — <input type="date"> expects a local wall-clock value.
const localDateValue = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const monthKeyOf = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const round2 = (n: number) => Math.round(n * 100) / 100

export default function ExpensesPage() {
  useLang() // re-render on language switch
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  // 'YYYY-MM' — seeded after mount; new Date() must not run during prerender.
  const [month, setMonth] = useState('')
  const [budget, setBudget] = useState<number | null>(null)
  const [filterCat, setFilterCat] = useState<'all' | ExpenseCategory>('all')

  // Add/edit modal state
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | null>(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')

  // Budget modal state
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false) // synchronous guard against double-submit
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    // Seed dates after mount (Cache Components forbids Date during prerender)
    setMonth(monthKeyOf())
    setDate(localDateValue())
  }, [])

  // Realtime sync across all devices
  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    setDataLoading(true)
    const unsubscribe = subscribeToExpenses(user.uid, (data) => {
      setExpenses(data)
      setDataLoading(false)
    })
    getUserPrefs()
      .then((prefs) => setBudget(typeof prefs.monthlyBudget === 'number' ? prefs.monthlyBudget : null))
      .catch((error) => console.error('Error loading prefs:', error))
    return () => unsubscribe()
  }, [user, loading, router])

  const numChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (/^\d*\.?\d*$/.test(v)) setter(v)
  }

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(monthKeyOf(d))
  }

  const monthLabel = () => {
    const [y, m] = month.split('-').map(Number)
    return `${t(`expenses.month.${m - 1}`)} ${fmtInt(y)}`
  }

  const openAddForm = () => {
    setEditingExpense(null)
    setAmount('')
    setCategory(null)
    setNote('')
    setDate(localDateValue())
    setShowForm(true)
  }

  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense)
    setAmount(expense.amount.toString())
    setCategory(expense.category)
    setNote(expense.note || '')
    setDate(expense.date)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingExpense(null)
    setAmount('')
    setCategory(null)
    setNote('')
    setDate(localDateValue())
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (savingRef.current) return

    const parsedAmount = parseFloat(amount)
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('expenses.errAmount'))
      return
    }
    if (!category) {
      toast.error(t('expenses.errCategory'))
      return
    }
    if (!date) {
      toast.error(t('expenses.errDate'))
      return
    }

    savingRef.current = true
    setSaving(true)
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          amount: round2(parsedAmount),
          category,
          note: note.trim(), // '' clears a previous note (undefined would be stripped)
          date,
        })
        toast.success(t('expenses.updateSuccess'))
      } else {
        const expense: Expense = {
          id: Date.now().toString(), // stripped internally by saveExpense
          amount: round2(parsedAmount),
          category,
          ...(note.trim() && { note: note.trim() }),
          date,
          createdAt: new Date().toISOString(),
        }
        await saveExpense(expense)
        toast.success(t('expenses.addSuccess'))
      }
      closeForm()
      // Jump to the saved expense's month so the new entry is visible
      if (date.length >= 7) setMonth(date.slice(0, 7))
    } catch (error) {
      console.error('Error saving expense:', error)
      toast.error(t(editingExpense ? 'expenses.updateError' : 'expenses.addError'))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const handleDelete = (expense: Expense) => {
    confirm.delete(
      t('expenses.deleteTitle'),
      t('expenses.deleteMsg', { amount: bn(expense.amount) }),
      () => {
        deleteExpense(expense.id).then(() => {
          toast.success(t('expenses.deleteSuccess'))
        }).catch((error) => {
          console.error('Error deleting expense:', error)
          toast.error(t('expenses.deleteError'))
        })
      }
    )
  }

  const openBudgetModal = () => {
    setBudgetInput(budget != null ? String(budget) : '')
    setShowBudgetModal(true)
  }

  const handleSaveBudget = async () => {
    if (savingRef.current) return
    const parsed = parseFloat(budgetInput)
    if (!budgetInput || !Number.isFinite(parsed) || parsed <= 0) {
      toast.error(t('expenses.errValidBudget'))
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      await setUserPrefs({ monthlyBudget: round2(parsed) })
      setBudget(round2(parsed))
      setShowBudgetModal(false)
      toast.success(t('expenses.budgetSaved'))
    } catch (error) {
      console.error('Error saving budget:', error)
      toast.error(t('expenses.budgetError'))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  if (!mounted || !month) {
    return null
  }
  if (!user) {
    return null
  }

  // ---- Derived data for the selected month ----
  const monthExpenses = expenses.filter((e) => e.date.startsWith(month))
  const monthTotal = round2(monthExpenses.reduce((sum, e) => sum + e.amount, 0))

  const visibleExpenses = filterCat === 'all' ? monthExpenses : monthExpenses.filter((e) => e.category === filterCat)

  // Group by date, newest day first; newest entry first within a day
  const groups = (() => {
    const map = new Map<string, Expense[]>()
    for (const e of visibleExpenses) {
      const arr = map.get(e.date)
      if (arr) arr.push(e)
      else map.set(e.date, [e])
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([day, items]) => ({
        day,
        items: [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        total: round2(items.reduce((s, e) => s + e.amount, 0)),
      }))
  })()

  // Per-category breakdown (whole month, ignoring the chip filter)
  const breakdown = CATEGORIES
    .map((c) => ({
      category: c,
      total: round2(monthExpenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0)),
    }))
    .filter((b) => b.total > 0)
    .sort((a, b) => b.total - a.total)
  const breakdownMax = breakdown.length > 0 ? breakdown[0].total : 0

  // Budget tile numbers
  const budgetRemaining = budget != null ? round2(budget - monthTotal) : null
  const overBudget = budget != null && monthTotal > budget
  const budgetPct = budget != null && budget > 0 ? Math.min(100, Math.round((monthTotal / budget) * 100)) : 0

  return (
    <div className="min-h-full">
      <AppBar title={t('expenses.title')} subtitle={t('expenses.subtitle')} />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
        {/* Month navigation */}
        <div className="flex items-center justify-between gap-2">
          <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label={t('expenses.prevMonth')}>
            <span className="text-xl leading-none" aria-hidden="true">‹</span>
          </button>
          <h2 className="text-base font-semibold text-content">{monthLabel()}</h2>
          <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label={t('expenses.nextMonth')}>
            <span className="text-xl leading-none" aria-hidden="true">›</span>
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-tile tint-neg">
            <div className="flex items-center gap-2 mb-2 text-negative">
              <WalletIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-negative">{t('expenses.statMonthTotal')}</span>
            </div>
            <p className="text-[clamp(0.85rem,4.2vw,1.5rem)] font-bold text-content tracking-tight tabular-nums leading-tight">৳{bn(monthTotal)}</p>
            <p className="text-[11px] text-muted mt-1">{t('expenses.entriesCount', { count: fmtInt(monthExpenses.length) })}</p>
          </div>
          <div className={`stat-tile ${overBudget ? 'tint-warn' : 'tint-accent'}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-accent min-w-0">
                <ChartIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs font-medium text-accent truncate">{t('expenses.statBudget')}</span>
              </div>
              <button
                className="icon-btn w-7 h-7 flex-shrink-0"
                onClick={openBudgetModal}
                title={budget != null ? t('expenses.editBudget') : t('expenses.setBudget')}
              >
                <EditIcon className="w-4 h-4" />
              </button>
            </div>
            {budget != null ? (
              <>
                <p className="text-[clamp(0.85rem,4.2vw,1.5rem)] font-bold text-content tracking-tight tabular-nums leading-tight">৳{bn(budget)}</p>
                <p className={`text-[11px] mt-1 ${overBudget ? 'text-negative font-medium' : 'text-muted'}`}>
                  {overBudget
                    ? t('expenses.overBudget', { amount: bn(round2(monthTotal - budget)) })
                    : t('expenses.remaining', { amount: bn(budgetRemaining ?? 0) })}
                </p>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all ${overBudget ? 'bg-negative' : budgetPct >= 80 ? 'bg-caution' : 'bg-positive'}`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">{t('expenses.noBudget')}</p>
                <button className="chip chip-accent mt-2" onClick={openBudgetModal}>
                  {t('expenses.setBudget')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterCat('all')}
            className={`chip ${filterCat === 'all' ? 'chip-accent' : ''}`}
          >
            {t('expenses.filterAll')}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilterCat(c)}
              className={`chip ${filterCat === c ? 'chip-accent' : ''}`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                style={{ backgroundColor: CATEGORY_COLORS[c] }}
                aria-hidden="true"
              />
              {catLabel(c)}
            </button>
          ))}
        </div>

        {dataLoading ? (
          <ListSkeleton count={3} />
        ) : monthExpenses.length === 0 ? (
          <div className="text-center py-16">
            <MoneyIllustration className="w-56 h-40 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-content mb-1">{t('expenses.emptyTitle')}</h3>
            <p className="text-sm text-muted mb-5">{t('expenses.emptyDesc')}</p>
            <button onClick={openAddForm} className="btn btn-primary mx-auto">
              <PlusIcon className="w-5 h-5" /> {t('expenses.addFirst')}
            </button>
          </div>
        ) : (
          <>
            {/* Category breakdown for the month */}
            {breakdown.length > 0 && (
              <div className="card space-y-3">
                <h2 className="text-sm font-semibold text-content">{t('expenses.breakdownTitle')}</h2>
                <div className="space-y-2.5">
                  {breakdown.map((b) => {
                    const pct = monthTotal > 0 ? Math.round((b.total / monthTotal) * 100) : 0
                    const barWidth = breakdownMax > 0 ? Math.max(4, Math.round((b.total / breakdownMax) * 100)) : 0
                    return (
                      <div key={b.category}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="flex items-center gap-1.5 text-xs text-content min-w-0">
                            <span
                              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[b.category] }}
                              aria-hidden="true"
                            />
                            <span className="truncate">{catLabel(b.category)}</span>
                          </span>
                          <span className="text-xs text-muted tabular-nums flex-shrink-0">
                            ৳{bn(b.total)} · {fmtInt(pct)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${barWidth}%`, backgroundColor: CATEGORY_COLORS[b.category] }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Expense list grouped by date */}
            {visibleExpenses.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">{t('expenses.noneInCategory')}</p>
            ) : (
              groups.map((group) => (
                <section key={group.day} className="space-y-2 list-stagger">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-semibold text-muted">{fmtDate(group.day)}</h2>
                    <span className="text-xs text-muted tabular-nums">৳{bn(group.total)}</span>
                  </div>
                  <div className="card py-1">
                    {group.items.map((expense) => (
                      <div key={expense.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-b-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[expense.category] }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-content truncate">
                            {expense.note || catLabel(expense.category)}
                          </p>
                          {expense.note && (
                            <p className="text-xs text-muted truncate">{catLabel(expense.category)}</p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-negative tabular-nums flex-shrink-0">
                          ৳{bn(expense.amount)}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button className="icon-btn w-8 h-8" onClick={() => openEditForm(expense)} title={t('common.edit')}>
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button className="icon-btn w-8 h-8" onClick={() => handleDelete(expense)} title={t('common.delete')}>
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={openAddForm} aria-label={t('expenses.addNew')}>
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* Add / edit expense */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingExpense ? t('expenses.editTitle') : t('expenses.addNew')}
        footerActions={<>
          <ActionButton onClick={closeForm} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={(e) => e && handleSubmit(e)} variant="primary" loading={saving}>
            {editingExpense ? t('expenses.update') : t('common.save')}
          </ActionButton>
        </>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label label-required">{t('expenses.amountLabel')}</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={numChange(setAmount)}
              className="input"
              placeholder={t('expenses.zeroPlaceholder')}
              required
            />
          </div>
          <div>
            <label className="label label-required">{t('expenses.categoryLabel')}</label>
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`chip ${category === c ? 'chip-accent' : ''}`}
                  aria-pressed={category === c}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: CATEGORY_COLORS[c] }}
                    aria-hidden="true"
                  />
                  {catLabel(c)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{t('expenses.noteOptional')}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input"
              placeholder={t('expenses.notePlaceholder')}
            />
          </div>
          <div>
            <label className="label label-required">{t('common.date')}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
          </div>
        </form>
      </Modal>

      {/* Set / edit budget */}
      <Modal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        title={budget != null ? t('expenses.editBudget') : t('expenses.setBudget')}
        footerActions={<>
          <ActionButton onClick={() => setShowBudgetModal(false)} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={handleSaveBudget} variant="primary" loading={saving}>{t('common.save')}</ActionButton>
        </>}
      >
        <div>
          <label className="label label-required">{t('expenses.budgetLabel')}</label>
          <input
            type="text"
            inputMode="decimal"
            value={budgetInput}
            onChange={numChange(setBudgetInput)}
            className="input"
            placeholder={t('expenses.zeroPlaceholder')}
          />
        </div>
      </Modal>
    </div>
  )
}
