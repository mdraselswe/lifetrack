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
import { auth } from './firebase-app'
import { round2, num } from './format'

// Re-export realtime listeners so pages can subscribe for cross-device sync
export { subscribeToDebts, subscribeToLoans, subscribeToReminders } from './firebase-db'

// Sum the `amount` field across a list of payments/increases (null-safe,
// coerces each amount so a stray string/NaN can't collapse the total).
const sumAmounts = (items?: { amount: number }[]): number =>
  (items || []).reduce((sum, i) => sum + num(i?.amount), 0)

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

    // Auto-mark as returned if fully paid (total = initial amount + all increases)
    const total = num(debt.amount) + sumAmounts(debt.increases)
    const totalPaid = sumAmounts(updatedPayments)
    const shouldBeReturned = round2(totalPaid) >= round2(total)

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

    // Update returned status based on remaining payments (total = initial amount + all increases)
    const total = num(debt.amount) + sumAmounts(debt.increases)
    const totalPaid = sumAmounts(updatedPayments)
    const shouldBeReturned = round2(totalPaid) >= round2(total)

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

    // Auto-mark as returned if fully paid (total = initial amount + all increases)
    const total = num(loan.amount) + sumAmounts(loan.increases)
    const totalPaid = sumAmounts(updatedPayments)
    const shouldBeReturned = round2(totalPaid) >= round2(total)

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
  const userId = await resolveUserId()

  if (!userId) {
    throw new Error('User must be logged in to delete payment')
  }

  try {
    const loans = await getLoans()
    const loan = loans.find(l => l.id === loanId)
    if (!loan) {
      throw new Error('Loan not found')
    }

    // Remove payment from payments array
    const updatedPayments = (loan.payments || []).filter(p => p.id !== paymentId)

    // Update returned status based on remaining payments (total = initial amount + all increases)
    const total = num(loan.amount) + sumAmounts(loan.increases)
    const totalPaid = sumAmounts(updatedPayments)
    const shouldBeReturned = round2(totalPaid) >= round2(total)

    // Update the loan with removed payment
    await updateLoan(loanId, {
      payments: updatedPayments,
      returned: shouldBeReturned
    })
  } catch (error) {
    console.error('Error deleting payment:', error)
    throw error
  }
}

// Amount increase management for Loans
export const addLoanIncrease = async (loanId: string, increase: AmountIncrease): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()

  if (!userId) {
    throw new Error('User must be logged in to add increase')
  }

  try {
    const loans = await getLoans()
    const loan = loans.find(l => l.id === loanId)
    if (!loan) {
      throw new Error('Loan not found')
    }

    // Ensure increase amount is a number
    const increaseWithNumberAmount = {
      ...increase,
      amount: typeof increase.amount === 'string' ? parseFloat(increase.amount) : increase.amount
    }

    // Add increase to existing increases array
    const updatedIncreases = [...(loan.increases || []), increaseWithNumberAmount]

    // Recompute returned status (total = initial amount + all increases)
    const total = num(loan.amount) + sumAmounts(updatedIncreases)
    const totalPaid = sumAmounts(loan.payments)
    const shouldBeReturned = round2(totalPaid) >= round2(total)

    // Update the loan with new increase
    await updateLoan(loanId, {
      increases: updatedIncreases,
      returned: shouldBeReturned
    })
  } catch (error) {
    console.error('Error adding increase:', error)
    throw error
  }
}

export const deleteLoanIncrease = async (loanId: string, increaseId: string): Promise<void> => {
  if (!isBrowser) return
  const userId = await resolveUserId()

  if (!userId) {
    throw new Error('User must be logged in to delete increase')
  }

  try {
    const loans = await getLoans()
    const loan = loans.find(l => l.id === loanId)
    if (!loan) {
      throw new Error('Loan not found')
    }

    // Remove increase from increases array
    const updatedIncreases = (loan.increases || []).filter(i => i.id !== increaseId)

    // Recompute returned status (total = initial amount + all increases)
    const total = num(loan.amount) + sumAmounts(updatedIncreases)
    const totalPaid = sumAmounts(loan.payments)
    const shouldBeReturned = round2(totalPaid) >= round2(total)

    // Update the loan with removed increase
    await updateLoan(loanId, {
      increases: updatedIncreases,
      returned: shouldBeReturned
    })
  } catch (error) {
    console.error('Error deleting increase:', error)
    throw error
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

    // Recompute returned status (total = initial amount + all increases)
    const total = num(debt.amount) + sumAmounts(updatedIncreases)
    const totalPaid = sumAmounts(debt.payments)
    const shouldBeReturned = round2(totalPaid) >= round2(total)

    // Update the debt with new increase
    await updateDebt(debtId, {
      increases: updatedIncreases,
      returned: shouldBeReturned
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

    // Recompute returned status (total = initial amount + all increases)
    const total = num(debt.amount) + sumAmounts(updatedIncreases)
    const totalPaid = sumAmounts(debt.payments)
    const shouldBeReturned = round2(totalPaid) >= round2(total)

    // Update the debt with removed increase
    await updateDebt(debtId, {
      increases: updatedIncreases,
      returned: shouldBeReturned
    })
  } catch (error) {
    console.error('Error deleting increase:', error)
    throw error
  }
}
