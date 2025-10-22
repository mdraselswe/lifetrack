'use client'

import { useEffect, useState } from 'react'
import { getReminders, saveReminder, updateReminder, deleteReminder } from '@/lib/storage'
import { scheduleNotification } from '@/lib/notifications'
import type { Reminder } from '@/lib/types'
import { format } from 'date-fns'
import { bn } from 'date-fns/locale'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'
import Modal, { ActionButton } from '@/components/Modal'

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadReminders()
    setupServiceWorker()
    // Set default date after mount
    setScheduledTime(new Date().toISOString().slice(0, 16))
  }, [])

  const setupServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service Worker registered:', registration)
        
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
        loadReminders()
      }
    }
  }

  const loadReminders = () => {
    setReminders(getReminders())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !scheduledTime) {
      toast.error('শিরোনাম এবং সময় দিন')
      return
    }

    const reminder: Reminder = {
      id: Date.now().toString(),
      title,
      description,
      scheduledTime,
      dismissed: false,
      createdAt: new Date().toISOString(),
    }

    saveReminder(reminder)
    
    // Schedule notification
    const hasPermission = await scheduleNotification(
      reminder.id,
      reminder.title,
      reminder.description || '',
      new Date(scheduledTime)
    )
    
    if (hasPermission === false) {
      toast.error('নোটিফিকেশন পাঠাতে পারমিশন দিন')
      return
    }
    
    toast.success('রিমাইন্ডার সফলভাবে সেট করা হয়েছে!')
    toast.warning('ব্রাউজার খোলা রাখুন নোটিফিকেশনের জন্য!', 6000)

    setTitle('')
    setDescription('')
    setScheduledTime('')
    setShowForm(false)
    loadReminders()
  }

  const handleDelete = (id: string) => {
    const reminder = reminders.find(r => r.id === id)
    if (!reminder) return
    
    confirm.delete(
      'রিমাইন্ডার মুছুন',
      `"${reminder.title}" রিমাইন্ডার মুছে ফেলবেন?`,
      () => {
        deleteReminder(id)
        loadReminders()
        toast.success('রিমাইন্ডার সফলভাবে মুছে ফেলা হয়েছে')
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
        loadReminders()
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
    <div className="min-h-full bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">⏰ রিমাইন্ডার</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            {showForm ? 'বাতিল' : '+ নতুন রিমাইন্ডার'}
          </button>
        </div>

        {/* Add Reminder Modal */}
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="নতুন রিমাইন্ডার যোগ করুন"
          className="border-purple-200"
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
                রিমাইন্ডার সংরক্ষণ করুন
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
                className="input"
                placeholder="যেমন: ওষুধ খাওয়া"
                required
              />
            </div>
            <div>
              <label className="label">বিবরণ (ঐচ্ছিক)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
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
                className="input"
                required
              />
            </div>
          </form>
        </Modal>

        <div className="space-y-6">
          {activeReminders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">সক্রিয় রিমাইন্ডার</h2>
              <div className="space-y-3">
                {activeReminders.map((reminder) => (
                  <div key={reminder.id} className="card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {reminder.title}
                        </h3>
                        {reminder.description && (
                          <p className="text-gray-600 text-sm mb-2">{reminder.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>📅</span>
                          <span>
                            {format(new Date(reminder.scheduledTime), 'PPpp', { locale: bn })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleDismiss(reminder)}
                          className="btn btn-secondary text-xs"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleDelete(reminder.id)}
                          className="btn btn-danger text-xs"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dismissedReminders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">সম্পন্ন রিমাইন্ডার</h2>
              <div className="space-y-3">
                {dismissedReminders.map((reminder) => (
                  <div key={reminder.id} className="card bg-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-700 line-through mb-1">
                          {reminder.title}
                        </h3>
                        {reminder.description && (
                          <p className="text-gray-500 text-sm mb-2">{reminder.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleDismiss(reminder)}
                          className="btn btn-secondary text-xs"
                        >
                          ↺
                        </button>
                        <button
                          onClick={() => handleDelete(reminder.id)}
                          className="btn btn-danger text-xs"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reminders.length === 0 && (
            <div className="card text-center py-12 bg-white">
              <p className="text-gray-500 text-lg mb-2">কোনো রিমাইন্ডার নেই</p>
              <p className="text-gray-400 text-sm">উপরের "+ নতুন" বাটনে ক্লিক করে যোগ করুন</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

