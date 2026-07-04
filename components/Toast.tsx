'use client'

import { useEffect, useState } from 'react'
import { toastManager, type Toast } from '@/lib/toast'

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts)
    return unsubscribe
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[120] space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = () => {
    setIsLeaving(true)
    setTimeout(() => {
      toastManager.removeToast(toast.id)
    }, 300)
  }

  // Token-based, light/dark aware styling (matches cards + semantic tints).
  const typeConfig = {
    success: { tint: 'tint-pos', text: 'text-positive', accent: 'var(--positive)' },
    error: { tint: 'tint-neg', text: 'text-negative', accent: 'var(--negative)' },
    warning: { tint: 'tint-warn', text: 'text-caution', accent: 'var(--caution)' },
    info: { tint: 'tint-accent', text: 'text-accent', accent: 'var(--accent)' },
  } as const
  const cfg = typeConfig[toast.type as keyof typeof typeConfig] ?? typeConfig.info

  const getToastStyles = () =>
    `p-4 rounded-xl shadow-pop transition-all duration-300 ease-in-out transform ${cfg.tint} ${cfg.text}`

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  return (
    <div
      className={`
        ${getToastStyles()}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isLeaving ? 'translate-x-full opacity-0' : ''}
      `}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: cfg.accent,
        animation: isVisible && !isLeaving ? 'slideInRight 0.3s ease-out' : undefined
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <span className="text-lg flex-shrink-0">{getIcon()}</span>
          <div className="flex-1">
            <p className="text-sm font-medium leading-5">{toast.message}</p>
          </div>
        </div>
        <button
          onClick={handleRemove}
          className="ml-4 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="বন্ধ করুন"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Add CSS animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `
  document.head.appendChild(style)
}
