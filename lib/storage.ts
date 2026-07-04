import type { Reminder, Debt, Loan, Payment, AmountIncrease } from './types'
import { 
  getDebts as getFirebaseDebts,
  saveDebt as saveFirebaseDebt,
  updateDebt as updateFirebaseDebt,
  deleteDebt as deleteFirebaseDebt,
  getLoans as getFirebaseLoans,
  saveLoan as saveFirebaseLoan,
  updateLoan as updateFirebaseLoan,
  deleteLoan as deleteFirebaseLoan,
  getReminders as getFirebaseReminders,
  saveReminder as saveFirebaseReminder,
  updateReminder as updateFirebaseReminder,
  deleteReminder as deleteFirebaseReminder,
  subscribeToDebts,
  subscribeToLoans,
  subscribeToReminders
} from './firebase-db'
import { auth } from './firebase'

// Re-export realtime listeners so pages can subscribe for cross-device sync
export { subscribeToDebts, subscribeToLoans, subscribeToReminders } from './firebase-db'

// Helper to check if we're in browser
const isBrowser = typeof window !== 'undefined'

// Global variable to store current user ID
let currentUserId: string | null = null

// Keep the cached user ID in sync with Firebase Auth.
// NOTE: We intentionally do NOT clear localStorage here anymore — the old
// implementation wiped local data on login, which caused user data loss.
if (isBrowser) {
  auth.onAuthStateChanged((user) => {
    currentUserId = user ? user.uid : null
  })
}

// Synchronous best-effort user ID (may be null right after page load,
// before Firebase Auth has restored the session). Prefer resolveUserId()
// for reads/writes; use this only where a synchronous value is required.
export const getCurrentUserId = (): string | null => {
  if (!isBrowser) return null
  if (currentUserId) return currentUserId
  const currentUser = auth.currentUser
  if (currentUser) {
    currentUserId = currentUser.uid
    return currentUserId
  }
  return null
}

// Reliable user ID resolution: waits until Firebase Auth has finished
// restoring the persisted session, so saves fired right after load don't
// fail with "User must be logged in".
const resolveUserId = async (): Promise<string | null> => {
  if (!isBrowser) return null
  if (currentUserId) return currentUserId
  await auth.authStateReady()
  currentUserId = auth.currentUser?.uid ?? null
  return currentUserId
}

// Helper to get user-specific storage key
const getUserStorageKey = (baseKey: string): string => {
  const userId = getCurrentUserId()
  return userId ? `${baseKey}_${userId}` : baseKey
}

// Helper function to remove duplicates from array based on ID
const removeDuplicates = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>()
  return items.filter(item => {
    if (seen.has(item.id)) {
      return false
    }
    seen.add(item.id)
    return true
  })
}

// Reminders
export const getReminders = async (): Promise<Reminder[]> => {
  if (!isBrowser) return []
  const userId = await resolveUserId()
  if (!userId) {
    console.warn('No user ID found - user must be logged in to access data')
    return []
  }
  
  try {
    return await getFirebaseReminders(userId)
  } catch (error) {
    console.error('Error getting reminders from Firebase:', error)
    throw error // Don't fallback to localStorage - force Firebase usage
  }
}

export const saveReminder = async (reminder: Reminder): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to save data')
  }
  
  try {
    const { id, ...reminderWithoutId } = reminder
    await saveFirebaseReminder(userId, reminderWithoutId)
  } catch (error) {
    console.error('Error saving reminder to Firebase:', error)
    throw error // Don't fallback to localStorage - force Firebase usage
  }
}

export const updateReminder = async (id: string, updates: Partial<Reminder>): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to update data')
  }
  
  try {
    await updateFirebaseReminder(userId, id, updates)
  } catch (error) {
    console.error('Error updating reminder in Firebase:', error)
    throw error // Don't fallback to localStorage - force Firebase usage
  }
}

export const deleteReminder = async (id: string): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to delete data')
  }
  
  try {
    await deleteFirebaseReminder(userId, id)
  } catch (error) {
    console.error('Error deleting reminder from Firebase:', error)
    throw error // Don't fallback to localStorage - force Firebase usage
  }
}

// Debts (money lent)
export const getDebts = async (): Promise<Debt[]> => {
  if (!isBrowser) return []
  const userId = await resolveUserId()
  if (!userId) {
    console.warn('No user ID found - user must be logged in to access data')
    return []
  }
  
  try {
    return await getFirebaseDebts(userId)
  } catch (error) {
    console.error('Error getting debts from Firebase:', error)
    throw error // Don't fallback to localStorage - force Firebase usage
  }
}

export const saveDebt = async (debt: Debt): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to save data')
  }
  
  try {
    const { id, ...debtWithoutId } = debt
    await saveFirebaseDebt(userId, debtWithoutId)
  } catch (error) {
    console.error('Error saving debt to Firebase:', error)
    throw error // Don't fallback to localStorage - force Firebase usage
  }
}

