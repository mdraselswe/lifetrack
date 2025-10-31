'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

export default function PWAInstallChecker() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if browser supports installation
    const checkInstallability = async () => {
      // Check for beforeinstallprompt event support
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          if (registration) {
            // Service Worker is registered, PWA should be installable
            setCanInstall(true)
          }
        } catch (error) {
          console.error('Error checking service worker:', error)
        }
      }

      // Log PWA criteria for debugging
      console.log('PWA Installability Check:')
      console.log('- Service Worker:', 'serviceWorker' in navigator)
      console.log('- HTTPS/localhost:', window.location.protocol === 'https:' || window.location.hostname === 'localhost')
      console.log('- Manifest linked:', document.querySelector('link[rel="manifest"]') !== null)
      
      // Check manifest file
      try {
        const manifestLink = document.querySelector('link[rel="manifest"]')
        if (manifestLink) {
          const manifestUrl = manifestLink.getAttribute('href')
          const response = await fetch(manifestUrl || '/manifest.json')
          if (response.ok) {
            const manifest = await response.json()
            console.log('- Manifest valid:', manifest)
            
            // Check required fields
            if (!manifest.name || !manifest.icons || manifest.icons.length === 0) {
              console.warn('Manifest missing required fields')
            }
          }
        }
      } catch (error) {
        console.error('Error checking manifest:', error)
      }
    }

    checkInstallability()
  }, [])

  // Don't show anything if already installed
  if (isInstalled) {
    return null
  }

  // Show help message if PWA criteria not met
  if (!canInstall) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📱</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">PWA Install</h3>
              <p className="text-sm text-yellow-700 mb-2">
                Install option দেখার জন্য browser compatibility check করুন
              </p>
              <details className="text-xs text-yellow-600">
                <summary className="cursor-pointer font-medium">Debug Info</summary>
                <div className="mt-2 space-y-1">
                  <p>Service Worker: {'serviceWorker' in navigator ? '✅' : '❌'}</p>
                  <p>HTTPS: {window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? '✅' : '❌'}</p>
                  <p>Manifest: {document.querySelector('link[rel="manifest"]') ? '✅' : '❌'}</p>
                </div>
              </details>
            </div>
          </div>

        </div>
      </div>
    )
  }

  return null
}


