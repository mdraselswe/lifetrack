// Confirmation toast system
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
      confirmText: options.confirmText || 'হ্যাঁ',
      cancelText: options.cancelText || 'না',
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
      confirmText: 'মুছুন',
      cancelText: 'বাতিল'
    }),
  
  update: (title: string, message: string, onConfirm: () => void) => 
    confirmManager.showConfirm(title, message, onConfirm, {
      type: 'warning',
      confirmText: 'আপডেট করুন',
      cancelText: 'বাতিল'
    }),
  
  edit: (title: string, message: string, onConfirm: () => void) => 
    confirmManager.showConfirm(title, message, onConfirm, {
      type: 'info',
      confirmText: 'সম্পাদনা করুন',
      cancelText: 'বাতিল'
    }),
  
  custom: (title: string, message: string, onConfirm: () => void, options: {
    confirmText?: string
    cancelText?: string
    type?: 'warning' | 'danger' | 'info'
  } = {}) => confirmManager.showConfirm(title, message, onConfirm, options)
}
