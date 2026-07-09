// Service Worker for LifeTrack PWA - Next.js 16 Optimized

const CACHE_VERSION = 'v10'
const STATIC_CACHE = `lifetrack-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `lifetrack-dynamic-${CACHE_VERSION}`
const RUNTIME_CACHE = `lifetrack-runtime-${CACHE_VERSION}`

// Core assets to cache
const CORE_ASSETS = [
  '/',
  '/reminders',
  '/debts',
  '/loans',
  '/api/manifest',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico'
]

// Assets that should be cached on first load
const STATIC_ASSETS = [
  '/_next/static/css/',
  '/_next/static/js/',
  '/_next/static/media/'
]

// Last-resort offline page for a navigation when nothing is cached yet — never
// let respondWith resolve to undefined (iOS Safari then shows its own error).
async function fallbackNav(request) {
  return (
    (await caches.match(request)) ||
    (await caches.match('/')) ||
    new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LifeTrack</title><body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0a0d14;color:#e5e7eb;font-family:system-ui,sans-serif;text-align:center;padding:24px"><div><p style="font-size:15px">অফলাইন — ইন্টারনেট সংযোগ ফিরলে আবার চেষ্টা করুন।<br>Offline — reconnect and reload.</p></div></body>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  )
}

// Install event - Next.js 16 optimized
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      // Cache each asset independently — cache.addAll() rejects the WHOLE batch
      // if any single request fails, which would leave nothing cached and make
      // the app show the browser's offline error instead of the app shell.
      await Promise.allSettled(
        CORE_ASSETS.map(async (asset) => {
          try {
            const res = await fetch(asset, { cache: 'reload' })
            if (res && (res.ok || res.type === 'opaqueredirect')) await cache.put(asset, res)
          } catch (e) {
            console.warn('Precache skipped:', asset, e)
          }
        })
      )
      await self.skipWaiting()
    })()
  )
})

// Activate event - Next.js 16 optimized
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Take control of all clients immediately
      clients.claim()
    ])
  )
})

// Fetch event - Next.js 16 optimized caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Firebase Auth reverse-proxied handler / iframe (/__/auth/*, /__/firebase/*).
  // Must always hit the network so the Vercel rewrite reaches the real handler —
  // if the SW served the cached app shell here, Google sign-in would break.
  if (url.pathname.startsWith('/__/')) {
    return
  }

  // API routes are dynamic — always hit the network, never serve a cached
  // response (otherwise e.g. /api/admin/users returns a stale user list).
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // Cache-first for content-hashed Next.js static assets (JS/CSS/fonts/media).
  // These are immutable, so caching them forever is safe and lets the app load offline.
  // Handled here (before the response.type !== 'basic' check below) so same-origin fonts cache too.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(request).then((response) => {
          // Cache successful responses into the runtime cache on first fetch
          if (response && response.status === 200) {
            const responseToCache = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
      })
    )
    return
  }

  // Skip other Next.js internal requests (RSC/data payloads shouldn't be cache-first)
  if (url.pathname.startsWith('/_next/')) {
    return
  }

  // Navigations: cache-first (stale-while-revalidate). Serving the cached shell
  // instantly — instead of waiting on the network — is far more reliable offline
  // on iOS Safari, where a cold, offline navigation often errors before a
  // network-first SW can fall back. The cache is refreshed in the background.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cached = (await caches.match(request)) || (await caches.match('/'))
        const network = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }).catch(() => null)
        // If we have a cached shell, return it immediately and update in background.
        if (cached) {
          network.catch(() => {})
          return cached
        }
        // Nothing cached yet → wait for the network, with a safe fallback.
        return (await network) || (await fallbackNav(request))
      })()
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request).then((response) => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        // Clone the response for caching
        const responseToCache = response.clone()

        // Determine cache strategy based on request type
        let cacheToUse = DYNAMIC_CACHE
        
        if (CORE_ASSETS.some(asset => request.url.includes(asset))) {
          cacheToUse = STATIC_CACHE
        } else if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
          cacheToUse = STATIC_CACHE
        }

        // Cache the response
        caches.open(cacheToUse).then((cache) => {
          cache.put(request, responseToCache)
        })

        return response
      }).catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/')
        }
        // Return a fallback for other requests
        return new Response('Offline', { status: 503 })
      })
    })
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  const action = event.action

  console.log('Notification clicked:', action, notification.tag)

  // Server-backed actions from push notifications: complete or snooze the
  // reminder directly via the API — works even when no tab is open.
  if ((action === 'done' || action === 'snooze') && notification.data && notification.data.docPath) {
    notification.close()
    event.waitUntil(
      fetch('/api/reminder-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docPath: notification.data.docPath,
          token: notification.data.token,
          action: action,
        }),
      }).catch((err) => console.error('reminder-action failed:', err))
    )
    return
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (action === 'dismiss') {
        // Send message to client to dismiss reminder
        clientList.forEach((client) => {
          client.postMessage({
            type: 'NOTIFICATION_ACTION',
            action: 'dismiss',
            tag: notification.tag,
          })
        })
        notification.close()
      } else if (action === 'reschedule') {
        // Open the app and send reschedule message
        if (clientList.length > 0) {
          clientList[0].focus()
          clientList[0].postMessage({
            type: 'NOTIFICATION_ACTION',
            action: 'reschedule',
            tag: notification.tag,
          })
        } else {
          clients.openWindow('/reminders').then((client) => {
            setTimeout(() => {
              client.postMessage({
                type: 'NOTIFICATION_ACTION',
                action: 'reschedule',
                tag: notification.tag,
              })
            }, 1000)
          })
        }
        notification.close()
      } else {
        // Default click (incl. the "view" action / broadcasts) — open the URL
        // the push carried, else fall back to the reminders page.
        const target = (notification.data && notification.data.url) || '/reminders'
        if (clientList.length > 0) {
          const client = clientList[0]
          client.focus()
          if ('navigate' in client && target) client.navigate(target).catch(() => {})
        } else {
          clients.openWindow(target)
        }
        notification.close()
      }
    })
  )
})

// Background sync for future use
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag)
})

// Store scheduled notifications
let scheduledNotifications = {}

// Load scheduled notifications from cache
async function loadScheduledNotifications() {
  try {
    const cache = await caches.open(STATIC_CACHE)
    const response = await cache.match('/scheduled-notifications')
    
    if (response) {
      const data = await response.json()
      scheduledNotifications = data || {}
    }
  } catch (error) {
    console.error('Error loading scheduled notifications:', error)
  }
}

// Check and show scheduled notifications
async function checkScheduledNotifications() {
  const now = Date.now()
  
  // Check each scheduled notification
  for (const [id, notification] of Object.entries(scheduledNotifications)) {
    const scheduledTime = notification.scheduledTime
    
    if (scheduledTime <= now && !notification.shown) {
      // Show notification
      const options = {
        body: notification.body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: id,
        requireInteraction: true,
        data: {
          id: id,
          title: notification.title,
          body: notification.body
        },
        actions: [
          {
            action: 'dismiss',
            title: 'বাতিল করুন',
          },
          {
            action: 'reschedule',
            title: 'আবার সময় দিন',
          },
        ],
      }
      
      await self.registration.showNotification(notification.title, options)
      
      // Mark as shown
      scheduledNotifications[id].shown = true
      
      // Save updated notifications
      try {
        const cache = await caches.open(STATIC_CACHE)
        await cache.put('/scheduled-notifications', new Response(JSON.stringify(scheduledNotifications)))
      } catch (error) {
        console.error('Error saving scheduled notifications:', error)
      }
    }
  }
}

// Periodic Background Sync for checking notifications
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(
      loadScheduledNotifications().then(() => {
        checkScheduledNotifications()
      })
    )
  }
})

// Check immediately when service worker starts
loadScheduledNotifications().then(() => {
  checkScheduledNotifications()
  
  // Set up periodic check (every minute)
  // Note: This is a fallback, browser may suspend it
  setInterval(() => {
    checkScheduledNotifications()
  }, 60000)
})

// Message event for scheduling notifications
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, body, scheduledTime } = event.data.data
    
    // Load existing notifications first
    await loadScheduledNotifications()
    
    // Store notification in scheduledNotifications
    scheduledNotifications[id] = {
      id,
      title,
      body,
      scheduledTime,
      shown: false
    }
    
    // Save to cache
    try {
      const cache = await caches.open(STATIC_CACHE)
      await cache.put('/scheduled-notifications', new Response(JSON.stringify(scheduledNotifications)))
      console.log('Notification scheduled:', id, new Date(scheduledTime))
    } catch (error) {
      console.error('Error saving scheduled notification:', error)
    }
    
    // Check if notification should be shown immediately
    checkScheduledNotifications()
  } else if (event.data && event.data.type === 'CANCEL_NOTIFICATION') {
    const { id } = event.data
    
    // Load existing notifications first
    await loadScheduledNotifications()
    
    // Remove notification from scheduled list
    delete scheduledNotifications[id]
    
    // Save to cache
    try {
      const cache = await caches.open(STATIC_CACHE)
      await cache.put('/scheduled-notifications', new Response(JSON.stringify(scheduledNotifications)))
      console.log('Notification cancelled:', id)
    } catch (error) {
      console.error('Error cancelling notification:', error)
    }
  }
})

// Push event for FCM notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event)
  
  let notificationData = {
    title: 'LifeTrack Reminder',
    body: 'You have a reminder',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'default',
    data: {}
  }

  try {
    if (event.data) {
      const data = event.data.json()
      
      // Handle FCM notification format
      if (data.notification) {
        notificationData = {
          title: data.notification.title || notificationData.title,
          body: data.notification.body || notificationData.body,
          icon: data.notification.icon || notificationData.icon,
          badge: data.notification.badge || notificationData.badge,
          tag: data.data?.tag || data.notification.tag || notificationData.tag,
          data: data.data || {}
        }
      } else {
        // Handle custom notification format
        notificationData = {
          title: data.title || notificationData.title,
          body: data.body || notificationData.body,
          icon: data.icon || notificationData.icon,
          badge: data.badge || notificationData.badge,
          tag: data.tag || notificationData.tag,
          data: data.data || {}
        }
      }
    }
  } catch (error) {
    console.error('Error parsing push data:', error)
    // Use default notification data
  }

  // Push sent by /api/notify carries docPath+token → offer server-backed
  // complete/snooze actions. Older/local notifications keep the old buttons.
  const serverActions = notificationData.data && notificationData.data.docPath
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: true,
    data: notificationData.data,
    actions: serverActions
      ? [
          { action: 'done', title: '✓ সম্পন্ন' },
          { action: 'snooze', title: '+১ ঘন্টা' },
        ]
      : [
          { action: 'dismiss', title: 'বাতিল করুন' },
          { action: 'view', title: 'দেখুন' },
        ],
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  )
})

// Firebase Cloud Messaging initialization
// This ensures Firebase Messaging SDK can use this service worker
if (typeof importScripts !== 'undefined') {
  // Service worker context - Firebase will handle messaging
  console.log('Firebase Messaging Service Worker ready')
}

