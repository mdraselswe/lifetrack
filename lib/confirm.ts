// Confirmation toast system
import { t } from '@/lib/i18n'

export interface ConfirmToast {
  id: string
  title: string
  message: string
  onConfirm: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger' | 'info'
}

class ConfirmManager {
  private confirms: ConfirmToast[] = []
  private listeners: ((confirms: ConfirmToast[]) => void)[] = []

  showConfirm(
    title: string,
    message: string,
    onConfirm: () => void,
    options: {
      onCancel?: () => void
      confirmText?: string
      cancelText?: string
      type?: 'warning' | 'danger' | 'info'
    } = {}
  ): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const confirm: ConfirmToast = {
      id,
      title,
      message,
      onConfirm,
      onCancel: options.onCancel,
      // Evaluated at call time so the current language applies.
      confirmText: options.confirmText || t('common.yes'),
      cancelText: options.cancelText || t('common.no'),
      type: options.type || 'warning'
    }
    
    this.confirms.push(confirm)
    this.notifyListeners()

    return id
  }

  removeConfirm(id: string): void {
    this.confirms = this.confirms.filter(confirm => confirm.id !== id)
    this.notifyListeners()
  }

  clearAll(): void {
    this.confirms = []
    this.notifyListeners()
  }

  getConfirms(): ConfirmToast[] {
    return [...this.confirms]
  }

  subscribe(listener: (confirms: ConfirmToast[]) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.confirms]))
  }
}

export const confirmManager = new ConfirmManager()

// Convenience functions
export const confirm = {
  delete: (title: string, message: string, onConfirm: () => void) =>
    confirmManager.showConfirm(title, message, onConfirm, {
      type: 'danger',
      confirmText: t('common.delete'),
      cancelText: t('common.cancel')
    }),

  update: (title: string, message: string, onConfirm: () => void) =>
    confirmManager.showConfirm(title, message, onConfirm, {
      type: 'warning',
      confirmText: t('confirm.update'),
      cancelText: t('common.cancel')
    }),

  edit: (title: string, message: string, onConfirm: () => void) =>
    confirmManager.showConfirm(title, message, onConfirm, {
      type: 'info',
      confirmText: t('confirm.edit'),
      cancelText: t('common.cancel')
    }),
  
  custom: (title: string, message: string, onConfirm: () => void, options: {
    confirmText?: string
    cancelText?: string
    type?: 'warning' | 'danger' | 'info'
  } = {}) => confirmManager.showConfirm(title, message, onConfirm, options)
}
