import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from './firebase'

// Web Push (VAPID) subscription management. Subscriptions are stored under
// users/{uid}/pushSubscriptions/{id} so the /api/notify cron can deliver
// reminders even when no tab is open.

const urlBase64ToUint8Array = (base64: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Stable doc id per device from the subscription endpoint.
const subscriptionId = (endpoint: string): string => {
  let h = 0
  for (let i = 0; i < endpoint.length; i++) {
    h = (Math.imul(31, h) + endpoint.charCodeAt(i)) | 0
  }
  return `sub_${(h >>> 0).toString(36)}`
}

export const pushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

// Subscribe this device and persist the subscription. Returns:
// 'subscribed' | 'denied' | 'unsupported' | 'error'
export async function enablePush(): Promise<'subscribed' | 'denied' | 'unsupported' | 'error'> {
  if (!pushSupported()) return 'unsupported'
  const user = auth.currentUser
  if (!user) return 'error'
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return 'error'

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    const registration = await navigator.serviceWorker.ready
    let sub = await registration.pushManager.getSubscription()
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })
    }

    const json = sub.toJSON()
    await setDoc(doc(db, 'users', user.uid, 'pushSubscriptions', subscriptionId(sub.endpoint)), {
      endpoint: sub.endpoint,
      keys: json.keys || {},
      userAgent: navigator.userAgent.slice(0, 200),
      updatedAt: serverTimestamp(),
    })
    return 'subscribed'
  } catch (error) {
    console.error('Push subscribe failed:', error)
    return 'error'
  }
}

// If permission is already granted, silently refresh the stored subscription
// (keeps it current after SW updates / endpoint rotation).
export async function refreshPushIfGranted(): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return
  try {
    await enablePush()
  } catch {
    // best effort
  }
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  const user = auth.currentUser
  try {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    if (sub) {
      if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'pushSubscriptions', subscriptionId(sub.endpoint))).catch(() => {})
      }
      await sub.unsubscribe()
    }
  } catch (error) {
    console.error('Push unsubscribe failed:', error)
  }
}
