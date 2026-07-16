'use client'

import { useEffect, useState, useRef, type FormEvent } from 'react'
import { getReminders, saveReminder, updateReminder, deleteReminder, subscribeToReminders } from '@/lib/storage'
import { scheduleNotification } from '@/lib/notifications'
import { enablePush, refreshPushIfGranted, pushSupported } from '@/lib/push'
import type { Reminder, ReminderOccurrence } from '@/lib/types'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'
import Modal, { ActionButton } from '@/components/Modal'
import { useAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'
import { ListSkeleton } from '@/components/SkeletonLoader'
import AppBar from '@/components/AppBar'
import { ClockIcon, PlusIcon, EditIcon, TrashIcon, CheckIcon, RotateIcon, HistoryIcon, MicIcon } from '@/components/Icons'
import { t, useLang, fmtInt, fmtDate, fmtRelative } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { BellIllustration } from '@/components/Illustrations'

// Minimal Web Speech API surface we use (lib.dom has no SpeechRecognition types).
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: { results?: { [i: number]: { [j: number]: { transcript?: string } } } }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
}

// datetime-local expects a LOCAL time string; toISOString() is UTC, so we
// shift by the timezone offset before slicing to avoid an off-by-hours default.
const toLocalDateTimeValue = (date: Date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

// Advance a repetitive reminder to its next future occurrence (local wall clock).
const nextOccurrenceLocal = (
  scheduledTime: string,
  interval: number,
  type: 'days' | 'weeks' | 'months'
): string => {
  const step = Math.max(1, interval || 1)
  const d = new Date(scheduledTime)
  if (isNaN(d.getTime())) return toLocalDateTimeValue()
  let guard = 0
  while (d.getTime() <= Date.now() && guard < 500) {
    if (type === 'days') d.setDate(d.getDate() + step)
    else if (type === 'weeks') d.setDate(d.getDate() + step * 7)
    else d.setMonth(d.getMonth() + step)
    guard++
  }
  return toLocalDateTimeValue(d)
}

export default function RemindersPage() {
  useLang() // re-render on language switch
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showForm, setShowForm] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [isRepetitive, setIsRepetitive] = useState(false)
  const [repeatInterval, setRepeatInterval] = useState(1)
  const [repeatType, setRepeatType] = useState<'days' | 'weeks' | 'months'>('weeks')
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
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const savingRef = useRef(false) // guard against double-submit

  // Web Speech API voice input (Chrome/Android; Bengali first, falls back to typing)
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    setVoiceSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  const handleVoiceInput = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = 'bn-BD'
    rec.interimResults = false
    rec.maxAlternatives = 1
    setListening(true)
    rec.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript
      if (text) setTitle((prev) => (prev ? `${prev} ${text}` : text))
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => {
      setListening(false)
      toast.error(t('reminders.voiceError'))
    }
    try {
      rec.start()
    } catch {
      setListening(false)
    }
  }

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

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setTitle(reminder.title)
    setDescription(reminder.description || '')
    setScheduledTime(reminder.scheduledTime.slice(0, 16))
    setIsRepetitive(reminder.isRepetitive || false)
    setRepeatInterval(reminder.repeatInterval || 1)
    setRepeatType(reminder.repeatType || 'weeks')
    setShowForm(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!title || !scheduledTime) {
      toast.error(t('reminders.titleTimeRequired'))
      return
    }
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)

    try {
    // If editing, update existing reminder
    if (editingReminder) {
      await updateReminder(editingReminder.id, {
        title,
        description,
        scheduledTime,
        isRepetitive: isRepetitive || undefined,
        repeatInterval: isRepetitive ? repeatInterval : undefined,
        repeatType: isRepetitive ? repeatType : undefined,
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
        isRepetitive: isRepetitive || undefined,
        repeatInterval: isRepetitive ? repeatInterval : undefined,
        repeatType: isRepetitive ? repeatType : undefined,
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
    setTitle('')
    setDescription('')
    setScheduledTime(toLocalDateTimeValue())
    setIsRepetitive(false)
    setRepeatInterval(1)
    setRepeatType('weeks')
    setEditingReminder(null)
    setShowForm(false)
    loadReminders()
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setTitle('')
    setDescription('')
    setScheduledTime(toLocalDateTimeValue())
    setIsRepetitive(false)
    setRepeatInterval(1)
    setRepeatType('weeks')
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
    const advanced =
      reminderToComplete.isRepetitive && reminderToComplete.repeatType
        ? nextOccurrenceLocal(
            reminderToComplete.scheduledTime,
            reminderToComplete.repeatInterval || 1,
            reminderToComplete.repeatType
          )
        : undefined
    await updateReminder(reminderToComplete.id, {
      completionCount: updatedCount,
      occurrences: updatedOccurrences,
      ...(advanced ? { scheduledTime: advanced } : {}),
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

  const activeReminders = reminders.filter(r => !r.dismissed)
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


  const renderActiveReminderCard = (r: Reminder, overdue = false) => (
    <div key={r.id} className={overdue ? 'card bar-neg space-y-3' : 'card space-y-3'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-content truncate">{r.title}</h3>
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
          <button className="icon-btn" onClick={() => handleEdit(r)} title={t('common.edit')}><EditIcon className="w-5 h-5" /></button>
          <button className="icon-btn" onClick={() => handleDelete(r.id)} title={t('common.delete')}><TrashIcon className="w-5 h-5" /></button>
        </div>
      </div>

      {r.description && <p className="text-sm text-muted">{r.description}</p>}

      {(r.isRepetitive || (r.completionCount ?? 0) > 0) && (
        <div className="flex flex-wrap gap-2">
          {r.isRepetitive && <span className="chip chip-accent">{t('reminders.repetitiveChip')}</span>}
          {(r.completionCount ?? 0) > 0 && <span className="chip">{t('reminders.timesCompleted', { count: fmtInt(r.completionCount ?? 0) })}</span>}
        </div>
      )}

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

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-tile">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <ClockIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-muted">{t('reminders.active')}</span>
            </div>
            <p className="text-2xl font-bold text-content">{fmtInt(activeReminders.length)}</p>
          </div>
          <div className="stat-tile">
            <div className="flex items-center gap-2 mb-2 text-positive">
              <CheckIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-muted">{t('reminders.completed')}</span>
            </div>
            <p className="text-2xl font-bold text-content">{fmtInt(dismissedReminders.length)}</p>
          </div>
        </div>

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
          <div>
            <label className="label label-required">{t('reminders.fieldTitle')}</label>
            <div className="flex gap-2">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input flex-1" placeholder={t('reminders.titlePlaceholder')} required />
              {voiceSupported && (
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`icon-btn flex-shrink-0 ${listening ? 'text-negative' : ''}`}
                  title={t('reminders.voiceInput')}
                  aria-label={t('reminders.voiceInput')}
                >
                  <MicIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="label">{t('reminders.fieldDescription')}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[80px] resize-none" placeholder={t('reminders.descriptionPlaceholder')} rows={3} />
          </div>
          <div>
            <label className="label label-required">{t('reminders.fieldTime')}</label>
            <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="input" required />
          </div>
          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <input type="checkbox" checked={isRepetitive} onChange={(e) => setIsRepetitive(e.target.checked)} className="w-5 h-5 rounded accent-[color:var(--accent)]" />
            <span className="text-sm text-content">{t('reminders.repetitiveLabel')}</span>
          </label>
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
