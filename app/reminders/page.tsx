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
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [mounted, setMounted] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
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
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
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
                বাতিল
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
          </form>
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
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xl">⏰</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-xl text-gray-900 mb-2">
                              {reminder.title}
                            </h3>
                            {reminder.description && (
                              <p className="text-gray-600 text-sm mb-3 leading-relaxed">{reminder.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                              <span>📅</span>
                              <span>
                                {format(new Date(reminder.scheduledTime), 'PPpp', { locale: bn })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleDismiss(reminder)}
                            className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleDelete(reminder.id)}
                            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
                          >
                            🗑️
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
                          className="px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md transition-colors duration-200 shadow-sm hover:shadow-md"
                        >
                          ↺
                        </button>
                        <button
                          onClick={() => handleDelete(reminder.id)}
                          className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors duration-200 shadow-sm hover:shadow-md"
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
          )}
        </div>
      </div>
    </div>
  )
}

