// Toast notification system
export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

class ToastManager {
  private toasts: Toast[] = []
  private listeners: ((toasts: Toast[]) => void)[] = []

  addToast(message: string, type: Toast['type'] = 'info', duration = 4000): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const toast: Toast = { id, message, type, duration }
    
    this.toasts.push(toast)
    this.notifyListeners()

    // Auto remove toast after duration
    setTimeout(() => {
      this.removeToast(id)
    }, duration)

    return id
  }

  removeToast(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id)
    this.notifyListeners()
  }

  clearAll(): void {
    this.toasts = []
    this.notifyListeners()
  }

  getToasts(): Toast[] {
    return [...this.toasts]
  }

  subscribe(listener: (toasts: Toast[]) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.toasts]))
  }
}

export const toastManager = new ToastManager()

// Convenience functions
export const toast = {
  success: (message: string, duration?: number) => toastManager.addToast(message, 'success', duration),
  error: (message: string, duration?: number) => toastManager.addToast(message, 'error', duration),
  warning: (message: string, duration?: number) => toastManager.addToast(message, 'warning', duration),
  info: (message: string, duration?: number) => toastManager.addToast(message, 'info', duration),
}
