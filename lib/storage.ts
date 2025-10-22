import { Reminder, Debt, Loan, Payment } from './types'

// Helper to check if we're in browser
const isBrowser = typeof window !== 'undefined'

// Reminders
export const getReminders = (): Reminder[] => {
  if (!isBrowser) return []
  const data = localStorage.getItem('reminders')
  return data ? JSON.parse(data) : []
}

export const saveReminder = (reminder: Reminder): void => {
  if (!isBrowser) return
  const reminders = getReminders()
  reminders.push(reminder)
  localStorage.setItem('reminders', JSON.stringify(reminders))
}

export const updateReminder = (id: string, updates: Partial<Reminder>): void => {
  if (!isBrowser) return
  const reminders = getReminders()
  const index = reminders.findIndex(r => r.id === id)
  if (index !== -1) {
    reminders[index] = { ...reminders[index], ...updates }
    localStorage.setItem('reminders', JSON.stringify(reminders))
  }
}

export const deleteReminder = (id: string): void => {
  if (!isBrowser) return
  const reminders = getReminders().filter(r => r.id !== id)
  localStorage.setItem('reminders', JSON.stringify(reminders))
}

// Debts (money lent)
export const getDebts = (): Debt[] => {
  if (!isBrowser) return []
  const data = localStorage.getItem('debts')
  return data ? JSON.parse(data) : []
}

export const saveDebt = (debt: Debt): void => {
  if (!isBrowser) return
  const debts = getDebts()
  debts.push(debt)
  localStorage.setItem('debts', JSON.stringify(debts))
}

export const updateDebt = (id: string, updates: Partial<Debt>): void => {
  if (!isBrowser) return
  const debts = getDebts()
  const index = debts.findIndex(d => d.id === id)
  if (index !== -1) {
    debts[index] = { ...debts[index], ...updates }
    localStorage.setItem('debts', JSON.stringify(debts))
  }
}

export const deleteDebt = (id: string): void => {
  if (!isBrowser) return
  const debts = getDebts().filter(d => d.id !== id)
  localStorage.setItem('debts', JSON.stringify(debts))
}

// Loans (money borrowed)
export const getLoans = (): Loan[] => {
  if (!isBrowser) return []
  const data = localStorage.getItem('loans')
  return data ? JSON.parse(data) : []
}

export const saveLoan = (loan: Loan): void => {
  if (!isBrowser) return
  const loans = getLoans()
  loans.push(loan)
  localStorage.setItem('loans', JSON.stringify(loans))
}

export const updateLoan = (id: string, updates: Partial<Loan>): void => {
  if (!isBrowser) return
  const loans = getLoans()
  const index = loans.findIndex(l => l.id === id)
  if (index !== -1) {
    loans[index] = { ...loans[index], ...updates }
    localStorage.setItem('loans', JSON.stringify(loans))
  }
}

export const deleteLoan = (id: string): void => {
  if (!isBrowser) return
  const loans = getLoans().filter(l => l.id !== id)
  localStorage.setItem('loans', JSON.stringify(loans))
}

// Payment management for Debts
export const addDebtPayment = (debtId: string, payment: Payment): void => {
  if (!isBrowser) return
  const debts = getDebts()
  const index = debts.findIndex(d => d.id === debtId)
  if (index !== -1) {
    if (!debts[index].payments) {
      debts[index].payments = []
    }
    debts[index].payments!.push(payment)
    
    // Auto-mark as returned if fully paid
    const totalPaid = debts[index].payments!.reduce((sum, p) => sum + p.amount, 0)
    if (totalPaid >= debts[index].amount) {
      debts[index].returned = true
    }
    
    localStorage.setItem('debts', JSON.stringify(debts))
  }
}

export const deleteDebtPayment = (debtId: string, paymentId: string): void => {
  if (!isBrowser) return
  const debts = getDebts()
  const index = debts.findIndex(d => d.id === debtId)
  if (index !== -1 && debts[index].payments) {
    debts[index].payments = debts[index].payments!.filter(p => p.id !== paymentId)
    
    // Update returned status based on remaining payments
    const totalPaid = debts[index].payments!.reduce((sum, p) => sum + p.amount, 0)
    debts[index].returned = totalPaid >= debts[index].amount
    
    localStorage.setItem('debts', JSON.stringify(debts))
  }
}

// Payment management for Loans
export const addLoanPayment = (loanId: string, payment: Payment): void => {
  if (!isBrowser) return
  const loans = getLoans()
  const index = loans.findIndex(l => l.id === loanId)
  if (index !== -1) {
    if (!loans[index].payments) {
      loans[index].payments = []
    }
    loans[index].payments!.push(payment)
    
    // Auto-mark as returned if fully paid
    const totalPaid = loans[index].payments!.reduce((sum, p) => sum + p.amount, 0)
    if (totalPaid >= loans[index].amount) {
      loans[index].returned = true
    }
    
    localStorage.setItem('loans', JSON.stringify(loans))
  }
}

export const deleteLoanPayment = (loanId: string, paymentId: string): void => {
  if (!isBrowser) return
  const loans = getLoans()
  const index = loans.findIndex(l => l.id === loanId)
  if (index !== -1 && loans[index].payments) {
    loans[index].payments = loans[index].payments!.filter(p => p.id !== paymentId)
    
    // Update returned status based on remaining payments
    const totalPaid = loans[index].payments!.reduce((sum, p) => sum + p.amount, 0)
    loans[index].returned = totalPaid >= loans[index].amount
    
    localStorage.setItem('loans', JSON.stringify(loans))
  }
}

