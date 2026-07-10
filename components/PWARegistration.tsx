'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'
import { t, useLang, fmtInt } from '@/lib/i18n'
import { ShareIcon } from '@/components/Icons'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// The banner shows on every app open while the app isn't installed. Clicking
// "পরে" (Later) snoozes it for the rest of that calendar day; it returns the
// next day. Snoozing is tied to the dismiss action, NOT to merely showing it.
const SNOOZE_KEY = 'pwa-install-snoozed'
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
const snoozedToday = () => {
  try { return localStorage.getItem(SNOOZE_KEY) === todayStr() } catch { return false }
}
const markSnoozed = () => {
  try { localStorage.setItem(SNOOZE_KEY, todayStr()) } catch { /* ignore */ }
}

// iOS Safari never fires beforeinstallprompt; per product decision we show no
// banner there at all (users add via Share → Add to Home Screen manually).
const isIOS = () => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1)
}

export default function PWARegistration() {
  useLang() // re-render on language switch
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

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

    // Show the banner on every open, unless already installed or snoozed today.
    const maybeShow = () => {
      if (checkInstalled() || snoozedToday()) return
      setShowInstallPrompt(true)
    }

    // Chrome/Edge fire this — capture the event so the install button can trigger
    // the native prompt. (iOS never fires it; maybeShow below covers all platforms.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      maybeShow()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Show immediately on open for every platform. On Chrome/Edge the
    // deferredPrompt arrives via the listener a moment later, so the install
    // button still fires the native prompt.
    maybeShow()

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    // iOS has no programmatic install — show the Share → Add to Home Screen steps inline.
    if (isIOS()) {
      setShowIosGuide(true)
      return
    }
    if (!deferredPrompt) {
      // Fallback for other browsers that don't support beforeinstallprompt
      toast.info(t('pwa.manualHint'))
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        toast.success(t('pwa.installSuccess'))
      } else {
        toast.info(t('pwa.installCancelled'))
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error('Error installing PWA:', error)
      toast.error(t('pwa.installError'))
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
            <h3 className="font-bold text-content mb-1">{t('pwa.installTitle')}</h3>
            <p className="text-sm text-muted mb-3">
              {t('pwa.installDescription')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="btn btn-primary flex-1"
              >
                {t('pwa.installButton')}
              </button>
              <button
                onClick={() => {
                  markSnoozed() // "পরে": don't show again until tomorrow
                  setShowInstallPrompt(false)
                  setDeferredPrompt(null)
                  setShowIosGuide(false)
                }}
                className="btn btn-secondary"
              >
                {t('pwa.later')}
              </button>
            </div>

            {showIosGuide ? (
              // iOS step-by-step: no programmatic install exists on Safari/iOS.
              <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-content space-y-2">
                <p className="font-semibold">{t('pwa.iosGuideTitle')}</p>
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-bold">{fmtInt(1)}</span>
                  <span className="flex items-center gap-1.5">{t('pwa.iosStep1')} <ShareIcon className="w-4 h-4 inline text-accent" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-bold">{fmtInt(2)}</span>
                  <span>{t('pwa.iosStep2')}</span>
                </div>
              </div>
            ) : (
              <details className="mt-3 text-xs text-muted">
                <summary className="cursor-pointer">{t('pwa.manualInstructionsTitle')}</summary>
                <div className="mt-2 space-y-1 text-muted">
                  <p><strong>Desktop:</strong> {t('pwa.manualDesktop')}</p>
                  <p><strong>Mobile Chrome:</strong> Menu → "Add to Home Screen"</p>
                  <p><strong>Mobile Safari:</strong> Share → "Add to Home Screen"</p>
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
