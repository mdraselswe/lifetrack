'use client'

import { useEffect, useState } from 'react'
import { toastManager, type Toast } from '@/lib/toast'
import { CheckCircleIcon, AlertCircleIcon, AlertTriangleIcon, InfoIcon, CloseIcon } from './Icons'

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts)
    return unsubscribe
  }, [])

  if (toasts.length === 0) return null

  return (
    // Bottom-center on mobile (above the nav), top-right on desktop — native feel.
    <div
      className="fixed z-[120] inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4 pointer-events-none
                 sm:inset-x-auto sm:bottom-auto sm:top-4 sm:right-4 sm:items-end sm:px-0"
      style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

const typeConfig = {
  success: { tint: 'tint-pos', text: 'text-positive', Icon: CheckCircleIcon },
  error: { tint: 'tint-neg', text: 'text-negative', Icon: AlertCircleIcon },
  warning: { tint: 'tint-warn', text: 'text-caution', Icon: AlertTriangleIcon },
  info: { tint: 'tint-accent', text: 'text-accent', Icon: InfoIcon },
} as const

function ToastItem({ toast }: { toast: Toast }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = () => {
    setIsLeaving(true)
    setTimeout(() => toastManager.removeToast(toast.id), 300)
  }

  const cfg = typeConfig[toast.type as keyof typeof typeConfig] ?? typeConfig.info
  const shown = isVisible && !isLeaving

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm transition-all duration-300 ease-out
        ${shown ? 'opacity-100 translate-y-0 sm:translate-x-0' : 'opacity-0 translate-y-3 sm:translate-y-0 sm:translate-x-4'}`}
    >
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 p-3 rounded-2xl surface border border-line shadow-pop"
      >
        <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.tint} ${cfg.text}`}>
          <cfg.Icon className="w-5 h-5" />
        </span>
        <p className="flex-1 text-sm font-medium text-content leading-snug">{toast.message}</p>
        <button
          onClick={handleRemove}
          className="icon-btn flex-shrink-0 text-muted"
          aria-label="বন্ধ করুন"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
