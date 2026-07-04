'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWARegistration() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      // Check standalone mode
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('PWA already installed (standalone mode)')
        return true
      }
      
      // Check if running as PWA
      if ((window.navigator as any).standalone === true) {
        console.log('PWA already installed (iOS)')
        return true
      }
      
      return false
    }

    if (checkInstalled()) {
      return
    }

    // Service Worker registration
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
          })

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New version available')
                }
              })
            }
          })

          // Handle controller change
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload()
          })

          console.log('Service Worker registered successfully:', registration)
          
          // After SW registration, wait a bit before showing install prompt
          setTimeout(() => {
            console.log('Checking PWA installability...')
          }, 2000)
        } catch (error) {
          console.error('Service Worker registration failed:', error)
        }
      }

      registerSW()
    }

    // PWA Install Prompt - Only Chrome/Edge show this event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      console.log('beforeinstallprompt event fired!')
      setDeferredPrompt(promptEvent)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Alternative: Show manual install instructions after a delay
    setTimeout(() => {
      if (!deferredPrompt && !checkInstalled()) {
        // Don't auto-show, but log for debugging
        console.log('PWA install instructions:')
        console.log('- Desktop Chrome/Edge: Address bar install icon')
        console.log('- Mobile Chrome: Menu → "Add to Home Screen"')
        console.log('- Mobile Safari: Share → "Add to Home Screen"')
      }
    }, 5000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [deferredPrompt])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback for browsers that don't support beforeinstallprompt
      toast.info('Desktop/Mobile menu থেকে "Install" বা "Add to Home Screen" option ব্যবহার করুন')
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        toast.success('PWA সফলভাবে install হয়েছে!')
      } else {
        toast.info('Install cancelled')
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error('Error installing PWA:', error)
      toast.error('Install করতে সমস্যা হয়েছে')
    }
  }

  if (!showInstallPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50">
      <div className="surface rounded-2xl shadow-pop p-4 animate-slide-up" style={{ borderLeftWidth: '4px', borderLeftColor: 'var(--accent)' }}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">📱</span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-content mb-1">LifeTrack Install করুন</h3>
            <p className="text-sm text-muted mb-3">
              App home screen-এ add করুন দ্রুত access-এর জন্য
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="btn btn-primary flex-1"
              >
                Install করুন
              </button>
              <button
                onClick={() => {
                  setShowInstallPrompt(false)
                  setDeferredPrompt(null)
                }}
                className="btn btn-secondary"
              >
                পরে
              </button>
            </div>
            <details className="mt-3 text-xs text-muted">
              <summary className="cursor-pointer">Manual install instructions</summary>
              <div className="mt-2 space-y-1 text-muted">
                <p><strong>Desktop:</strong> Address bar-এ install icon</p>
                <p><strong>Mobile Chrome:</strong> Menu → "Add to Home Screen"</p>
                <p><strong>Mobile Safari:</strong> Share → "Add to Home Screen"</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
