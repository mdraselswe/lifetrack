import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore'
import { db } from './firebase'
import { scheduleBackup } from './backup-trigger'
import type { Debt, Loan, Reminder, Expense, UserPrefs } from './types'

// Helper function to get user-specific collection path
const getUserCollection = (userId: string, collectionName: string) => {
  return collection(db, 'users', userId, collectionName)
}

// Helper function to get user-specific document path
const getUserDoc = (userId: string, collectionName: string, docId: string) => {
  return doc(db, 'users', userId, collectionName, docId)
}

// Helper function to filter out undefined values recursively
const filterUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => filterUndefined(item)).filter(item => item !== undefined)
  }
  
  if (typeof obj === 'object') {
    // Pass class instances through untouched — recursing into a Firestore
    // FieldValue (serverTimestamp()) or Timestamp would strip its internals and
    // silently turn it into a plain map, so `updatedAt` would be stored as
    // `{ _methodName: "serverTimestamp" }` instead of a real server timestamp.
    // Only plain object literals ({}) should be filtered.
    if (obj.constructor && obj.constructor !== Object) {
      return obj
    }

    const filtered: any = {}
    const undefinedKeys: string[] = []

    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const filteredValue = filterUndefined(value)
        if (filteredValue !== undefined) {
          filtered[key] = filteredValue
        } else {
          undefinedKeys.push(key)
        }
      } else {
        undefinedKeys.push(key)
      }
    }
    
    if (undefinedKeys.length > 0) {
      console.warn('Filtered out undefined values for keys:', undefinedKeys)
    }
    
    return filtered
  }
  
  return obj
}

// ===== DEBT FUNCTIONS =====
export const getDebts = async (userId: string): Promise<Debt[]> => {
  try {
    const debtsRef = getUserCollection(userId, 'debts')
    const q = query(debtsRef, orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Debt[]
  } catch (error) {
    // Rethrow so the storage layer can surface permission/network failures
    // instead of masking them as "no data" and blanking the UI.
    console.error('Error getting debts:', error)
    throw error
  }
}

export const saveDebt = async (userId: string, debt: Omit<Debt, 'id'>): Promise<string> => {
  try {
    const debtsRef = getUserCollection(userId, 'debts')
    const filteredDebt = filterUndefined({
      ...debt,
      createdAt: serverTimestamp()
    })
    const docRef = await addDoc(debtsRef, filteredDebt)
    scheduleBackup()
    return docRef.id
  } catch (error) {
    console.error('Error saving debt:', error)
    throw error
  }
}

export const updateDebt = async (userId: string, debtId: string, updates: Partial<Debt>): Promise<void> => {
  try {
    const debtRef = getUserDoc(userId, 'debts', debtId)
    const filteredUpdates = filterUndefined({
      ...updates,
      updatedAt: serverTimestamp()
    })
    await updateDoc(debtRef, filteredUpdates)
    scheduleBackup()
  } catch (error) {
    console.error('Error updating debt:', error)
    throw error
  }
}

// Atomically read-modify-write a debt document. The `mutate` callback receives
// the CURRENT stored debt (read inside the transaction, never a stale client
// snapshot) and returns the fields to write. This prevents two concurrent
// writers (e.g. two devices adding a payment) from clobbering each other's
// array — the transaction re-runs on conflict. Use for every payments/increases
// mutation so nested-array writes stay consistent.
export const mutateDebtDoc = async (
  userId: string,
  debtId: string,
  mutate: (debt: Debt) => Partial<Debt>
): Promise<void> => {
  const debtRef = getUserDoc(userId, 'debts', debtId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(debtRef)
    if (!snap.exists()) throw new Error('Debt not found')
    const debt = { id: snap.id, ...snap.data() } as Debt
    const updates = filterUndefined({ ...mutate(debt), updatedAt: serverTimestamp() })
    tx.update(debtRef, updates)
  })
  scheduleBackup()
}

export const mutateLoanDoc = async (
  userId: string,
  loanId: string,
  mutate: (loan: Loan) => Partial<Loan>
): Promise<void> => {
  const loanRef = getUserDoc(userId, 'loans', loanId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(loanRef)
    if (!snap.exists()) throw new Error('Loan not found')
    const loan = { id: snap.id, ...snap.data() } as Loan
    const updates = filterUndefined({ ...mutate(loan), updatedAt: serverTimestamp() })
    tx.update(loanRef, updates)
  })
  scheduleBackup()
}

