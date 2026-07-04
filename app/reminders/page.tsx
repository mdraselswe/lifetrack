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
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    setupServiceWorker()
    // Set default date after mount
    setScheduledTime(new Date().toISOString().slice(0, 16))
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
      // Open reschedule modal or prompt
      const hours = prompt('কত ঘন্টা পরে আবার রিমাইন্ডার দিতে চান?', '1')
      if (hours) {
        const newTime = new Date(Date.now() + parseInt(hours) * 60 * 60 * 1000)
        updateReminder(reminderId, { scheduledTime: newTime.toISOString() })
        
        const reminder = reminders.find(r => r.id === reminderId)
        if (reminder) {
          scheduleNotification(reminderId, reminder.title, reminder.description || '', newTime)
        }
        loadReminders().catch(console.error)
      }
    }
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
    setScheduledTime(new Date().toISOString().slice(0, 16))
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
    setScheduledTime(new Date().toISOString().slice(0, 16))
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
    setCompletionDateTime(new Date().toISOString().slice(0, 16))
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
    setEditOccurrenceDateTime(new Date(occurrence.completedTime).toISOString().slice(0, 16))
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
    <div className="min-h-full full-vh bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 relative overflow-hidden safe-area-top safe-area-left safe-area-right">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto sm:px-6 py-4 sm:py-6">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12 fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl mb-4 sm:mb-6 float-gentle">
            <span className="text-2xl sm:text-3xl">⏰</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-indigo-800 bg-clip-text text-transparent mb-3 sm:mb-4 float-gentle">
            রিমাইন্ডার
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 slide-up max-w-md mx-auto leading-relaxed px-4">
            সময়মতো নোটিফিকেশন পান
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 stagger-item">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">সক্রিয় রিমাইন্ডার</p>
                <p className="text-2xl font-bold text-purple-600">{activeReminders.length}</p>
                <p className="text-xs text-gray-500">চালু আছে</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <span className="text-2xl">⏰</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 stagger-item">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">বাতিল রিমাইন্ডার</p>
                <p className="text-2xl font-bold text-gray-600">{dismissedReminders.length}</p>
                <p className="text-xs text-gray-500">বন্ধ আছে</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <span className="text-2xl">⏸️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Add Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowForm(!showForm)}
            className="group relative overflow-hidden bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-2xl px-8 py-4 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center gap-3 text-white font-semibold text-lg">
              <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                {showForm ? '✕' : '➕'}
              </span>
              {showForm ? 'বাতিল করুন' : 'নতুন রিমাইন্ডার যোগ করুন'}
            </div>
          </button>
        </div>

        {/* Add/Edit Reminder Modal */}
        <Modal
          isOpen={showForm}
          onClose={handleCancelEdit}
          title={editingReminder ? "রিমাইন্ডার সম্পাদনা করুন" : "নতুন রিমাইন্ডার যোগ করুন"}
          className="border-purple-200"
          footerActions={
            <div className="flex justify-end space-x-3">
              <ActionButton
                onClick={handleCancelEdit}
                variant="secondary"
              >
                বাতিল
              </ActionButton>
              <ActionButton
                onClick={(e) => e && handleSubmit(e)}
                variant="primary"
              >
                {editingReminder ? "আপডেট করুন" : "রিমাইন্ডার সংরক্ষণ করুন"}
              </ActionButton>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">শিরোনাম *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input focus:ring-purple-500/50 focus:border-purple-500/50"
                placeholder="যেমন: ওষুধ খাওয়া"
                required
              />
            </div>
            <div>
              <label className="label">বিবরণ (ঐচ্ছিক)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input focus:ring-purple-500/50 focus:border-purple-500/50"
                rows={3}
                placeholder="অতিরিক্ত বিবরণ"
              />
            </div>
            <div>
              <label className="label">সময় *</label>
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="input focus:ring-purple-500/50 focus:border-purple-500/50"
                required
              />
            </div>
            
            {/* Multiple Times Track Option */}
            <div className="border-t pt-4 mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRepetitive}
                  onChange={(e) => setIsRepetitive(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="label mb-0">একাধিক বার track করতে হবে</span>
              </label>
              
              {isRepetitive && (
                <div className="mt-4 bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    ✓ এই reminder একাধিক বার complete করতে পারবেন<br/>
                    ✓ প্রতিবার complete করার সময় তারিখ/সময় set করতে পারবেন<br/>
                    ✓ সব completions history-তে রাখা হবে
                  </p>
                </div>
              )}
            </div>
          </form>
        </Modal>

        {/* Completion Modal */}
        <Modal
          isOpen={showCompleteModal}
          onClose={() => {
            setShowCompleteModal(false)
            setReminderToComplete(null)
            setCompletionDateTime('')
          }}
          title={`${reminderToComplete?.title} - সম্পন্ন করুন`}
          className="border-green-200"
          footerActions={
            <div className="flex justify-end space-x-3">
              <ActionButton
                onClick={() => {
                  setShowCompleteModal(false)
                  setReminderToComplete(null)
                  setCompletionDateTime('')
                }}
                variant="secondary"
              >
                বাতিল
              </ActionButton>
              <ActionButton
                onClick={handleSaveCompletion}
                variant="primary"
              >
                সম্পন্ন করুন
              </ActionButton>
            </div>
          }
        >
          {reminderToComplete && (
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Reminder:</strong> {reminderToComplete.title}
                </p>
                {reminderToComplete.completionCount && reminderToComplete.completionCount > 0 && (
                  <p className="text-sm text-gray-600">
                    পূর্বে {reminderToComplete.completionCount} বার সম্পন্ন হয়েছে
                  </p>
                )}
              </div>
              
              <div>
                <label className="label">কখন সম্পন্ন করেছেন? *</label>
                <input
                  type="datetime-local"
                  value={completionDateTime}
                  onChange={(e) => setCompletionDateTime(e.target.value)}
                  className="input focus:ring-green-500/50 focus:border-green-500/50"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 space-y-1">
                  <span className="block">
                    যে তারিখ এবং সময়ে আপনি এই কাজটি সম্পন্ন করেছেন, সেই date এবং time সিলেক্ট করুন।
                  </span>
                  {(() => {
                    const exampleDate = addDays(new Date(), -2)
                    const formattedDate = format(exampleDate, 'EEEE, d MMMM yyyy, h:mm a', { locale: bn })
                    const isoDateTime = exampleDate.toISOString().slice(0, 16)
                    return (
                      <span className="block mt-2 font-medium text-gray-700 bg-gray-50 p-2 rounded">
                        উদাহরণ: যদি {formattedDate} সম্পন্ন করে থাকেন,<br />
                        তাহলে উপরের field-এ <code className="text-xs bg-white px-1 py-0.5 rounded">{isoDateTime}</code> সিলেক্ট করুন
                      </span>
                    )
                  })()}
                </p>
              </div>
            </div>
          )}
        </Modal>

        {/* Edit Occurrence Modal */}
        <Modal
          isOpen={!!editingOccurrence}
          onClose={() => {
            setEditingOccurrence(null)
            setEditOccurrenceDateTime('')
          }}
          title="সম্পন্নের তারিখ/সময় সম্পাদনা করুন"
          className="border-yellow-200"
          zIndex={10000}
          footerActions={
            <div className="flex justify-end space-x-3">
              <ActionButton
                onClick={() => {
                  setEditingOccurrence(null)
                  setEditOccurrenceDateTime('')
                }}
                variant="secondary"
              >
                বাতিল
              </ActionButton>
              <ActionButton
                onClick={handleSaveOccurrenceEdit}
                variant="primary"
              >
                আপডেট করুন
              </ActionButton>
            </div>
          }
        >
          {editingOccurrence && (
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Reminder:</strong> {editingOccurrence.reminder.title}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>বর্তমান তারিখ:</strong> {
                    editingOccurrence.occurrence.completedTime && !isNaN(new Date(editingOccurrence.occurrence.completedTime).getTime())
                      ? format(new Date(editingOccurrence.occurrence.completedTime), 'PPpp', { locale: bn })
                      : 'Invalid date'
                  }
                </p>
              </div>
              
              <div>
                <label className="label">সম্পন্ন তারিখ/সময় *</label>
                <input
                  type="datetime-local"
                  value={editOccurrenceDateTime}
                  onChange={(e) => setEditOccurrenceDateTime(e.target.value)}
                  className="input focus:ring-yellow-500/50 focus:border-yellow-500/50"
                  required
                />
              </div>
            </div>
          )}
        </Modal>

        {/* History Modal */}
        <Modal
          isOpen={!!selectedReminderForHistory}
          onClose={() => setSelectedReminderForHistory(null)}
          title={`${selectedReminderForHistory?.title} - ইতিহাস`}
          className="border-purple-200"
          footerActions={
            <ActionButton
              onClick={() => setSelectedReminderForHistory(null)}
              variant="secondary"
            >
              বন্ধ করুন
            </ActionButton>
          }
        >
          {selectedReminderForHistory && (
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">
                  <strong>মোট সম্পন্ন:</strong> {selectedReminderForHistory.completionCount || 0} বার
                </p>
              </div>
              
              {selectedReminderForHistory.occurrences && selectedReminderForHistory.occurrences.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <h3 className="font-semibold text-gray-800 mb-3">সম্পন্নের তালিকা (পুরানো থেকে নতুন):</h3>
                  {[...selectedReminderForHistory.occurrences]
                    .sort((a, b) => new Date(a.completedTime).getTime() - new Date(b.completedTime).getTime())
                    .map((occurrence, index) => (
                    <div
                      key={occurrence.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-bold text-purple-600">#{index + 1}</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                              ✓ সম্পন্ন
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>
                              <strong>সম্পন্ন তারিখ/সময়:</strong> {
                                occurrence.completedTime && !isNaN(new Date(occurrence.completedTime).getTime())
                                  ? format(new Date(occurrence.completedTime), 'PPpp', { locale: bn })
                                  : 'Invalid date'
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEditOccurrence(selectedReminderForHistory, occurrence)}
                            className="px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                            title="সম্পাদনা করুন"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteOccurrence(selectedReminderForHistory, occurrence)}
                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                            title="মুছুন"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>এখনো কোনো সম্পন্নের রেকর্ড নেই</p>
                </div>
              )}
            </div>
          )}
        </Modal>

        <div className="space-y-8">
          {activeReminders.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600">⏰</span>
                </div>
                সক্রিয় রিমাইন্ডার
              </h2>
              <div className="grid gap-6">
                {activeReminders.map((reminder) => (
                  <div key={reminder.id} className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-lg sm:text-xl">⏰</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-bold text-lg sm:text-xl text-gray-900 break-words">
                                {reminder.title}
                              </h3>
                              {reminder.isRepetitive && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full whitespace-nowrap">
                                  📝 একাধিক বার
                                </span>
                              )}
                              {reminder.isRepetitive && reminder.completionCount && reminder.completionCount > 0 && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full whitespace-nowrap">
                                  ✓ {reminder.completionCount} বার সম্পন্ন
                                </span>
                              )}
                            </div>
                            {reminder.description && (
                              <p className="text-gray-600 text-sm mb-3 leading-relaxed break-words">{reminder.description}</p>
                            )}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                                <span>📅</span>
                                <span className="break-words">
                                  {reminder.scheduledTime && !isNaN(new Date(reminder.scheduledTime).getTime())
                                    ? format(new Date(reminder.scheduledTime), 'PPpp', { locale: bn })
                                    : 'Invalid date'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Action buttons - mobile friendly */}
                        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:flex-col lg:flex-row justify-start sm:justify-end">
                          <button
                            onClick={() => handleEdit(reminder)}
                            className="px-3 sm:px-3 py-2 sm:py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 text-sm sm:text-base flex items-center justify-center gap-1 sm:gap-0 min-w-[44px] sm:min-w-0"
                            title="সম্পাদনা করুন"
                          >
                            <span className="text-base sm:text-lg">✏️</span>
                            <span className="sm:hidden text-xs">সম্পাদনা</span>
                          </button>
                          {reminder.isRepetitive && (
                            <button
                              onClick={() => handleCompleteReminder(reminder)}
                              className="px-3 sm:px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 font-semibold text-sm sm:text-base flex items-center justify-center gap-1 sm:gap-0 flex-1 sm:flex-none"
                              title="সম্পন্ন করুন (date/time set করুন)"
                            >
                              <span className="text-base sm:text-lg">✓</span>
                              <span className="sm:hidden">সম্পন্ন</span>
                              <span className="hidden sm:inline">সম্পন্ন</span>
                            </button>
                          )}
                          {!reminder.isRepetitive && (
                            <button
                              onClick={() => handleToggleDismiss(reminder)}
                              className="px-3 sm:px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 text-base sm:text-lg flex items-center justify-center min-w-[44px] sm:min-w-0"
                              title="সম্পন্ন করুন"
                            >
                              ✓
                            </button>
                          )}
                          {reminder.occurrences && reminder.occurrences.length > 0 && (
                            <button
                              onClick={() => setSelectedReminderForHistory(reminder)}
                              className="px-3 sm:px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 text-sm sm:text-base flex items-center justify-center gap-1 sm:gap-0 min-w-[44px] sm:min-w-0"
                              title="ইতিহাস দেখুন"
                            >
                              <span className="text-base sm:text-lg">📊</span>
                              <span className="sm:hidden text-xs">ইতিহাস</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(reminder.id)}
                            className="px-3 sm:px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 text-sm sm:text-base flex items-center justify-center gap-1 sm:gap-0 min-w-[44px] sm:min-w-0"
                            title="মুছুন"
                          >
                            <span className="text-base sm:text-lg">🗑️</span>
                            <span className="sm:hidden text-xs">মুছুন</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dismissedReminders.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600">✓</span>
                </div>
                সম্পন্ন রিমাইন্ডার
              </h2>
              <div className="grid gap-4 sm:gap-6">
                {dismissedReminders.map((reminder) => (
                  <div key={reminder.id} className="group relative overflow-hidden bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300">
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-lg sm:text-xl">✓</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-bold text-lg sm:text-xl text-gray-700 line-through break-words">
                                {reminder.title}
                              </h3>
                              {reminder.isRepetitive && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full whitespace-nowrap">
                                  📝 একাধিক বার
                                </span>
                              )}
                              {reminder.isRepetitive && reminder.completionCount && reminder.completionCount > 0 && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full whitespace-nowrap">
                                  ✓ {reminder.completionCount} বার সম্পন্ন
                                </span>
                              )}
                            </div>
                            {reminder.description && (
                              <p className="text-gray-600 text-sm mb-3 leading-relaxed break-words">{reminder.description}</p>
                            )}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                                <span>📅</span>
                                <span className="break-words">
                                  {reminder.scheduledTime && !isNaN(new Date(reminder.scheduledTime).getTime())
                                    ? format(new Date(reminder.scheduledTime), 'PPpp', { locale: bn })
                                    : 'Invalid date'}
                                </span>
                              </div>
                              {reminder.createdAt && !isNaN(new Date(reminder.createdAt).getTime()) && (
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>তৈরি:</span>
                                  <span>
                                    {format(new Date(reminder.createdAt), 'PPp', { locale: bn })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Action buttons - mobile friendly */}
                        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:flex-col lg:flex-row justify-start sm:justify-end">
                          {reminder.occurrences && reminder.occurrences.length > 0 && (
                            <button
                              onClick={() => setSelectedReminderForHistory(reminder)}
                              className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 text-sm sm:text-base flex items-center justify-center gap-1 sm:gap-0 min-w-[44px] sm:min-w-0"
                              title="ইতিহাস দেখুন"
                            >
                              <span className="text-base sm:text-lg">📊</span>
                              <span className="sm:hidden text-xs">ইতিহাস</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleDismiss(reminder)}
                            className="px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 text-sm sm:text-base flex items-center justify-center gap-1 sm:gap-0 min-w-[44px] sm:min-w-0"
                            title="সক্রিয় করুন"
                          >
                            <span className="text-base sm:text-lg">↺</span>
                            <span className="sm:hidden text-xs">সক্রিয়</span>
                          </button>
                          <button
                            onClick={() => handleDelete(reminder.id)}
                            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 text-sm sm:text-base flex items-center justify-center gap-1 sm:gap-0 min-w-[44px] sm:min-w-0"
                            title="মুছুন"
                          >
                            <span className="text-base sm:text-lg">🗑️</span>
                            <span className="sm:hidden text-xs">মুছুন</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dataLoading ? (
            <ListSkeleton count={3} />
          ) : reminders.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6">
                <span className="text-4xl text-gray-400">⏰</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">কোনো রিমাইন্ডার নেই</h3>
              <p className="text-gray-500 mb-6">এখনো কোনো রিমাইন্ডার সেট করেননি</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <span>➕</span>
                প্রথম রিমাইন্ডার যোগ করুন
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

