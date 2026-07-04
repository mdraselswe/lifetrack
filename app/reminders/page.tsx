'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { getReminders, saveReminder, updateReminder, deleteReminder, subscribeToReminders } from '@/lib/storage'
import { scheduleNotification } from '@/lib/notifications'
import type { Reminder, ReminderOccurrence } from '@/lib/types'
import { addDays, addWeeks, addMonths } from 'date-fns'
import { format } from 'date-fns'
import { bn } from 'date-fns/locale'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'
import Modal, { ActionButton } from '@/components/Modal'
import { useAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'
import { ListSkeleton } from '@/components/SkeletonLoader'
import AppBar from '@/components/AppBar'
import { ClockIcon, PlusIcon, EditIcon, TrashIcon, CheckIcon, RotateIcon, HistoryIcon } from '@/components/Icons'
import { toBnDigits } from '@/lib/format'

const fmtDate = (v?: string) => (v && !isNaN(new Date(v).getTime()) ? toBnDigits(format(new Date(v), 'MMMM d, yyyy, h:mm a', { locale: bn })) : 'অবৈধ তারিখ')

// datetime-local expects a LOCAL time string; toISOString() is UTC, so we
// shift by the timezone offset before slicing to avoid an off-by-hours default.
const toLocalDateTimeValue = (date: Date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function RemindersPage() {
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
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    setupServiceWorker()
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

  const handleSaveReschedule = async () => {
    if (!rescheduleReminderId) return

    const hours = parseFloat(rescheduleHours)
    if (isNaN(hours) || hours <= 0) {
      toast.error('সঠিক ঘন্টা সংখ্যা দিন')
      return
    }

    const newTime = new Date(Date.now() + hours * 60 * 60 * 1000)
    await updateReminder(rescheduleReminderId, { scheduledTime: newTime.toISOString() })

    const reminder = reminders.find(r => r.id === rescheduleReminderId)
    if (reminder) {
      scheduleNotification(rescheduleReminderId, reminder.title, reminder.description || '', newTime)
    }
    loadReminders().catch(console.error)
    toast.success('রিমাইন্ডার পুনঃনির্ধারণ করা হয়েছে')
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
      toast.error('শিরোনাম এবং সময় দিন')
      return
    }

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
        toast.error('নোটিফিকেশন পাঠাতে পারমিশন দিন')
        toast.info('ব্রাউজার সেটিংস থেকে নোটিফিকেশন পারমিশন দিন', 8000)
        return
      }
      
      toast.success('রিমাইন্ডার সফলভাবে আপডেট করা হয়েছে!')
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
        toast.error('রিমাইন্ডার সংরক্ষণ করতে সমস্যা হয়েছে')
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
        toast.error('নোটিফিকেশন পাঠাতে পারমিশন দিন')
        toast.info('ব্রাউজার সেটিংস থেকে নোটিফিকেশন পারমিশন দিন', 8000)
        return
      }
      
      toast.success('রিমাইন্ডার সফলভাবে সেট করা হয়েছে!')
      
      // Check if browser supports background notifications
      const supportsBackground = 'serviceWorker' in navigator && navigator.serviceWorker.controller
      if (supportsBackground) {
        toast.info('নোটিফিকেশন background এ কাজ করবে (browser বন্ধ থাকলেও)', 6000)
      } else {
        toast.warning('ব্রাউজার খোলা রাখুন নোটিফিকেশনের জন্য', 6000)
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
      'রিমাইন্ডার মুছুন',
      `"${reminder.title}" রিমাইন্ডার মুছে ফেলবেন?`,
      () => {
        deleteReminder(id)
        loadReminders().catch(console.error)
        toast.success('রিমাইন্ডার সফলভাবে মুছে ফেলা হয়েছে')
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
      toast.error('সময় দিন')
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

    // Update reminder with new occurrence
    await updateReminder(reminderToComplete.id, {
      completionCount: updatedCount,
      occurrences: updatedOccurrences,
    })

    loadReminders().catch(console.error)
    toast.success(`"${reminderToComplete.title}" সম্পন্ন! ${updatedCount} বার সম্পন্ন হয়েছে।`)

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

  const handleEditOccurrence = (reminder: Reminder, occurrence: ReminderOccurrence) => {
    setEditingOccurrence({ reminder, occurrence })
    setEditOccurrenceDateTime(toLocalDateTimeValue(new Date(occurrence.completedTime)))
  }

  const handleSaveOccurrenceEdit = async () => {
    if (!editingOccurrence || !editOccurrenceDateTime) {
      toast.error('সময় দিন')
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
    toast.success('সম্পন্নের তারিখ/সময় আপডেট করা হয়েছে')

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
      'সম্পন্নের রেকর্ড মুছুন',
      `এই সম্পন্নের রেকর্ড মুছে ফেলবেন? তারিখ: ${
        occurrence.completedTime && !isNaN(new Date(occurrence.completedTime).getTime())
          ? format(new Date(occurrence.completedTime), 'PPpp', { locale: bn })
          : 'Invalid date'
      }`,
      async () => {
        const updatedOccurrences = (reminder.occurrences || []).filter(occ => occ.id !== occurrence.id)
        const updatedCount = Math.max(0, (reminder.completionCount || 0) - 1)

        await updateReminder(reminder.id, {
          occurrences: updatedOccurrences,
          completionCount: updatedCount,
        })

        loadReminders().catch(console.error)
        toast.success('সম্পন্নের রেকর্ড মুছে ফেলা হয়েছে')

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
    const actionText = newStatus ? 'বাতিল করেছেন' : 'সক্রিয় করেছেন'
    const confirmText = newStatus ? 'বাতিল করি' : 'সক্রিয় করি'
    
    confirm.custom(
      'রিমাইন্ডার অবস্থা পরিবর্তন করুন',
      `"${reminder.title}" রিমাইন্ডার ${actionText} হিসেবে চিহ্নিত করবেন?`,
      () => {
        updateReminder(reminder.id, { dismissed: newStatus })
        loadReminders().catch(console.error)
        toast.success(`রিমাইন্ডার ${actionText} হিসেবে চিহ্নিত করা হয়েছে`)
      },
      {
        confirmText: confirmText,
        cancelText: 'বাতিল',
        type: newStatus ? 'warning' : 'info'
      }
    )
  }

  if (!mounted) {
    return null
  }

  const activeReminders = reminders.filter(r => !r.dismissed)
  const dismissedReminders = reminders.filter(r => r.dismissed)


  return (
    <div className="min-h-full">
      <AppBar title="রিমাইন্ডার" subtitle="সময়মতো মনে করিয়ে দেবে" />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-tile">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <ClockIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-muted">সক্রিয়</span>
            </div>
            <p className="text-2xl font-bold text-content">{activeReminders.length.toLocaleString('bn-BD')}</p>
          </div>
          <div className="stat-tile">
            <div className="flex items-center gap-2 mb-2 text-positive">
              <CheckIcon className="w-5 h-5" />
              <span className="text-xs font-medium text-muted">সম্পন্ন</span>
            </div>
            <p className="text-2xl font-bold text-content">{dismissedReminders.length.toLocaleString('bn-BD')}</p>
          </div>
        </div>

        {dataLoading ? (
          <ListSkeleton count={3} />
        ) : reminders.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center text-muted mb-4">
              <ClockIcon className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-content mb-1">কোনো রিমাইন্ডার নেই</h3>
            <p className="text-sm text-muted mb-5">এখনো কোনো রিমাইন্ডার সেট করেননি</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary mx-auto">
              <PlusIcon className="w-5 h-5" /> প্রথম রিমাইন্ডার যোগ করুন
            </button>
          </div>
        ) : (
          <>
            {activeReminders.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted px-1">সক্রিয়</h2>
                {activeReminders.map((r) => (
                  <div key={r.id} className="card space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-content truncate">{r.title}</h3>
                        <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                          <ClockIcon className="w-3.5 h-3.5" /> {fmtDate(r.scheduledTime)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button className="icon-btn" onClick={() => handleEdit(r)} title="সম্পাদনা"><EditIcon className="w-5 h-5" /></button>
                        <button className="icon-btn" onClick={() => handleDelete(r.id)} title="মুছুন"><TrashIcon className="w-5 h-5" /></button>
                      </div>
                    </div>

                    {r.description && <p className="text-sm text-muted">{r.description}</p>}

                    {(r.isRepetitive || (r.completionCount ?? 0) > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {r.isRepetitive && <span className="chip chip-accent">একাধিকবার</span>}
                        {(r.completionCount ?? 0) > 0 && <span className="chip">✓ {r.completionCount} বার সম্পন্ন</span>}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        className="btn btn-primary flex-1"
                        onClick={() => (r.isRepetitive ? handleCompleteReminder(r) : handleToggleDismiss(r))}
                      >
                        <CheckIcon className="w-4 h-4" /> সম্পন্ন
                      </button>
                      {r.occurrences && r.occurrences.length > 0 && (
                        <button className="btn btn-secondary" onClick={() => setSelectedReminderForHistory(r)}>
                          <HistoryIcon className="w-4 h-4" /> ইতিহাস
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {dismissedReminders.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted px-1">সম্পন্ন</h2>
                {dismissedReminders.map((r) => (
                  <div key={r.id} className="card flex items-center justify-between gap-3 opacity-90">
                    <div className="min-w-0">
                      <h3 className="font-medium text-content truncate line-through">{r.title}</h3>
                      <p className="text-xs text-muted mt-0.5">{fmtDate(r.scheduledTime)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {r.occurrences && r.occurrences.length > 0 && (
                        <button className="icon-btn" onClick={() => setSelectedReminderForHistory(r)} title="ইতিহাস"><HistoryIcon className="w-5 h-5" /></button>
                      )}
                      <button className="icon-btn" onClick={() => handleToggleDismiss(r)} title="সক্রিয় করুন"><RotateIcon className="w-5 h-5" /></button>
                      <button className="icon-btn" onClick={() => handleDelete(r.id)} title="মুছুন"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowForm(true)} aria-label="নতুন রিমাইন্ডার যোগ করুন">
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* Add / Edit reminder */}
      <Modal
        isOpen={showForm}
        onClose={handleCancelEdit}
        title={editingReminder ? 'রিমাইন্ডার সম্পাদনা করুন' : 'নতুন রিমাইন্ডার'}
        footerActions={<>
          <ActionButton onClick={handleCancelEdit} variant="secondary">বাতিল</ActionButton>
          <ActionButton onClick={(e) => e && handleSubmit(e)} variant="primary">{editingReminder ? 'আপডেট' : 'সংরক্ষণ'}</ActionButton>
        </>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label label-required">শিরোনাম</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="যেমন: ওষুধ খাওয়া" required />
          </div>
          <div>
            <label className="label">বিবরণ (ঐচ্ছিক)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[80px] resize-none" placeholder="অতিরিক্ত বিবরণ" rows={3} />
          </div>
          <div>
            <label className="label label-required">সময়</label>
            <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="input" required />
          </div>
          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <input type="checkbox" checked={isRepetitive} onChange={(e) => setIsRepetitive(e.target.checked)} className="w-5 h-5 rounded accent-[color:var(--accent)]" />
            <span className="text-sm text-content">একাধিকবার সম্পন্ন করব (ইতিহাস রাখা হবে)</span>
          </label>
        </form>
      </Modal>

      {/* Complete reminder */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => { setShowCompleteModal(false); setReminderToComplete(null); setCompletionDateTime('') }}
        title={reminderToComplete ? `${reminderToComplete.title} — সম্পন্ন` : 'সম্পন্ন করুন'}
        footerActions={<>
          <ActionButton onClick={() => { setShowCompleteModal(false); setReminderToComplete(null); setCompletionDateTime('') }} variant="secondary">বাতিল</ActionButton>
          <ActionButton onClick={handleSaveCompletion} variant="primary">সম্পন্ন</ActionButton>
        </>}
      >
        <div className="space-y-3">
          {reminderToComplete && (reminderToComplete.completionCount ?? 0) > 0 && (
            <p className="text-sm text-muted">পূর্বে {reminderToComplete.completionCount} বার সম্পন্ন হয়েছে</p>
          )}
          <div>
            <label className="label label-required">কখন সম্পন্ন করেছেন?</label>
            <input type="datetime-local" value={completionDateTime} onChange={(e) => setCompletionDateTime(e.target.value)} className="input" required />
          </div>
        </div>
      </Modal>

      {/* Edit occurrence */}
      <Modal
        isOpen={!!editingOccurrence}
        onClose={() => { setEditingOccurrence(null); setEditOccurrenceDateTime('') }}
        title="সম্পন্নের সময় সম্পাদনা"
        zIndex={10000}
        footerActions={<>
          <ActionButton onClick={() => { setEditingOccurrence(null); setEditOccurrenceDateTime('') }} variant="secondary">বাতিল</ActionButton>
          <ActionButton onClick={handleSaveOccurrenceEdit} variant="primary">আপডেট</ActionButton>
        </>}
      >
        <div>
          <label className="label label-required">সম্পন্ন তারিখ/সময়</label>
          <input type="datetime-local" value={editOccurrenceDateTime} onChange={(e) => setEditOccurrenceDateTime(e.target.value)} className="input" required />
        </div>
      </Modal>

      {/* History */}
      <Modal
        isOpen={!!selectedReminderForHistory}
        onClose={() => setSelectedReminderForHistory(null)}
        title={selectedReminderForHistory ? `${selectedReminderForHistory.title} — ইতিহাস` : 'ইতিহাস'}
        footerActions={<ActionButton onClick={() => setSelectedReminderForHistory(null)} variant="secondary">বন্ধ করুন</ActionButton>}
      >
        {selectedReminderForHistory && (
          <div className="space-y-3">
            <p className="text-sm text-muted">মোট সম্পন্ন: {selectedReminderForHistory.completionCount || 0} বার</p>
            {selectedReminderForHistory.occurrences && selectedReminderForHistory.occurrences.length > 0 ? (
              [...selectedReminderForHistory.occurrences]
                .sort((a, b) => new Date(a.completedTime).getTime() - new Date(b.completedTime).getTime())
                .map((occ, index) => (
                  <div key={occ.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-content">#{(index + 1).toLocaleString('bn-BD')}</p>
                      <p className="text-xs text-muted truncate">{fmtDate(occ.completedTime)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="icon-btn w-8 h-8" onClick={() => handleEditOccurrence(selectedReminderForHistory, occ)}><EditIcon className="w-4 h-4" /></button>
                      <button className="icon-btn w-8 h-8" onClick={() => handleDeleteOccurrence(selectedReminderForHistory, occ)}><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-muted text-center py-6">এখনো কোনো সম্পন্নের রেকর্ড নেই</p>
            )}
          </div>
        )}
      </Modal>

      {/* Reschedule (replaces native prompt) */}
      <Modal
        isOpen={!!rescheduleReminderId}
        onClose={() => setRescheduleReminderId(null)}
        title="আবার মনে করিয়ে দিন"
        zIndex={10001}
        footerActions={<>
          <ActionButton onClick={() => setRescheduleReminderId(null)} variant="secondary">বাতিল</ActionButton>
          <ActionButton onClick={handleSaveReschedule} variant="primary">নির্ধারণ করুন</ActionButton>
        </>}
      >
        <div>
          <label className="label label-required">কত ঘন্টা পরে আবার রিমাইন্ডার দিতে চান?</label>
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={rescheduleHours}
            onChange={(e) => setRescheduleHours(e.target.value)}
            className="input"
            placeholder="যেমন: ১"
            required
          />
        </div>
      </Modal>
    </div>
  )
}