export const deleteDebt = async (userId: string, debtId: string): Promise<void> => {
  try {
    const debtRef = getUserDoc(userId, 'debts', debtId)
    await deleteDoc(debtRef)
    scheduleBackup()
  } catch (error) {
    console.error('Error deleting debt:', error)
    throw error
  }
}

// ===== LOAN FUNCTIONS =====
export const getLoans = async (userId: string): Promise<Loan[]> => {
  try {
    const loansRef = getUserCollection(userId, 'loans')
    const q = query(loansRef, orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Loan[]
  } catch (error) {
    // Rethrow so the storage layer can surface permission/network failures
    // instead of masking them as "no data" and blanking the UI.
    console.error('Error getting loans:', error)
    throw error
  }
}

export const saveLoan = async (userId: string, loan: Omit<Loan, 'id'>): Promise<string> => {
  try {
    const loansRef = getUserCollection(userId, 'loans')
    const filteredLoan = filterUndefined({
      ...loan,
      createdAt: serverTimestamp()
    })
    const docRef = await addDoc(loansRef, filteredLoan)
    scheduleBackup()
    return docRef.id
  } catch (error) {
    console.error('Error saving loan:', error)
    throw error
  }
}

export const updateLoan = async (userId: string, loanId: string, updates: Partial<Loan>): Promise<void> => {
  try {
    const loanRef = getUserDoc(userId, 'loans', loanId)
    const filteredUpdates = filterUndefined({
      ...updates,
      updatedAt: serverTimestamp()
    })
    await updateDoc(loanRef, filteredUpdates)
    scheduleBackup()
  } catch (error) {
    console.error('Error updating loan:', error)
    throw error
  }
}

export const deleteLoan = async (userId: string, loanId: string): Promise<void> => {
  try {
    const loanRef = getUserDoc(userId, 'loans', loanId)
    await deleteDoc(loanRef)
    scheduleBackup()
  } catch (error) {
    console.error('Error deleting loan:', error)
    throw error
  }
}

// ===== REMINDER FUNCTIONS =====
export const getReminders = async (userId: string): Promise<Reminder[]> => {
  try {
    const remindersRef = getUserCollection(userId, 'reminders')
    const q = query(remindersRef, orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Reminder[]
  } catch (error) {
    // Rethrow so the storage layer can surface permission/network failures
    // instead of masking them as "no data" and blanking the UI.
    console.error('Error getting reminders:', error)
    throw error
  }
}

export const saveReminder = async (userId: string, reminder: Omit<Reminder, 'id'>): Promise<string> => {
  try {
    const remindersRef = getUserCollection(userId, 'reminders')
    const filteredReminder = filterUndefined({
      ...reminder,
      createdAt: serverTimestamp()
    })
    const docRef = await addDoc(remindersRef, filteredReminder)
    scheduleBackup()
    return docRef.id
  } catch (error) {
    console.error('Error saving reminder:', error)
    throw error
  }
}

export const updateReminder = async (userId: string, reminderId: string, updates: Partial<Reminder>): Promise<void> => {
  try {
    const reminderRef = getUserDoc(userId, 'reminders', reminderId)
    const filteredUpdates = filterUndefined({
      ...updates,
      updatedAt: serverTimestamp()
    })
    await updateDoc(reminderRef, filteredUpdates)
    scheduleBackup()
  } catch (error) {
    console.error('Error updating reminder:', error)
    throw error
  }
}

export const deleteReminder = async (userId: string, reminderId: string): Promise<void> => {
  try {
    const reminderRef = getUserDoc(userId, 'reminders', reminderId)
    await deleteDoc(reminderRef)
    scheduleBackup()
  } catch (error) {
    console.error('Error deleting reminder:', error)
    throw error
  }
}

// ===== EXPENSE FUNCTIONS =====
export const getExpenses = async (userId: string): Promise<Expense[]> => {
  try {
    const ref = getUserCollection(userId, 'expenses')
    const q = query(ref, orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[]
  } catch (error) {
    console.error('Error getting expenses:', error)
    throw error
  }
}

export const saveExpense = async (userId: string, expense: Omit<Expense, 'id'>): Promise<string> => {
  try {
    const ref = getUserCollection(userId, 'expenses')
    const docRef = await addDoc(ref, filterUndefined({ ...expense, createdAt: serverTimestamp() }))
    scheduleBackup()
    return docRef.id
  } catch (error) {
    console.error('Error saving expense:', error)
    throw error
  }
}

export const updateExpense = async (userId: string, expenseId: string, updates: Partial<Expense>): Promise<void> => {
  try {
    const ref = getUserDoc(userId, 'expenses', expenseId)
    await updateDoc(ref, filterUndefined({ ...updates, updatedAt: serverTimestamp() }))
    scheduleBackup()
  } catch (error) {
    console.error('Error updating expense:', error)
    throw error
  }
}

export const deleteExpense = async (userId: string, expenseId: string): Promise<void> => {
  try {
    const ref = getUserDoc(userId, 'expenses', expenseId)
    await deleteDoc(ref)
    scheduleBackup()
  } catch (error) {
    console.error('Error deleting expense:', error)
    throw error
  }
}

export const subscribeToExpenses = (userId: string, callback: (expenses: Expense[]) => void) => {
  const ref = getUserCollection(userId, 'expenses')
  const q = query(ref, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (querySnapshot) => {
    const expenses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[]
    callback(expenses)
  }, (error) => {
    // Log only. Do NOT callback([]) — a transient error would otherwise wipe
    // the last-known-good data from the UI. Leave existing state in place.
    console.error('Expenses subscription error:', error)
  })
}

// ===== USER PREFS (users/{uid}/meta/prefs) =====
export const getUserPrefs = async (userId: string): Promise<UserPrefs> => {
  try {
    const ref = doc(db, 'users', userId, 'meta', 'prefs')
    const snap = await getDoc(ref)
    return (snap.exists() ? snap.data() : {}) as UserPrefs
  } catch (error) {
    console.error('Error getting prefs:', error)
    throw error
  }
}

export const setUserPrefs = async (userId: string, updates: Partial<UserPrefs>): Promise<void> => {
  try {
    const ref = doc(db, 'users', userId, 'meta', 'prefs')
    await setDoc(ref, filterUndefined(updates), { merge: true })
  } catch (error) {
    console.error('Error setting prefs:', error)
    throw error
  }
}

// ===== REALTIME LISTENERS =====
export const subscribeToDebts = (userId: string, callback: (debts: Debt[]) => void) => {
  const debtsRef = getUserCollection(userId, 'debts')
  const q = query(debtsRef, orderBy('createdAt', 'desc'))

  return onSnapshot(q, (querySnapshot) => {
    const debts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Debt[]
    callback(debts)
  }, (error) => {
    // Log only. Do NOT callback([]) — a transient error would otherwise wipe
    // the last-known-good data from the UI. Leave existing state in place.
    console.error('Debts subscription error:', error)
  })
}

export const subscribeToLoans = (userId: string, callback: (loans: Loan[]) => void) => {
  const loansRef = getUserCollection(userId, 'loans')
  const q = query(loansRef, orderBy('createdAt', 'desc'))

  return onSnapshot(q, (querySnapshot) => {
    const loans = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Loan[]
    callback(loans)
  }, (error) => {
    // Log only. Do NOT callback([]) — a transient error would otherwise wipe
    // the last-known-good data from the UI. Leave existing state in place.
    console.error('Loans subscription error:', error)
  })
}

export const subscribeToReminders = (userId: string, callback: (reminders: Reminder[]) => void) => {
  const remindersRef = getUserCollection(userId, 'reminders')
  const q = query(remindersRef, orderBy('createdAt', 'desc'))

  return onSnapshot(q, (querySnapshot) => {
    const reminders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Reminder[]
    callback(reminders)
  }, (error) => {
    // Log only. Do NOT callback([]) — a transient error would otherwise wipe
    // the last-known-good data from the UI. Leave existing state in place.
    console.error('Reminders subscription error:', error)
  })
}
