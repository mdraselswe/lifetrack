import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase'
import type { Debt, Loan, Reminder } from './types'

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
    console.error('Error getting debts:', error)
    return []
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
  } catch (error) {
    console.error('Error updating debt:', error)
    throw error
  }
}

export const deleteDebt = async (userId: string, debtId: string): Promise<void> => {
  try {
    const debtRef = getUserDoc(userId, 'debts', debtId)
    await deleteDoc(debtRef)
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
    console.error('Error getting loans:', error)
    return []
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
  } catch (error) {
    console.error('Error updating loan:', error)
    throw error
  }
}

export const deleteLoan = async (userId: string, loanId: string): Promise<void> => {
  try {
    const loanRef = getUserDoc(userId, 'loans', loanId)
    await deleteDoc(loanRef)
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
    console.error('Error getting reminders:', error)
    return []
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
  } catch (error) {
    console.error('Error updating reminder:', error)
    throw error
  }
}

export const deleteReminder = async (userId: string, reminderId: string): Promise<void> => {
  try {
    const reminderRef = getUserDoc(userId, 'reminders', reminderId)
    await deleteDoc(reminderRef)
  } catch (error) {
    console.error('Error deleting reminder:', error)
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
  })
}
