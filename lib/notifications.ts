// setTimeout stores its delay in a signed 32-bit int; delays above this value
// overflow and fire immediately. Clamp to the cap and re-schedule the remainder
// so far-future notifications don't fire instantly.
const MAX_TIMEOUT = 2147483647 // ~24.8 days

const scheduleTimeout = (callback: () => void, delay: number): void => {
  if (delay > MAX_TIMEOUT) {
    setTimeout(() => scheduleTimeout(callback, delay - MAX_TIMEOUT), MAX_TIMEOUT)
  } else {
    setTimeout(callback, delay)
  }
}

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    alert('এই ব্রাউজার নোটিফিকেশন সাপোর্ট করে না')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export const scheduleNotification = async (
  id: string,
  title: string,
  body: string,
  scheduledTime: Date
): Promise<boolean> => {
  console.log('Scheduling notification:', { id, title, body, scheduledTime })
  
  const hasPermission = await requestNotificationPermission()
  if (!hasPermission) {
    console.error('Notification permission not granted')
    return false
  }

  const delay = scheduledTime.getTime() - Date.now()
  console.log('Notification delay:', delay, 'ms')
  
  if (delay <= 0) {
    // Show immediately
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: id,
        })
        console.log('Notification shown immediately:', notification)
        return true
      }
    } catch (error) {
      console.error('Error showing immediate notification:', error)
    }
    return false
  }

  // Schedule notification via Service Worker for background notifications
  try {
    // Wait for service worker to be ready
    let registration: ServiceWorkerRegistration | null = null
    
    if ('serviceWorker' in navigator) {
      try {
        registration = await navigator.serviceWorker.ready
        console.log('Service Worker ready:', registration)
      } catch (error) {
        console.error('Service Worker not ready:', error)
      }
    }

    // Method 1: Try to send via Service Worker controller
    if (navigator.serviceWorker.controller) {
      console.log('Sending notification to Service Worker controller')
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        data: {
          id,
          title,
          body,
          scheduledTime: scheduledTime.getTime()
        }
      })
    } else if (registration) {
      // Method 2: Send via registration
      console.log('Sending notification via registration')
      registration.active?.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        data: {
          id,
          title,
          body,
          scheduledTime: scheduledTime.getTime()
        }
      })
    }

    // Also schedule in current context as fallback — but ONLY when there is no
    // active Service Worker controller. Otherwise the SW and this page would
    // both fire the same notification (duplicate).
    if (!navigator.serviceWorker?.controller) {
      console.log('Scheduling fallback notification with setTimeout')
      scheduleTimeout(() => {
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
              body,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: id,
              requireInteraction: true, // Keep notification until user interacts
            })

            // Add click handler to focus window
            notification.onclick = () => {
              window.focus()
              notification.close()
            }

            console.log('Fallback notification shown:', notification)
          } else {
            console.warn('Cannot show notification: permission not granted')
          }
        } catch (error) {
          console.error('Error showing fallback notification:', error)
        }
      }, delay)
    }

    console.log('Notification scheduled successfully')
    return true
  } catch (error) {
    console.error('Error scheduling notification:', error)
    
    // Last resort: use setTimeout directly
    try {
      scheduleTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/icon-192x192.png',
            tag: id,
          })
        }
      }, delay)
      return true
    } catch (fallbackError) {
      console.error('Fallback notification failed:', fallbackError)
      return false
    }
  }
}

export const cancelNotification = async (id: string): Promise<void> => {
  try {
    // Send cancel message to service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CANCEL_NOTIFICATION',
        id
      })
    }
    
    // Also try to get all notifications and close matching ones
    if ('Notification' in window && 'ServiceWorkerRegistration' in window) {
      const registration = await navigator.serviceWorker.ready
      const notifications = await registration.getNotifications({ tag: id })
      notifications.forEach(notification => notification.close())
    }
  } catch (error) {
    console.error('Error cancelling notification:', error)
  }
}

