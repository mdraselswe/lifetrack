'use client'

import { useEffect, useState } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  footerActions?: React.ReactNode
}

export default function Modal({ isOpen, onClose, title, children, className = '', footerActions }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Trigger animation
      const timer = setTimeout(() => setIsVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll and hide navigation
      document.body.style.overflow = 'hidden'
      document.body.classList.add('modal-open')
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
      document.body.classList.remove('modal-open')
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm">
      {/* Mobile: Full screen modal */}
      <div className="sm:hidden fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm">
        <div
          className={`
            bg-white w-full
            transform transition-all duration-500 ease-out
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
            ${className}
          `}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'grid',
            gridTemplateRows: 'auto 1fr auto',
            gridTemplateColumns: '1fr'
          }}
        >
          {/* Mobile Header */}
          <div style={{ 
            gridRow: '1',
            padding: '16px', 
            background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', 
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{title}</h2>
              <button
                onClick={onClose}
                style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  border: 'none', 
                  borderRadius: '50%', 
                  padding: '8px',
                  color: 'white',
                  cursor: 'pointer'
                }}
                aria-label="Close modal"
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Body */}
          <div style={{ 
            gridRow: '2',
            overflowY: 'auto', 
            overflowX: 'hidden',
            padding: '16px', 
            backgroundColor: 'white',
            WebkitOverflowScrolling: 'touch'
          }}>
            {children}
          </div>

          {/* Mobile Footer - Always show if footerActions exist */}
          {footerActions && (
            <div style={{ 
              gridRow: '3',
              padding: '16px', 
              backgroundColor: 'white', 
              borderTop: '2px solid #d1d5db',
              boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
            }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                {footerActions}
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* Desktop: Centered modal */}
      <div className="hidden sm:flex items-center justify-center h-full p-4">
        <div
          className={`
            bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 w-full max-w-md max-h-[90vh] flex flex-col
            transform transition-all duration-500 ease-out
            ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}
            ${className}
          `}
        >
          {/* Desktop Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{title}</h2>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-300"
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {children}
          </div>

          {/* Desktop Footer */}
          {footerActions && (
            <div className="modal-footer flex-shrink-0 px-6 py-4 bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm border-t border-gray-200/50 rounded-b-2xl">
              <div className="flex justify-end space-x-3">
                {footerActions}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Action Button Component
interface ActionButtonProps {
  onClick: (e?: React.FormEvent) => void | Promise<void>
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  loading?: boolean
}

export function ActionButton({ 
  onClick, 
  children, 
  variant = 'primary', 
  disabled = false, 
  loading = false 
}: ActionButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-blue-500/25 hover:shadow-xl'
      case 'secondary':
        return 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 border border-gray-300/50 shadow-md hover:shadow-lg'
      case 'danger':
        return 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg hover:shadow-red-500/25 hover:shadow-xl'
      default:
        return 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-blue-500/25 hover:shadow-xl'
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50
        hover:scale-105 active:scale-95
        ${getVariantStyles()}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
      <div className="relative z-10">
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>লোড হচ্ছে...</span>
          </div>
        ) : (
          children
        )}
      </div>
    </button>
  )
}
