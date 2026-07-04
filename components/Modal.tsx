'use client'

import { useEffect, useId, useRef, useState, type ReactNode, type FormEvent } from 'react'
import { CloseIcon } from './Icons'

// Module-level stack of open modal ids so only the topmost modal reacts to Escape.
const modalStack: string[] = []

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

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
  const modalId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  // Keep the latest onClose in a ref so the focus-trap effect doesn't depend on
  // it — parents pass an inline onClose (new identity each render), and having it
  // in the deps re-ran the effect on every keystroke, refocusing the first field
  // and dismissing the mobile keyboard.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    // Remember what had focus so we can restore it on close.
    previouslyFocused.current = document.activeElement as HTMLElement | null
    modalStack.push(modalId)
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')

    // Only the currently-visible panel (mobile OR desktop) is display:visible,
    // so filter to focusable elements that are actually rendered.
    const getFocusable = () => {
      const root = dialogRef.current
      if (!root) return [] as HTMLElement[]
      return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      )
    }

    // Move focus into the dialog once it has painted.
    const focusTimer = setTimeout(() => {
      const focusable = getFocusable()
      ;(focusable[0] ?? dialogRef.current)?.focus()
    }, 60)

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only the topmost open modal responds to keys.
      if (modalStack[modalStack.length - 1] !== modalId) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }

      if (e.key === 'Tab') {
        const focusable = getFocusable()
        if (focusable.length === 0) {
          e.preventDefault()
          dialogRef.current?.focus()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || active === dialogRef.current)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      const idx = modalStack.indexOf(modalId)
      if (idx !== -1) modalStack.splice(idx, 1)
      // Only release the body scroll lock once every modal has closed.
      if (modalStack.length === 0) {
        document.body.style.overflow = 'unset'
        document.body.classList.remove('modal-open')
      }
      // Restore focus to the element that opened the modal.
      previouslyFocused.current?.focus?.()
    }
  }, [isOpen, modalId])

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
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm focus:outline-none"
      style={{ zIndex }}
    >
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