export const updateDebt = async (id: string, updates: Partial<Debt>): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to update data')
  }
  
  try {
    await updateFirebaseDebt(userId, id, updates)
  } catch (error) {
    console.error('Error updating debt in Firebase:', error)
    throw error // Don't fallback to localStorage - force Firebase usage
  }
}

export const deleteDebt = async (id: string): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to delete data')
  }
  
  try {
    await deleteFirebaseDebt(userId, id)
  } catch (error) {
    console.error('Error deleting debt from Firebase:', error)
    throw error // Don't fallback to localStorage - force Firebase usage
  }
}

// Loans (money borrowed)
export const getLoans = async (): Promise<Loan[]> => {
  if (!isBrowser) return []
  const userId = await resolveUserId()
  if (!userId) {
    console.warn('No user ID found - user must be logged in to access data')
    return []
  }
  
  try {
    return await getFirebaseLoans(userId)
  } catch (error) {
    console.error('Error getting loans from Firebase:', error)
    throw error // Don't fallback to localStorage - force Firebase usage
  }
}

export const saveLoan = async (loan: Loan): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to save data')
  }
  
  try {
    const { id, ...loanWithoutId } = loan
    await saveFirebaseLoan(userId, loanWithoutId)
  } catch (error) {
    console.error('Error saving loan to Firebase:', error)
    throw error // Don't fallback to localStorage - force Firebase usage
  }
}

export const updateLoan = async (id: string, updates: Partial<Loan>): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to update data')
  }
  
  try {
    await updateFirebaseLoan(userId, id, updates)
  } catch (error) {
    console.error('Error updating loan in Firebase:', error)
    throw error // Don't fallback to localStorage - force Firebase usage
  }
}

export const deleteLoan = async (id: string): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to delete data')
  }
  
  try {
    await deleteFirebaseLoan(userId, id)
  } catch (error) {
    console.error('Error deleting loan from Firebase:', error)
    throw error // Don't fallback to localStorage - force Firebase usage
  }
}

// Payment management for Debts
export const addDebtPayment = async (debtId: string, payment: Payment): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to add payment')
  }
  
  try {
    const debts = await getDebts()
    const debt = debts.find(d => d.id === debtId)
    if (!debt) {
      throw new Error('Debt not found')
    }
    
    // Ensure payment amount is a number
    const paymentWithNumberAmount = {
      ...payment,
      amount: Number(payment.amount)
    }
    
    // Add payment to existing payments array
    const updatedPayments = [...(debt.payments || []), paymentWithNumberAmount]
    
    // Auto-mark as returned if fully paid
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0)
    const shouldBeReturned = totalPaid >= debt.amount
    
    // Update the debt with new payment
    await updateDebt(debtId, {
      payments: updatedPayments,
      returned: shouldBeReturned
    })
  } catch (error) {
    console.error('Error adding payment:', error)
    throw error
  }
}

export const deleteDebtPayment = async (debtId: string, paymentId: string): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to delete payment')
  }
  
  try {
    const debts = await getDebts()
    const debt = debts.find(d => d.id === debtId)
    if (!debt) {
      throw new Error('Debt not found')
    }
    
    // Remove payment from payments array
    const updatedPayments = (debt.payments || []).filter(p => p.id !== paymentId)
    
    // Update returned status based on remaining payments
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0)
    const shouldBeReturned = totalPaid >= debt.amount
    
    // Update the debt with removed payment
    await updateDebt(debtId, {
      payments: updatedPayments,
      returned: shouldBeReturned
    })
  } catch (error) {
    console.error('Error deleting payment:', error)
    throw error
  }
}

// Payment management for Loans
export const addLoanPayment = async (loanId: string, payment: Payment): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to add payment')
  }
  
  try {
    const loans = await getLoans()
    const loan = loans.find(l => l.id === loanId)
    if (!loan) {
      throw new Error('Loan not found')
    }
    
    // Ensure payment amount is a number
    const paymentWithNumberAmount = {
      ...payment,
      amount: Number(payment.amount)
    }
    
    // Add payment to existing payments array
    const updatedPayments = [...(loan.payments || []), paymentWithNumberAmount]
    
    // Auto-mark as returned if fully paid
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0)
    const shouldBeReturned = totalPaid >= loan.amount
    
    // Update the loan with new payment
    await updateLoan(loanId, {
      payments: updatedPayments,
      returned: shouldBeReturned
    })
  } catch (error) {
    console.error('Error adding payment:', error)
    throw error
  }
}

export const deleteLoanPayment = async (loanId: string, paymentId: string): Promise<void> => {
  if (!isBrowser) return
  const loans = await getLoans()
  const index = loans.findIndex(l => l.id === loanId)
  if (index !== -1 && loans[index].payments) {
    loans[index].payments = loans[index].payments!.filter(p => p.id !== paymentId)
    
    // Update returned status based on remaining payments
    const totalPaid = loans[index].payments!.reduce((sum, p) => sum + p.amount, 0)
    loans[index].returned = totalPaid >= loans[index].amount
    
    // Update the loan with removed payment
    await updateLoan(loanId, loans[index])
  }
}

