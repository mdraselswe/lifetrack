'use client'

import { useEffect, useState, useRef, type FormEvent } from 'react'
import Link from 'next/link'
import { getReminders, saveReminder, updateReminder, deleteReminder, subscribeToReminders } from '@/lib/storage'
import { scheduleNotification } from '@/lib/notifications'
import { enablePush, refreshPushIfGranted, pushSupported } from '@/lib/push'
import type { Reminder, ReminderOccurrence, ReminderCategory, ChecklistItem } from '@/lib/types'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'
import Modal, { ActionButton } from '@/components/Modal'
import { useAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'
import { ListSkeleton } from '@/components/SkeletonLoader'
import AppBar from '@/components/AppBar'
import { ClockIcon, PlusIcon, EditIcon, TrashIcon, CheckIcon, RotateIcon, HistoryIcon, ShareIcon, CheckCircleIcon } from '@/components/Icons'
import { t, useLang, fmtInt, fmtDate, fmtRelative } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { BellIllustration } from '@/components/Illustrations'
import { toLocalDateTimeValue, advanceReminder, completionStreakDays } from '@/lib/recurrence'
import { parseQuickAdd } from '@/lib/quickadd'

// Category → dot color + i18n key. Colors are fixed brand-ish hues, not theme vars.
const CATEGORIES: { key: ReminderCategory; labelKey: string; color: string }[] = [
  { key: 'medicine', labelKey: 'reminders.catMedicine', color: '#059669' },
  { key: 'money', labelKey: 'reminders.catMoney', color: '#d97706' },
  { key: 'personal', labelKey: 'reminders.catPersonal', color: '#4f46e5' },
  { key: 'work', labelKey: 'reminders.catWork', color: '#0284c7' },
]
const catColor = (c?: ReminderCategory) => CATEGORIES.find((x) => x.key === c)?.color

// Quick templates for common Bengali life reminders: title + category + repeat.
const TEMPLATES: { labelKey: string; category: ReminderCategory; repeat?: { interval: number; type: 'days' | 'weeks' | 'months' } }[] = [
  { labelKey: 'reminders.tplMedicine', category: 'medicine', repeat: { interval: 1, type: 'days' } },
  { labelKey: 'reminders.tplBill', category: 'money', repeat: { interval: 1, type: 'months' } },
  { labelKey: 'reminders.tplRent', category: 'money', repeat: { interval: 1, type: 'months' } },
  { labelKey: 'reminders.tplInstallment', category: 'money', repeat: { interval: 1, type: 'months' } },
  { labelKey: 'reminders.tplVaccine', category: 'medicine' },
]

// Hour presets for the form's time chips.
const TIME_PRESETS: { labelKey: string; hour: number }[] = [
  { labelKey: 'reminders.presetMorning', hour: 9 },
  { labelKey: 'reminders.presetNoon', hour: 14 },
  { labelKey: 'reminders.presetEvening', hour: 19 },
  { labelKey: 'reminders.presetNight', hour: 21 },
]

const WEEKDAY_LABELS: Record<'bn' | 'en', string[]> = {
  bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}

export default function RemindersPage() {
  const lang = useLang() // re-render on language switch
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showForm, setShowForm] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [isRepetitive, setIsRepetitive] = useState(false)
  const [repeatInterval, setRepeatInterval] = useState(1)
  const [repeatType, setRepeatType] = useState<'days' | 'weeks' | 'months' | 'weekdays'>('weeks')
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([])
  const [repeatUntil, setRepeatUntil] = useState('')
  const [category, setCategory] = useState<ReminderCategory | ''>('')
  const [leadMinutes, setLeadMinutes] = useState(0)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [checklistInput, setChecklistInput] = useState('')
  const [quickAdd, setQuickAdd] = useState('')
  const [quickAddWhen, setQuickAddWhen] = useState<Date | null>(null)
  const [filterCat, setFilterCat] = useState<ReminderCategory | 'all'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [calMonth, setCalMonth] = useState<{ y: number; m: number } | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedReminderForHistory, setSelectedReminderForHistory] = useState<Reminder | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [reminderToComplete, setReminderToComplete] = useState<Reminder | null>(null)
  const [completionDateTime, setCompletionDateTime] = useState('')
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [editingOccurrence, setEditingOccurrence] = useState<{ reminder: Reminder; occurrence: ReminderOccurrence } | null>(null)
  const [editOccurrenceDateTime, setEditOccurrenceDateTime] = useState('')
  const [rescheduleReminderId, setRescheduleReminderId] = useState<string | null>(null)
  const [rescheduleHours, setRescheduleHours] = useState('1')
  const [pushState, setPushState] = useState<'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported'>('unknown')
  const [nowTick, setNowTick] = useState(0)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false) // guard against double-submit

  // Live countdown chips — refresh every minute
  useEffect(() => {
    setNowTick(Date.now())
    const id = setInterval(() => setNowTick(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    setupServiceWorker()
    // Push opt-in state + silent re-subscribe when already granted
    if (!pushSupported()) {
      setPushState('unsupported')
    } else if (Notification.permission === 'granted') {
      setPushState('granted')
      refreshPushIfGranted()
    } else if (Notification.permission === 'denied') {
      setPushState('denied')
    } else {
      setPushState('prompt')
    }
    // Set default date after mount
    setScheduledTime(toLocalDateTimeValue())
    setIsRepetitive(false)
    setRepeatInterval(1)
    setRepeatType('weeks')
  }, [])

  // Realtime sync: keeps this device in sync with every other device live
  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    setDataLoading(true)
    const unsubscribe = subscribeToReminders(user.uid, (data) => {
      setReminders(data)
      setDataLoading(false)
    })
    return () => unsubscribe()
  }, [user, loading, router])

  const setupServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'NOTIFICATION_ACTION') {
            handleNotificationAction(event.data.action, event.data.tag)
          }
        })
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  const handleNotificationAction = (action: string, reminderId: string) => {
    if (action === 'dismiss') {
      updateReminder(reminderId, { dismissed: true })
      loadReminders()
    } else if (action === 'reschedule') {
      // Open the reschedule modal (replaces native prompt() for a PWA-friendly UX)
      setRescheduleHours('1')
      setRescheduleReminderId(reminderId)
    }
  }

  const handleEnablePush = async () => {
    const result = await enablePush()
    if (result === 'subscribed') {
      setPushState('granted')
      toast.success(t('reminders.pushEnabled'))
    } else if (result === 'denied') {
      setPushState('denied')
      toast.error(t('reminders.pushBlocked'))
    } else {
      toast.error(t('reminders.pushError'))
    }
  }

  const handleSaveReschedule = async () => {
    if (!rescheduleReminderId) return

    const hours = parseFloat(rescheduleHours)
    if (isNaN(hours) || hours <= 0) {
      toast.error(t('reminders.invalidHours'))
      return
    }

    const newTime = new Date(Date.now() + hours * 60 * 60 * 1000)
    await updateReminder(rescheduleReminderId, { scheduledTime: newTime.toISOString() })

    const reminder = reminders.find(r => r.id === rescheduleReminderId)
    if (reminder) {
      scheduleNotification(rescheduleReminderId, reminder.title, reminder.description || '', newTime)
    }
    loadReminders().catch(console.error)
    toast.success(t('reminders.rescheduled'))
    setRescheduleReminderId(null)
  }

  const loadReminders = async () => {
    try {
      setDataLoading(true)
      const reminders = await getReminders()
      setReminders(reminders)
    } catch (error) {
      console.error('Error loading reminders:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const resetFormFields = () => {
    setTitle('')
    setDescription('')
    setScheduledTime(toLocalDateTimeValue())
    setIsRepetitive(false)
    setRepeatInterval(1)
    setRepeatType('weeks')
    setRepeatWeekdays([])
    setRepeatUntil('')
    setCategory('')
    setLeadMinutes(0)
    setChecklist([])
    setChecklistInput('')
    setQuickAdd('')
    setQuickAddWhen(null)
  }

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setTitle(reminder.title)
    setDescription(reminder.description || '')
    setScheduledTime(reminder.scheduledTime.slice(0, 16))
    setIsRepetitive(reminder.isRepetitive || false)
    setRepeatInterval(reminder.repeatInterval || 1)
    setRepeatType(reminder.repeatType || 'weeks')
    setRepeatWeekdays(reminder.repeatWeekdays || [])
    setRepeatUntil(reminder.repeatUntil || '')
    setCategory(reminder.category || '')
    setLeadMinutes(reminder.leadMinutes || 0)
    setChecklist(reminder.checklist || [])
    setChecklistInput('')
    setQuickAdd('')
    setQuickAddWhen(null)
    setShowForm(true)
  }

  // Open the form prefilled from an existing reminder, as a NEW reminder.
  const handleDuplicate = (reminder: Reminder) => {
    handleEdit(reminder)
    setEditingReminder(null)
    // Duplicates start from the next sensible time, not the original's past time.
    setScheduledTime(toLocalDateTimeValue())
  }

  const handleShare = async (reminder: Reminder) => {
    const text = `${reminder.title} — ${fmtDate(reminder.scheduledTime, true)}${reminder.description ? `\n${reminder.description}` : ''}`
    try {
      if (navigator.share) {
        await navigator.share({ text, title: reminder.title })
      } else {
        await navigator.clipboard.writeText(text)
        toast.success(t('share.copied'))
      }
    } catch {
      // dismissed the share sheet — not an error
    }
  }

  // One-tap snooze from the card. Each option maps to a concrete local time.
  const handleSnooze = async (reminder: Reminder, kind: '1h' | 'tonight' | 'tomorrow' | 'nextweek') => {
    const now = new Date()
    let next: Date
    if (kind === '1h') next = new Date(now.getTime() + 60 * 60 * 1000)
    else if (kind === 'tonight') {
      next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0)
      if (next.getTime() <= now.getTime()) next = new Date(now.getTime() + 60 * 60 * 1000)
    } else if (kind === 'tomorrow') next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0)
    else next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 9, 0)

    const local = toLocalDateTimeValue(next)
    await updateReminder(reminder.id, { scheduledTime: local })
    scheduleNotification(reminder.id, reminder.title, reminder.description || '', next)
    haptic()
    loadReminders().catch(console.error)
    toast.success(t('reminders.snoozed', { time: fmtDate(next, true) }))
  }

  // Tick/untick a checklist item directly on the card.
  const handleToggleChecklistItem = async (reminder: Reminder, itemId: string) => {
    const updated = (reminder.checklist || []).map((c) => (c.id === itemId ? { ...c, done: !c.done } : c))
    await updateReminder(reminder.id, { checklist: updated })
    haptic()
    loadReminders().catch(console.error)
  }

  const handleTestNotification = async () => {
    try {
      const reg = await navigator.serviceWorker?.ready
      if (reg?.showNotification) {
        await reg.showNotification('LifeTrack', { body: t('reminders.testBody'), icon: '/icon-192x192.png', tag: 'test' })
      } else {
        new Notification('LifeTrack', { body: t('reminders.testBody'), icon: '/icon-192x192.png', tag: 'test' })
      }
      toast.success(t('reminders.testSent'))
    } catch {
      toast.error(t('reminders.pushError'))
    }
  }

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    setTitle(t(tpl.labelKey))
    setCategory(tpl.category)
    if (tpl.repeat) {
      setIsRepetitive(true)
      setRepeatInterval(tpl.repeat.interval)
      setRepeatType(tpl.repeat.type)
    }
  }

  // Keep the date part of scheduledTime, set the hour from the preset.
  const applyTimePreset = (hour: number) => {
    const base = scheduledTime ? new Date(scheduledTime) : new Date()
    const d = isNaN(base.getTime()) ? new Date() : base
    d.setHours(hour, 0, 0, 0)
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1) // past → same time tomorrow
    setScheduledTime(toLocalDateTimeValue(d))
  }

  const handleQuickAddChange = (value: string) => {
    setQuickAdd(value)
    const parsed = parseQuickAdd(value)
    setQuickAddWhen(parsed.when)
    if (parsed.title) setTitle(parsed.title)
    if (parsed.when) setScheduledTime(toLocalDateTimeValue(parsed.when))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!title || !scheduledTime) {
      toast.error(t('reminders.titleTimeRequired'))
      return
    }
    if (isRepetitive && repeatType === 'weekdays' && repeatWeekdays.length === 0) {
      toast.error(t('reminders.weekdayNeeded'))
      return
    }
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)

    // Shared optional fields for create + update.
    const extras = {
      isRepetitive: isRepetitive || undefined,
      repeatInterval: isRepetitive ? repeatInterval : undefined,
      repeatType: isRepetitive ? repeatType : undefined,
      repeatWeekdays: isRepetitive && repeatType === 'weekdays' ? repeatWeekdays : undefined,
      repeatUntil: isRepetitive && repeatUntil ? repeatUntil : undefined,
      category: category || undefined,
      leadMinutes: leadMinutes > 0 ? leadMinutes : undefined,
      checklist: checklist.length > 0 ? checklist : undefined,
    }

    try {
    // If editing, update existing reminder
    if (editingReminder) {
      await updateReminder(editingReminder.id, {
        title,
        description,
        scheduledTime,
        ...extras,
      })
      
      // Reschedule notification if time changed
      const hasPermission = await scheduleNotification(
        editingReminder.id,
        title,
        description || '',
        new Date(scheduledTime)
      )
      
      if (hasPermission === false) {
        toast.error(t('reminders.notifPermission'))
        toast.info(t('reminders.notifPermissionHint'), 8000)
        return
      }

      toast.success(t('reminders.updated'))
    } else {
      // Creating new reminder
      const reminder: Reminder = {
        id: Date.now().toString(),
        title,
        description,
        scheduledTime,
        dismissed: false,
        createdAt: new Date().toISOString(),
        ...extras,
        completionCount: isRepetitive ? 1 : 0, // If repetitive, start with count 1
        occurrences: isRepetitive ? [
          {
            id: Date.now().toString() + '_initial',
            scheduledTime: scheduledTime,
            completedTime: new Date(scheduledTime).toISOString(), // Use scheduled time as initial completion
          }
        ] : [],
      }

      try {
        await saveReminder(reminder)
      } catch (error) {
        console.error('Error saving reminder:', error)
        toast.error(t('reminders.saveError'))
        return
      }

      // Schedule notification
      const hasPermission = await scheduleNotification(
        reminder.id,
        reminder.title,
        reminder.description || '',
        new Date(scheduledTime)
      )
      
      if (hasPermission === false) {
        toast.error(t('reminders.notifPermission'))
        toast.info(t('reminders.notifPermissionHint'), 8000)
        return
      }

      toast.success(t('reminders.created'))

      // Check if browser supports background notifications
      const supportsBackground = 'serviceWorker' in navigator && navigator.serviceWorker.controller
      if (supportsBackground) {
        toast.info(t('reminders.backgroundInfo'), 6000)
      } else {
        toast.warning(t('reminders.keepBrowserOpen'), 6000)
      }
    }

    // Reset form
    resetFormFields()
    setEditingReminder(null)
    setShowForm(false)
    loadReminders()
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    resetFormFields()
    setEditingReminder(null)
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    const reminder = reminders.find(r => r.id === id)
    if (!reminder) return
    
    confirm.delete(
      t('reminders.deleteTitle'),
      t('reminders.deleteConfirm', { title: reminder.title }),
      () => {
        deleteReminder(id)
        loadReminders().catch(console.error)
        toast.success(t('reminders.deleted'))
      }
    )
  }

  const handleCompleteReminder = (reminder: Reminder) => {
    // Set default completion time to now
    setCompletionDateTime(toLocalDateTimeValue())
    setReminderToComplete(reminder)
    setShowCompleteModal(true)
  }

  const handleSaveCompletion = async () => {
    if (!reminderToComplete || !completionDateTime) {
      toast.error(t('reminders.timeRequired'))
      return
    }

    // Create occurrence with manual completion date/time
    const occurrence: ReminderOccurrence = {
      id: Date.now().toString(),
      scheduledTime: reminderToComplete.scheduledTime, // Original scheduled time
      completedTime: new Date(completionDateTime).toISOString(), // Manual completion time
    }

    const updatedOccurrences = [...(reminderToComplete.occurrences || []), occurrence]
    const updatedCount = (reminderToComplete.completionCount || 0) + 1

    // Update reminder with new occurrence AND move it to the next occurrence,
    // so the card leaves the overdue state instead of staying due forever.
    // advanceReminder returns null when the repeat's end date has passed —
    // the reminder is then finished (dismissed) instead of rescheduled.
    const advanced = advanceReminder(reminderToComplete)
    const repeatEnded = reminderToComplete.isRepetitive && !!reminderToComplete.repeatType && advanced === null
    await updateReminder(reminderToComplete.id, {
      completionCount: updatedCount,
      occurrences: updatedOccurrences,
      ...(advanced ? { scheduledTime: advanced } : {}),
      ...(repeatEnded ? { dismissed: true } : {}),
    })

    loadReminders().catch(console.error)
    haptic(15)
    toast.success(t('reminders.completedToast', { title: reminderToComplete.title, count: fmtInt(updatedCount) }))

    setShowCompleteModal(false)
    setReminderToComplete(null)
    setCompletionDateTime('')
    
    // Refresh history if modal is open
    if (selectedReminderForHistory?.id === reminderToComplete.id) {
      const updated = await getReminders()
      const refreshed = updated.find(r => r.id === reminderToComplete.id)
      if (refreshed) {
        setSelectedReminderForHistory(refreshed)
      }
    }
  }

  // Permanently finish a repetitive reminder: stops repeating, keeps history,
  // moves the card to the completed section.
  const handleFinishRepetitive = (reminder: Reminder) => {
    confirm.custom(
      t('reminders.finishTitle'),
      t('reminders.finishMessage', { title: reminder.title }),
      () => {
        updateReminder(reminder.id, { dismissed: true }).then(() => {
          haptic([20, 40, 20])
          loadReminders().catch(console.error)
          toast.success(t('reminders.finished'))
        }).catch((error) => {
          console.error('Error finishing reminder:', error)
          toast.error(t('reminders.finishError'))
        })
      },
      { confirmText: t('reminders.finishConfirm'), cancelText: t('common.cancel'), type: 'warning' }
    )
  }

  const handleEditOccurrence = (reminder: Reminder, occurrence: ReminderOccurrence) => {
    setEditingOccurrence({ reminder, occurrence })
    setEditOccurrenceDateTime(toLocalDateTimeValue(new Date(occurrence.completedTime)))
  }

  const handleSaveOccurrenceEdit = async () => {
    if (!editingOccurrence || !editOccurrenceDateTime) {
      toast.error(t('reminders.timeRequired'))
      return
    }

    const { reminder, occurrence } = editingOccurrence
    const updatedOccurrences = (reminder.occurrences || []).map(occ => 
      occ.id === occurrence.id
        ? { ...occ, completedTime: new Date(editOccurrenceDateTime).toISOString() }
        : occ
    )

    await updateReminder(reminder.id, {
      occurrences: updatedOccurrences,
    })

    loadReminders().catch(console.error)
    toast.success(t('reminders.occurrenceUpdated'))

    // Refresh history
    const updated = await getReminders()
    const refreshed = updated.find(r => r.id === reminder.id)
    if (refreshed) {
      setSelectedReminderForHistory(refreshed)
    }

    setEditingOccurrence(null)
    setEditOccurrenceDateTime('')
  }

  const handleDeleteOccurrence = (reminder: Reminder, occurrence: ReminderOccurrence) => {
    confirm.delete(
      t('reminders.deleteOccurrenceTitle'),
      t('reminders.deleteOccurrenceConfirm', { date: fmtDate(occurrence.completedTime, true) }),
      async () => {
        const updatedOccurrences = (reminder.occurrences || []).filter(occ => occ.id !== occurrence.id)
        const updatedCount = Math.max(0, (reminder.completionCount || 0) - 1)

        await updateReminder(reminder.id, {
          occurrences: updatedOccurrences,
          completionCount: updatedCount,
        })

        loadReminders().catch(console.error)
        toast.success(t('reminders.occurrenceDeleted'))

        // Refresh history
        const updated = await getReminders()
        const refreshed = updated.find(r => r.id === reminder.id)
        if (refreshed) {
          setSelectedReminderForHistory(refreshed)
        }
      }
    )
  }

  const handleToggleDismiss = (reminder: Reminder) => {
    const newStatus = !reminder.dismissed

    confirm.custom(
      t('reminders.toggleTitle'),
      t(newStatus ? 'reminders.markDismissedConfirm' : 'reminders.markActiveConfirm', { title: reminder.title }),
      () => {
        updateReminder(reminder.id, { dismissed: newStatus })
        loadReminders().catch(console.error)
        toast.success(t(newStatus ? 'reminders.markedDismissed' : 'reminders.markedActive'))
      },
      {
        confirmText: t(newStatus ? 'reminders.confirmDismiss' : 'reminders.confirmActivate'),
        cancelText: t('common.cancel'),
        type: newStatus ? 'warning' : 'info'
      }
    )
  }

  if (!mounted) {
    return null
  }

  const allActiveReminders = reminders.filter(r => !r.dismissed)
  const hasCategories = allActiveReminders.some(r => r.category)
  const activeReminders = filterCat === 'all' ? allActiveReminders : allActiveReminders.filter(r => r.category === filterCat)
  const dismissedReminders = reminders.filter(r => r.dismissed)

  // Group active reminders into time sections: Overdue / Today / Tomorrow / Upcoming.
  // scheduledTime is either 'YYYY-MM-DDTHH:mm' (local) or full ISO — new Date() handles both.
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const todayStart = startOfDay(now)
  const tomorrowStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
  const overdueReminders: Reminder[] = []
  const todayReminders: Reminder[] = []
  const tomorrowReminders: Reminder[] = []
  const upcomingReminders: Reminder[] = []
  const invalidTimeReminders: Reminder[] = []
  for (const r of activeReminders) {
    const time = new Date(r.scheduledTime).getTime()
    if (isNaN(time)) {
      invalidTimeReminders.push(r) // unparseable → end of Upcoming
    } else if (time < now.getTime()) {
      overdueReminders.push(r)
    } else if (startOfDay(new Date(time)) === todayStart) {
      todayReminders.push(r)
    } else if (startOfDay(new Date(time)) === tomorrowStart) {
      tomorrowReminders.push(r)
    } else {
      upcomingReminders.push(r)
    }
  }
  const byTimeAsc = (a: Reminder, b: Reminder) =>
    new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
  overdueReminders.sort((a, b) => byTimeAsc(b, a)) // most-recently-due first
  todayReminders.sort(byTimeAsc)
  tomorrowReminders.sort(byTimeAsc)
  upcomingReminders.sort(byTimeAsc)
  const reminderGroups = [
    { key: 'reminders.groupOverdue', items: overdueReminders, headerClass: 'text-negative', overdue: true },
    { key: 'reminders.groupToday', items: todayReminders },
    { key: 'reminders.groupTomorrow', items: tomorrowReminders },
    { key: 'reminders.groupUpcoming', items: [...upcomingReminders, ...invalidTimeReminders] },
  ]

  // ---- Calendar view data ----
  const cal = calMonth ?? { y: now.getFullYear(), m: now.getMonth() }
  const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const remindersByDay = new Map<string, Reminder[]>()
  for (const r of activeReminders) {
    const d = new Date(r.scheduledTime)
    if (isNaN(d.getTime())) continue
    const k = dayKey(d)
    remindersByDay.set(k, [...(remindersByDay.get(k) || []), r])
  }
  const firstOfMonth = new Date(cal.y, cal.m, 1)
  const daysInMonth = new Date(cal.y, cal.m + 1, 0).getDate()
  const leadingBlanks = firstOfMonth.getDay() // 0=Sun grid
  const calCells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const monthLabel = fmtDate(firstOfMonth).replace(/[০-৯\d]+,?\s*/, '') // "MMMM d, yyyy" → month + year-ish; fallback fine
  const selectedDayReminders = selectedDay ? (remindersByDay.get(selectedDay) || []).sort(byTimeAsc) : []


  const renderActiveReminderCard = (r: Reminder, overdue = false) => {
    const streak = r.isRepetitive ? completionStreakDays(r) : 0
    return (
    <div key={r.id} className={overdue ? 'card bar-neg space-y-3' : 'card space-y-3'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-content truncate flex items-center gap-1.5">
            {r.category && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor(r.category) }} aria-hidden="true" />}
            {r.title}
          </h3>
          <p className="text-xs text-muted flex flex-wrap items-center gap-x-1 gap-y-1 mt-0.5">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" /> {fmtDate(r.scheduledTime, true)}
            </span>
            {overdue ? (
              <span className="pulse-dot" aria-hidden="true" />
            ) : nowTick > 0 && new Date(r.scheduledTime).getTime() - nowTick < 24 * 60 * 60 * 1000 ? (
              <span className="chip text-[10px] tint-accent text-accent whitespace-nowrap">{fmtRelative(r.scheduledTime)}</span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button className="icon-btn" onClick={() => handleShare(r)} title={t('reminders.share')}><ShareIcon className="w-5 h-5" /></button>
          <button className="icon-btn" onClick={() => handleDuplicate(r)} title={t('reminders.duplicate')}><PlusIcon className="w-5 h-5" /></button>
          <button className="icon-btn" onClick={() => handleEdit(r)} title={t('common.edit')}><EditIcon className="w-5 h-5" /></button>
          <button className="icon-btn" onClick={() => handleDelete(r.id)} title={t('common.delete')}><TrashIcon className="w-5 h-5" /></button>
        </div>
      </div>

      {r.description && <p className="text-sm text-muted">{r.description}</p>}

      {/* Checklist — tick items right on the card */}
      {r.checklist && r.checklist.length > 0 && (
        <div className="space-y-1.5">
          {r.checklist.map((c) => (
            <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={c.done}
                onChange={() => handleToggleChecklistItem(r, c.id)}
                className="w-4 h-4 rounded accent-[color:var(--accent)]"
              />
              <span className={c.done ? 'line-through text-muted' : 'text-content'}>{c.text}</span>
            </label>
          ))}
        </div>
      )}

      {(r.isRepetitive || (r.completionCount ?? 0) > 0 || r.sourceType || streak >= 2) && (
        <div className="flex flex-wrap gap-2">
          {r.sourceType && (
            <Link href={r.sourceType === 'debt' ? '/debts' : '/loans'} className="chip tint-warn text-caution">
              {t(r.sourceType === 'debt' ? 'reminders.sourceDebt' : 'reminders.sourceLoan')}
            </Link>
          )}
          {r.isRepetitive && <span className="chip chip-accent">{t('reminders.repetitiveChip')}</span>}
          {streak >= 2 && <span className="chip">{t('reminders.streak', { count: fmtInt(streak) })}</span>}
          {(r.completionCount ?? 0) > 0 && <span className="chip">{t('reminders.timesCompleted', { count: fmtInt(r.completionCount ?? 0) })}</span>}
        </div>
      )}

      {/* One-tap snooze */}
      <div className="flex flex-wrap gap-2">
        <button className="chip" onClick={() => handleSnooze(r, '1h')}>{t('reminders.snooze1h')}</button>
        <button className="chip" onClick={() => handleSnooze(r, 'tonight')}>{t('reminders.snoozeTonight')}</button>
        <button className="chip" onClick={() => handleSnooze(r, 'tomorrow')}>{t('reminders.snoozeTomorrow')}</button>
        <button className="chip" onClick={() => handleSnooze(r, 'nextweek')}>{t('reminders.snoozeNextWeek')}</button>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          className="btn btn-primary flex-1"
          onClick={() => (r.isRepetitive ? handleCompleteReminder(r) : handleToggleDismiss(r))}
        >
          <CheckIcon className="w-4 h-4" /> {t('reminders.markDone')}
        </button>
        {r.isRepetitive && (
          <button className="btn btn-secondary" onClick={() => handleFinishRepetitive(r)}>
            {t('reminders.finish')}
          </button>
        )}
        {r.occurrences && r.occurrences.length > 0 && (
          <button className="btn btn-secondary" onClick={() => setSelectedReminderForHistory(r)}>
            <HistoryIcon className="w-4 h-4" /> {t('reminders.history')}
          </button>
        )}
      </div>
    </div>
    )
  }

  return (
    <div className="min-h-full">
      <AppBar title={t('nav.reminders')} subtitle={t('reminders.subtitle')} />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
        {/* Push notification opt-in — makes reminders fire even with the app closed */}
        {pushState === 'prompt' && (
          <div className="card flex items-center gap-3 py-3">
            <span className="tint-accent text-accent w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
              <ClockIcon className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-content">{t('reminders.pushTitle')}</p>
              <p className="text-xs text-muted">{t('reminders.pushDesc')}</p>
            </div>
            <button onClick={handleEnablePush} className="btn btn-primary text-xs px-3 py-2 flex-shrink-0">
              {t('reminders.pushEnable')}
            </button>
          </div>
        )}
        {pushState === 'denied' && (
          <div className="card tint-warn py-3 px-4">
            <p className="text-xs text-caution">{t('reminders.pushBlocked')}</p>
          </div>
        )}
        {/* Reliability meter: notifications are ON + a test button so the user
            can verify delivery on this device instead of trusting a checkbox. */}
        {pushState === 'granted' && (
          <div className="card flex items-center gap-3 py-2.5">
            <CheckCircleIcon className="w-5 h-5 text-positive flex-shrink-0" />
            <p className="text-xs text-muted flex-1">{t('reminders.statusOn')}</p>
            <button onClick={handleTestNotification} className="btn btn-secondary text-xs px-3 py-1.5">
              {t('reminders.testNotif')}
            </button>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-tile">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <ClockIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-muted">{t('reminders.active')}</span>
            </div>
            <p className="text-2xl font-bold text-content">{fmtInt(allActiveReminders.length)}</p>
          </div>
          <div className="stat-tile">
            <div className="flex items-center gap-2 mb-2 text-positive">
              <CheckIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-muted">{t('reminders.completed')}</span>
            </div>
            <p className="text-2xl font-bold text-content">{fmtInt(dismissedReminders.length)}</p>
          </div>
        </div>

        {/* View toggle + category filter */}
        {reminders.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button className={`chip ${viewMode === 'list' ? 'chip-accent' : ''}`} onClick={() => setViewMode('list')}>{t('reminders.viewList')}</button>
            <button className={`chip ${viewMode === 'calendar' ? 'chip-accent' : ''}`} onClick={() => setViewMode('calendar')}>{t('reminders.viewCalendar')}</button>
            {hasCategories && (
              <>
                <span className="w-px h-4 bg-line mx-1" aria-hidden="true" />
                <button className={`chip ${filterCat === 'all' ? 'chip-accent' : ''}`} onClick={() => setFilterCat('all')}>{t('reminders.filterAll')}</button>
                {CATEGORIES.map((c) => (
                  <button key={c.key} className={`chip ${filterCat === c.key ? 'chip-accent' : ''}`} onClick={() => setFilterCat(c.key)}>
                    <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ backgroundColor: c.color }} aria-hidden="true" />
                    {t(c.labelKey)}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {dataLoading ? (
          <ListSkeleton count={3} />
        ) : reminders.length === 0 ? (
          <div className="text-center py-16">
            <BellIllustration className="w-56 h-40 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-content mb-1">{t('reminders.emptyTitle')}</h3>
            <p className="text-sm text-muted mb-5">{t('reminders.emptySubtitle')}</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary mx-auto">
              <PlusIcon className="w-5 h-5" /> {t('reminders.addFirst')}
            </button>
          </div>
        ) : viewMode === 'calendar' ? (
          <>
            {/* Month calendar: dots mark days with reminders; tap a day for its list */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <button className="icon-btn" onClick={() => { setCalMonth({ y: cal.m === 0 ? cal.y - 1 : cal.y, m: cal.m === 0 ? 11 : cal.m - 1 }); setSelectedDay(null) }} aria-label="prev">‹</button>
                <p className="text-sm font-semibold text-content">{monthLabel}</p>
                <button className="icon-btn" onClick={() => { setCalMonth({ y: cal.m === 11 ? cal.y + 1 : cal.y, m: cal.m === 11 ? 0 : cal.m + 1 }); setSelectedDay(null) }} aria-label="next">›</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAY_LABELS[lang].map((d) => (
                  <span key={d} className="text-[10px] text-muted font-medium py-1">{d}</span>
                ))}
                {calCells.map((day, i) => {
                  if (day === null) return <span key={`b${i}`} />
                  const k = `${cal.y}-${String(cal.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const has = remindersByDay.has(k)
                  const isToday = k === dayKey(now)
                  const isSelected = k === selectedDay
                  return (
                    <button
                      key={k}
                      onClick={() => setSelectedDay(isSelected ? null : k)}
                      className={`relative aspect-square rounded-lg text-xs flex flex-col items-center justify-center transition-colors ${
                        isSelected ? 'bg-accent text-accent-fg font-bold' : isToday ? 'bg-surface-2 font-bold text-accent' : 'text-content hover:bg-surface-2'
                      }`}
                    >
                      {fmtInt(day)}
                      {has && <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-accent'}`} aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            </div>
            {selectedDay && (
              <section className="space-y-3">
                {selectedDayReminders.length > 0 ? (
                  selectedDayReminders.map((r) => renderActiveReminderCard(r))
                ) : (
                  <p className="text-sm text-muted text-center py-6">{t('reminders.calEmpty')}</p>
                )}
              </section>
            )}
          </>
        ) : (
          <>
            {reminderGroups.map((g) =>
              g.items.length > 0 ? (
                <section key={g.key} className="space-y-3">
                  <h2 className={`text-sm font-semibold px-1 ${g.headerClass ?? 'text-muted'}`}>
                    {t(g.key)} · {fmtInt(g.items.length)}
                  </h2>
                  {g.items.map((r) => renderActiveReminderCard(r, g.overdue))}
                </section>
              ) : null
            )}

            {dismissedReminders.length > 0 && (
              <section className="space-y-3 list-stagger">
                <h2 className="text-sm font-semibold text-muted px-1">{t('reminders.completed')}</h2>
                {dismissedReminders.map((r) => (
                  <div key={r.id} className="card flex items-center justify-between gap-3 opacity-90">
                    <div className="min-w-0">
                      <h3 className="font-medium text-content truncate line-through">{r.title}</h3>
                      <p className="text-xs text-muted mt-0.5">{fmtDate(r.scheduledTime, true)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {r.occurrences && r.occurrences.length > 0 && (
                        <button className="icon-btn" onClick={() => setSelectedReminderForHistory(r)} title={t('reminders.history')}><HistoryIcon className="w-5 h-5" /></button>
                      )}
                      <button className="icon-btn" onClick={() => handleToggleDismiss(r)} title={t('reminders.activate')}><RotateIcon className="w-5 h-5" /></button>
                      <button className="icon-btn" onClick={() => handleDelete(r.id)} title={t('common.delete')}><TrashIcon className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowForm(true)} aria-label={t('reminders.addNew')}>
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* Add / Edit reminder */}
      <Modal
        isOpen={showForm}
        onClose={handleCancelEdit}
        title={editingReminder ? t('reminders.editTitle') : t('reminders.newTitle')}
        footerActions={<>
          <ActionButton onClick={handleCancelEdit} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={(e) => e && handleSubmit(e)} variant="primary" loading={saving}>{editingReminder ? t('reminders.update') : t('common.save')}</ActionButton>
        </>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick add: free-text like "কাল সকাল ৯টায় ওষুধ" fills title + time */}
          {!editingReminder && (
            <div>
              <input
                type="text"
                value={quickAdd}
                onChange={(e) => handleQuickAddChange(e.target.value)}
                className="input"
                placeholder={t('reminders.quickAddPlaceholder')}
              />
              {quickAddWhen && (
                <p className="text-xs text-positive mt-1">{t('reminders.quickAddHint', { time: fmtDate(quickAddWhen, true) })}</p>
              )}
            </div>
          )}

          {/* Templates */}
          {!editingReminder && (
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((tpl) => (
                <button key={tpl.labelKey} type="button" className="chip" onClick={() => applyTemplate(tpl)}>
                  <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ backgroundColor: catColor(tpl.category) }} aria-hidden="true" />
                  {t(tpl.labelKey)}
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="label label-required">{t('reminders.fieldTitle')}</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder={t('reminders.titlePlaceholder')} required />
          </div>
          <div>
            <label className="label">{t('reminders.fieldDescription')}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[80px] resize-none" placeholder={t('reminders.descriptionPlaceholder')} rows={3} />
          </div>
          <div>
            <label className="label label-required">{t('reminders.fieldTime')}</label>
            <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="input" required />
            <div className="flex flex-wrap gap-2 mt-2">
              {TIME_PRESETS.map((p) => (
                <button key={p.labelKey} type="button" className="chip" onClick={() => applyTimePreset(p.hour)}>
                  {t(p.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="label">{t('reminders.categoryLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`chip ${category === c.key ? 'chip-accent' : ''}`}
                  onClick={() => setCategory(category === c.key ? '' : c.key)}
                >
                  <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ backgroundColor: c.color }} aria-hidden="true" />
                  {t(c.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Notify before */}
          <div>
            <label className="label">{t('reminders.leadLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {([[0, 'reminders.leadNone'], [10, 'reminders.lead10m'], [60, 'reminders.lead1h'], [1440, 'reminders.lead1d']] as const).map(([mins, key]) => (
                <button key={mins} type="button" className={`chip ${leadMinutes === mins ? 'chip-accent' : ''}`} onClick={() => setLeadMinutes(mins)}>
                  {t(key)}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist editor */}
          <div>
            <label className="label">{t('reminders.checklistLabel')}</label>
            {checklist.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {checklist.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-sm text-content flex-1">{c.text}</span>
                    <button type="button" className="icon-btn w-7 h-7" onClick={() => setChecklist(checklist.filter((x) => x.id !== c.id))}>
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="text"
              value={checklistInput}
              onChange={(e) => setChecklistInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const text = checklistInput.trim()
                  if (text) {
                    setChecklist([...checklist, { id: `c${Date.now().toString(36)}`, text, done: false }])
                    setChecklistInput('')
                  }
                }
              }}
              className="input"
              placeholder={t('reminders.checklistPlaceholder')}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <input type="checkbox" checked={isRepetitive} onChange={(e) => setIsRepetitive(e.target.checked)} className="w-5 h-5 rounded accent-[color:var(--accent)]" />
            <span className="text-sm text-content">{t('reminders.repetitiveLabel')}</span>
          </label>

          {/* Repeat controls */}
          {isRepetitive && (
            <div className="space-y-3 rounded-xl bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-content">{t('reminders.repeatEvery')}</span>
                {repeatType !== 'weekdays' && (
                  <input
                    type="number"
                    min={1}
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="input input-sm w-20"
                  />
                )}
                <select
                  value={repeatType}
                  onChange={(e) => setRepeatType(e.target.value as typeof repeatType)}
                  className="input input-sm flex-1"
                >
                  <option value="days">{t('reminders.repeatDays')}</option>
                  <option value="weeks">{t('reminders.repeatWeeks')}</option>
                  <option value="months">{t('reminders.repeatMonths')}</option>
                  <option value="weekdays">{t('reminders.repeatWeekdaysUnit')}</option>
                </select>
              </div>
              {repeatType === 'weekdays' && (
                <div>
                  <p className="text-xs text-muted mb-1.5">{t('reminders.repeatWeekdaysPick')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAY_LABELS[lang].map((label, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`chip ${repeatWeekdays.includes(i) ? 'chip-accent' : ''}`}
                        onClick={() =>
                          setRepeatWeekdays(
                            repeatWeekdays.includes(i) ? repeatWeekdays.filter((d) => d !== i) : [...repeatWeekdays, i].sort()
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="label">{t('reminders.repeatUntilLabel')}</label>
                <input type="date" value={repeatUntil} onChange={(e) => setRepeatUntil(e.target.value)} className="input input-sm" />
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Complete reminder */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => { setShowCompleteModal(false); setReminderToComplete(null); setCompletionDateTime('') }}
        title={reminderToComplete ? t('reminders.completeModalTitle', { title: reminderToComplete.title }) : t('reminders.completeTitle')}
        footerActions={<>
          <ActionButton onClick={() => { setShowCompleteModal(false); setReminderToComplete(null); setCompletionDateTime('') }} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={handleSaveCompletion} variant="primary">{t('reminders.markDone')}</ActionButton>
        </>}
      >
        <div className="space-y-3">
          {reminderToComplete && (reminderToComplete.completionCount ?? 0) > 0 && (
            <p className="text-sm text-muted">{t('reminders.previouslyCompleted', { count: fmtInt(reminderToComplete.completionCount ?? 0) })}</p>
          )}
          <div>
            <label className="label label-required">{t('reminders.whenCompleted')}</label>
            <input type="datetime-local" value={completionDateTime} onChange={(e) => setCompletionDateTime(e.target.value)} className="input" required />
          </div>
        </div>
      </Modal>

      {/* Edit occurrence */}
      <Modal
        isOpen={!!editingOccurrence}
        onClose={() => { setEditingOccurrence(null); setEditOccurrenceDateTime('') }}
        title={t('reminders.editOccurrenceTitle')}
        zIndex={10000}
        footerActions={<>
          <ActionButton onClick={() => { setEditingOccurrence(null); setEditOccurrenceDateTime('') }} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={handleSaveOccurrenceEdit} variant="primary">{t('reminders.update')}</ActionButton>
        </>}
      >
        <div>
          <label className="label label-required">{t('reminders.completedDateTime')}</label>
          <input type="datetime-local" value={editOccurrenceDateTime} onChange={(e) => setEditOccurrenceDateTime(e.target.value)} className="input" required />
        </div>
      </Modal>

      {/* History */}
      <Modal
        isOpen={!!selectedReminderForHistory}
        onClose={() => setSelectedReminderForHistory(null)}
        title={selectedReminderForHistory ? t('reminders.historyModalTitle', { title: selectedReminderForHistory.title }) : t('reminders.history')}
        footerActions={<ActionButton onClick={() => setSelectedReminderForHistory(null)} variant="secondary">{t('common.close')}</ActionButton>}
      >
        {selectedReminderForHistory && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t('reminders.totalCompleted', { count: fmtInt(selectedReminderForHistory.completionCount || 0) })}</p>
            {selectedReminderForHistory.occurrences && selectedReminderForHistory.occurrences.length > 0 ? (
              [...selectedReminderForHistory.occurrences]
                .sort((a, b) => new Date(a.completedTime).getTime() - new Date(b.completedTime).getTime())
                .map((occ, index) => (
                  <div key={occ.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-content">#{fmtInt(index + 1)}</p>
                      <p className="text-xs text-muted truncate">{fmtDate(occ.completedTime, true)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="icon-btn w-8 h-8" onClick={() => handleEditOccurrence(selectedReminderForHistory, occ)}><EditIcon className="w-4 h-4" /></button>
                      <button className="icon-btn w-8 h-8" onClick={() => handleDeleteOccurrence(selectedReminderForHistory, occ)}><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-muted text-center py-6">{t('reminders.noOccurrences')}</p>
            )}
          </div>
        )}
      </Modal>

      {/* Reschedule (replaces native prompt) */}
      <Modal
        isOpen={!!rescheduleReminderId}
        onClose={() => setRescheduleReminderId(null)}
        title={t('reminders.rescheduleTitle')}
        zIndex={10001}
        footerActions={<>
          <ActionButton onClick={() => setRescheduleReminderId(null)} variant="secondary">{t('common.cancel')}</ActionButton>
          <ActionButton onClick={handleSaveReschedule} variant="primary">{t('reminders.setButton')}</ActionButton>
        </>}
      >
        <div>
          <label className="label label-required">{t('reminders.rescheduleLabel')}</label>
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={rescheduleHours}
            onChange={(e) => setRescheduleHours(e.target.value)}
            className="input"
            placeholder={t('reminders.reschedulePlaceholder')}
            required
          />
        </div>
      </Modal>
    </div>
  )
}
