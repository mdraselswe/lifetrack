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
  _id: string,
  title: string,
  body: string,
  scheduledTime: Date
): Promise<boolean> => {
  const hasPermission = await requestNotificationPermission()
  if (!hasPermission) {
    // Toast notification will be shown by the calling component
    return false
  }

  const delay = scheduledTime.getTime() - Date.now()
  
  if (delay <= 0) {
    // Show immediately
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-192x192.png',
      })
    }
  } else {
    // Schedule for later using setTimeout
    setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png',
        })
      }
    }, delay)
  }

  return true
}

export const cancelNotification = (id: string): void => {
  // This is handled by the service worker
  console.log('Notification cancelled:', id)
}

