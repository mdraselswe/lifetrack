'use client'

import { useEffect, useState } from 'react'
import { confirmManager, type ConfirmToast } from '@/lib/confirm'

export default function ConfirmToastContainer() {
  const [confirms, setConfirms] = useState<ConfirmToast[]>([])

  useEffect(() => {
    const unsubscribe = confirmManager.subscribe(setConfirms)
    return unsubscribe
  }, [])

  if (confirms.length === 0) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black bg-opacity-50">
      <div className="space-y-4 max-w-sm w-full mx-4">
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

  const getConfirmStyles = () => {
    const baseStyles = "bg-white rounded-lg shadow-xl border-l-4 p-6 transform transition-all duration-300 ease-in-out"
    
    switch (confirm.type) {
      case 'danger':
        return `${baseStyles} border-red-500`
      case 'warning':
        return `${baseStyles} border-yellow-500`
      case 'info':
      default:
        return `${baseStyles} border-blue-500`
    }
  }

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
    const baseStyles = "px-4 py-2 rounded-md font-medium transition-colors duration-200"
    
    if (type === 'confirm') {
      switch (confirm.type) {
        case 'danger':
          return `${baseStyles} bg-red-500 text-white hover:bg-red-600`
        case 'warning':
          return `${baseStyles} bg-yellow-500 text-white hover:bg-yellow-600`
        case 'info':
        default:
          return `${baseStyles} bg-blue-500 text-white hover:bg-blue-600`
      }
    } else {
      return `${baseStyles} bg-gray-200 text-gray-800 hover:bg-gray-300`
    }
  }

  return (
    <div
      className={`
        ${getConfirmStyles()}
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
      `}
    >
      <div className="flex items-start space-x-3">
        <span className="text-2xl flex-shrink-0">{getIcon()}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{confirm.title}</h3>
          <p className="text-sm text-gray-600 mb-4">{confirm.message}</p>
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
