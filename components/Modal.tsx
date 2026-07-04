'use client'

import { useEffect, useState, type ReactNode, type FormEvent } from 'react'
import { CloseIcon } from './Icons'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  className?: string
  footerActions?: ReactNode
  zIndex?: number // Custom z-index for stacked modals
}

export default function Modal({ isOpen, onClose, title, children, className = '', footerActions, zIndex = 9999 }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
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

  const Header = (
    <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-line">
      <h2 className="text-base font-semibold text-content">{title}</h2>
      <button onClick={onClose} className="icon-btn" aria-label="বন্ধ করুন">
        <CloseIcon className="w-5 h-5" />
      </button>
    </div>
  )

  const Footer = footerActions && (
    <div
      className="modal-footer flex-shrink-0 px-5 py-4 border-t border-line"
      style={{ backgroundColor: 'var(--surface)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex justify-end gap-3">{footerActions}</div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" style={{ zIndex }}>
      {/* Mobile: bottom sheet / full height */}
      <div className="sm:hidden fixed inset-0" style={{ zIndex }}>
        <div
          className={`absolute inset-0 flex flex-col transform transition-transform duration-300 ease-out ${
            isVisible ? 'translate-y-0' : 'translate-y-full'
          } ${className}`}
          style={{ backgroundColor: 'var(--surface)' }}
        >
          {Header}
          <div className="flex-1 overflow-y-auto px-5 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {children}
          </div>
          {Footer}
        </div>
      </div>

      {/* Desktop: centered card */}
      <div className="hidden sm:flex items-center justify-center h-full p-4">
        <div
          className={`w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl shadow-pop border border-line overflow-hidden
            transform transition-all duration-300 ease-out ${
              isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
            } ${className}`}
          style={{ backgroundColor: 'var(--surface)' }}
        >
          {Header}
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {Footer}
        </div>
      </div>
    </div>
  )
}

interface ActionButtonProps {
  onClick: (e?: FormEvent) => void | Promise<void>
  children?: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  loading?: boolean
}

export function ActionButton({ onClick, children, variant = 'primary', disabled = false, loading = false }: ActionButtonProps) {
  const variantClass =
    variant === 'secondary' ? 'btn-secondary' : variant === 'danger' ? 'btn-danger' : 'btn-primary'

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`btn ${variantClass}`}>
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          লোড হচ্ছে...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
