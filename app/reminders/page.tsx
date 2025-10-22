'use client'

import { useEffect, useState } from 'react'
import { getReminders, saveReminder, updateReminder, deleteReminder } from '@/lib/storage'
import { scheduleNotification } from '@/lib/notifications'
import { Reminder } from '@/lib/types'
import { format } from 'date-fns'
import { bn } from 'date-fns/locale'

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
      alert('শিরোনাম এবং সময় দিন')
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
    await scheduleNotification(
      reminder.id,
      reminder.title,
      reminder.description || '',
      new Date(scheduledTime)
    )
    
    alert('✅ রিমাইন্ডার সেট করা হয়েছে!\n\n⚠️ ব্রাউজার খোলা রাখুন!')

    setTitle('')
    setDescription('')
    setScheduledTime('')
    setShowForm(false)
    loadReminders()
  }

  const handleDelete = (id: string) => {
    if (confirm('এই রিমাইন্ডারটি মুছে ফেলবেন?')) {
      deleteReminder(id)
      loadReminders()
    }
  }

  const handleToggleDismiss = (reminder: Reminder) => {
    updateReminder(reminder.id, { dismissed: !reminder.dismissed })
    loadReminders()
  }

  if (!mounted) {
    return null
  }

  const activeReminders = reminders.filter(r => !r.dismissed)
  const dismissedReminders = reminders.filter(r => r.dismissed)

  return (
    <div className="min-h-full bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-purple-900">⏰ রিমাইন্ডার</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            {showForm ? 'বাতিল' : '+ নতুন'}
          </button>
        </div>

        {showForm && (
          <div className="card mb-6 bg-white">
            <h2 className="text-xl font-semibold mb-4">নতুন রিমাইন্ডার যোগ করুন</h2>
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
              <button type="submit" className="btn btn-primary w-full">
                রিমাইন্ডার সংরক্ষণ করুন
              </button>
            </form>
          </div>
        )}

        <div className="space-y-6">
          {activeReminders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">সক্রিয় রিমাইন্ডার</h2>
              <div className="space-y-3">
                {activeReminders.map((reminder) => (
                  <div key={reminder.id} className="card bg-white hover:shadow-lg transition-shadow">
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
                  <div key={reminder.id} className="card bg-gray-100 opacity-75">
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