// Amount increase management for Loans
export const addLoanIncrease = async (loanId: string, increase: AmountIncrease): Promise<void> => {
  if (!isBrowser) return
  const loans = await getLoans()
  const index = loans.findIndex(l => l.id === loanId)
  if (index !== -1) {
    if (!loans[index].increases) {
      loans[index].increases = []
    }
    // Ensure increase amount is a number
    const increaseWithNumberAmount = {
      ...increase,
      amount: typeof increase.amount === 'string' ? parseFloat(increase.amount) : increase.amount
    }
    loans[index].increases!.push(increaseWithNumberAmount)
    
    // Update the loan with new increase
    await updateLoan(loanId, loans[index])
  }
}

export const deleteLoanIncrease = async (loanId: string, increaseId: string): Promise<void> => {
  if (!isBrowser) return
  const loans = await getLoans()
  const index = loans.findIndex(l => l.id === loanId)
  if (index !== -1 && loans[index].increases) {
    loans[index].increases = loans[index].increases!.filter(i => i.id !== increaseId)
    
    // Update the loan with removed increase
    await updateLoan(loanId, loans[index])
  }
}

// Amount increase management for Debts
export const addDebtIncrease = async (debtId: string, increase: AmountIncrease): Promise<void> => {
  if (!isBrowser) return
  
  const userId = await resolveUserId()
  if (!userId) {
    throw new Error('User must be logged in to add increase')
  }
  
  try {
    const debts = await getDebts()
    const debt = debts.find(d => d.id === debtId)
    if (!debt) {
      throw new Error('Debt not found')
    }
    
    // Ensure increase amount is a number
    const increaseWithNumberAmount = {
      ...increase,
      amount: typeof increase.amount === 'string' ? parseFloat(increase.amount) : increase.amount
    }
    
    // Add increase to existing increases array
    const updatedIncreases = [...(debt.increases || []), increaseWithNumberAmount]
    
    // Update the debt with new increase
    await updateDebt(debtId, {
      increases: updatedIncreases
    })
  } catch (error) {
    console.error('Error adding increase:', error)
    throw error
  }
}

export const deleteDebtIncrease = async (debtId: string, increaseId: string): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()
  
  if (!userId) {
    throw new Error('User must be logged in to delete increase')
  }
  
  try {
    const debts = await getDebts()
    const debt = debts.find(d => d.id === debtId)
    if (!debt) {
      throw new Error('Debt not found')
    }
    
    // Remove increase from increases array
    const updatedIncreases = (debt.increases || []).filter(i => i.id !== increaseId)
    
    // Update the debt with removed increase
    await updateDebt(debtId, {
      increases: updatedIncreases
    })
  } catch (error) {
    console.error('Error deleting increase:', error)
    throw error
  }
}


// Utility function to clean up localStorage data
export const cleanupData = (): void => {
  if (!isBrowser) return
  
  // Remove all localStorage data - Firebase only
  const userId = getCurrentUserId()
  if (userId) {
    // Clear all user-specific localStorage data
    const keys = ['reminders', 'debts', 'loans']
    keys.forEach(key => {
      const storageKey = `${key}_${userId}`
      localStorage.removeItem(storageKey)
    })
    console.log('localStorage data cleared - using Firebase only')
  }
}

// Utility function to validate and fix data integrity
export const validateData = async (): Promise<void> => {
  if (!isBrowser) return
  
  const userId = await resolveUserId()
  if (!userId) {
    console.warn('No user ID found - cannot validate data')
    return
  }
  
  try {
    // Validate and fix reminders
    const reminders = (await getReminders()).filter(r => 
      r.id && r.title && r.scheduledTime && r.createdAt
    )
    console.log(`Validated ${reminders.length} reminders`)
    
    // Validate and fix debts
    const debts = (await getDebts()).filter(d => 
      d.id && d.personName && typeof d.amount === 'number' && d.date && d.createdAt
    ).map(d => ({
      ...d,
      amount: Number(d.amount),
      returned: Boolean(d.returned),
      payments: d.payments?.filter(p => 
        p.id && typeof p.amount === 'number' && p.date && p.createdAt
      ).map(p => ({
        ...p,
        amount: Number(p.amount)
      })) || []
    }))
    console.log(`Validated ${debts.length} debts`)
    
    // Validate and fix loans
    const loans = (await getLoans()).filter(l => 
      l.id && l.personName && typeof l.amount === 'number' && l.date && l.createdAt
    ).map(l => ({
      ...l,
      amount: Number(l.amount),
      returned: Boolean(l.returned),
      payments: l.payments?.filter(p => 
        p.id && typeof p.amount === 'number' && p.date && p.createdAt
      ).map(p => ({
        ...p,
        amount: Number(p.amount)
      })) || []
    }))
    console.log(`Validated ${loans.length} loans`)
    
    console.log('Data validation completed - Firebase only')
  } catch (error) {
    console.error('Error validating data:', error)
  }
}

