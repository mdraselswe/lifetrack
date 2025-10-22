// PWA Registration and Management for Next.js 16

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Worker not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    console.log('Service Worker registered successfully:', registration.scope)

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('New version available')
            // You can show a notification to the user here
          }
        })
      }
    })

    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

export const unregisterServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(registration => registration.unregister()))
    console.log('Service Workers unregistered')
  } catch (error) {
    console.error('Service Worker unregistration failed:', error)
  }
}

export const clearCaches = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return
  }

  try {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    )
    console.log('All caches cleared')
  } catch (error) {
    console.error('Cache clearing failed:', error)
  }
}

export const getServiceWorkerStatus = async (): Promise<{
  isSupported: boolean
  isRegistered: boolean
  isControlling: boolean
  registration: ServiceWorkerRegistration | null
}> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      isSupported: false,
      isRegistered: false,
      isControlling: false,
      registration: null,
    }
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    return {
      isSupported: true,
      isRegistered: !!registration,
      isControlling: !!navigator.serviceWorker.controller,
      registration: registration || null,
    }
  } catch (error) {
    console.error('Service Worker status check failed:', error)
    return {
      isSupported: true,
      isRegistered: false,
      isControlling: false,
      registration: null,
    }
  }
}

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error('Notification permission request failed:', error)
    return 'denied'
  }
}

export const showNotification = (
  title: string,
  options: NotificationOptions = {}
): void => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('Notifications not supported')
    return
  }

  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted')
    return
  }

  try {
    const notification = new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      requireInteraction: true,
      ...options,
    })

    // Auto close after 10 seconds
    setTimeout(() => {
      notification.close()
    }, 10000)

    return
  } catch (error) {
    console.error('Notification failed:', error)
  }
}

export const initializePWA = async (): Promise<void> => {
  // Register service worker
  await registerServiceWorker()

  // Request notification permission
  await requestNotificationPermission()

  console.log('PWA initialized successfully')
}
