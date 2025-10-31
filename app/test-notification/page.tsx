'use client'

import { useState, useEffect } from 'react'
import { scheduleNotification, requestNotificationPermission } from '@/lib/notifications'
import { toast } from '@/lib/toast'

export default function TestNotificationPage() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [testDelay, setTestDelay] = useState('5')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    checkPermission()
  }, [])

  const checkPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }

  const requestPermission = async () => {
    const perm = await requestNotificationPermission()
    setPermission(perm ? 'granted' : 'denied')
    if (perm) {
      toast.success('Notification permission granted!')
    } else {
      toast.error('Notification permission denied')
    }
  }

  const testImmediateNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is an immediate test notification',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
      })
      toast.success('Immediate notification sent!')
    } else {
      toast.error('Notification permission not granted')
    }
  }

  const testScheduledNotification = async () => {
    const delaySeconds = parseInt(testDelay) || 5
    const scheduledTime = new Date(Date.now() + delaySeconds * 1000)
    
    const success = await scheduleNotification(
      `test-${Date.now()}`,
      'Test Scheduled Notification',
      `This notification will appear in ${delaySeconds} seconds`,
      scheduledTime
    )
    
    if (success) {
      toast.success(`Notification scheduled for ${delaySeconds} seconds`)
    } else {
      toast.error('Failed to schedule notification')
    }
  }

  const checkServiceWorker = () => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          console.log('Service Worker registered:', registration)
          toast.success('Service Worker is registered!')
        } else {
          console.log('Service Worker not registered')
          toast.error('Service Worker not registered')
        }
      }).catch((error) => {
        console.error('Error checking Service Worker:', error)
        toast.error('Error checking Service Worker')
      })
    } else {
      toast.error('Service Worker not supported')
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">🔔</span>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Notification Test Page</h1>
        
        {/* Permission Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Permission Status</h2>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded ${
              permission === 'granted' ? 'bg-green-100 text-green-700' :
              permission === 'denied' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {permission}
            </span>
            <button
              onClick={checkPermission}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Check Permission
            </button>
            <button
              onClick={requestPermission}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Request Permission
            </button>
          </div>
        </div>

        {/* Service Worker Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Service Worker Status</h2>
          <button
            onClick={checkServiceWorker}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Check Service Worker
          </button>
        </div>

        {/* Test Notifications */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Test Notifications</h2>
          
          <div className="space-y-4">
            <button
              onClick={testImmediateNotification}
              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
            >
              Test Immediate Notification
            </button>

            <div className="flex gap-2">
              <input
                type="number"
                value={testDelay}
                onChange={(e) => setTestDelay(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Delay in seconds"
                min="1"
                max="60"
              />
              <button
                onClick={testScheduledNotification}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
              >
                Test Scheduled ({testDelay}s)
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Click "Request Permission" to allow notifications</li>
            <li>Click "Check Service Worker" to verify SW is registered</li>
            <li>Test immediate notification to see if basic notifications work</li>
            <li>Test scheduled notification with a short delay (5-10 seconds)</li>
            <li>Check browser console (F12) for debug messages</li>
            <li>If notifications don't work, check browser settings for notification permissions</li>
          </ol>
        </div>

        {/* Debug Info */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
          <div className="text-sm text-gray-700 space-y-1">
            <p>Notification API: {typeof window !== 'undefined' && ('Notification' in window) ? '✅ Supported' : '❌ Not Supported'}</p>
            <p>Service Worker: {typeof navigator !== 'undefined' && ('serviceWorker' in navigator) ? '✅ Supported' : '❌ Not Supported'}</p>
            <p>Current Permission: {permission}</p>
            <p>Check browser console (F12) for detailed logs</p>
          </div>
        </div>
      </div>
    </div>
  )
}

