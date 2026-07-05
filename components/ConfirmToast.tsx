'use client'

import { useEffect, useState } from 'react'
import { confirmManager, type ConfirmToast } from '@/lib/confirm'
import { useLang } from '@/lib/i18n'

export default function ConfirmToastContainer() {
  useLang() // re-render on language switch
  const [confirms, setConfirms] = useState<ConfirmToast[]>([])

  useEffect(() => {
    const unsubscribe = confirmManager.subscribe(setConfirms)
    return unsubscribe
  }, [])

  if (confirms.length === 0) return null

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="space-y-4 max-w-sm w-full mx-4 relative z-[99999]">
        {confirms.map((confirm) => (
          <ConfirmToastItem key={confirm.id} confirm={confirm} />
        ))}
      </div>
    </div>
  )
}

function ConfirmToastItem({ confirm }: { confirm: ConfirmToast }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleConfirm = () => {
    confirm.onConfirm()
    confirmManager.removeConfirm(confirm.id)
  }

  const handleCancel = () => {
    if (confirm.onCancel) {
      confirm.onCancel()
    }
    confirmManager.removeConfirm(confirm.id)
  }

  // Token-based accent colour per confirm type (light/dark aware).
  const accentColor =
    confirm.type === 'danger'
      ? 'var(--negative)'
      : confirm.type === 'warning'
        ? 'var(--caution)'
        : 'var(--accent)'

  const getConfirmStyles = () =>
    "surface rounded-2xl shadow-pop p-6 transform transition-all duration-300 ease-in-out relative z-[99999]"

  const getIcon = () => {
    switch (confirm.type) {
      case 'danger':
        return '🗑️'
      case 'warning':
        return '⚠️'
      case 'info':
      default:
        return '✏️'
    }
  }

  const getButtonStyles = (type: 'confirm' | 'cancel') => {
    if (type === 'confirm') {
      return confirm.type === 'danger' ? 'btn btn-danger' : 'btn btn-primary'
    }
    return 'btn btn-secondary'
  }

  return (
    <div
      className={`
        ${getConfirmStyles()}
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
      `}
      style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
    >
      <div className="flex items-start space-x-3">
        <span className="text-2xl flex-shrink-0">{getIcon()}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-content mb-2">{confirm.title}</h3>
          <p className="text-sm text-muted mb-4">{confirm.message}</p>
          <div className="flex space-x-3">
            <button
              onClick={handleConfirm}
              className={getButtonStyles('confirm')}
            >
              {confirm.confirmText}
            </button>
            <button
              onClick={handleCancel}
              className={getButtonStyles('cancel')}
            >
              {confirm.cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
