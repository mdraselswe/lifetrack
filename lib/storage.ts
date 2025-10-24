import type { Reminder, Debt, Loan, Payment, AmountIncrease } from './types'

// Helper to check if we're in browser
const isBrowser = typeof window !== 'undefined'

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
export const getReminders = (): Reminder[] => {
  if (!isBrowser) return []
  const data = localStorage.getItem('reminders')
  const reminders = data ? JSON.parse(data) : []
  return removeDuplicates(reminders)
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
  const debts = data ? JSON.parse(data) : []
  return removeDuplicates(debts)
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
  const loans = data ? JSON.parse(data) : []
  return removeDuplicates(loans)
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
    // Ensure payment amount is a number
    const paymentWithNumberAmount = {
      ...payment,
      amount: Number(payment.amount)
    }
    debts[index].payments!.push(paymentWithNumberAmount)
    
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
    // Ensure payment amount is a number
    const paymentWithNumberAmount = {
      ...payment,
      amount: Number(payment.amount)
    }
    loans[index].payments!.push(paymentWithNumberAmount)
    
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

// Amount increase management for Loans
export const addLoanIncrease = (loanId: string, increase: AmountIncrease): void => {
  if (!isBrowser) return
  const loans = getLoans()
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
    localStorage.setItem('loans', JSON.stringify(loans))
  }
}

export const deleteLoanIncrease = (loanId: string, increaseId: string): void => {
  if (!isBrowser) return
  const loans = getLoans()
  const index = loans.findIndex(l => l.id === loanId)
  if (index !== -1 && loans[index].increases) {
    loans[index].increases = loans[index].increases!.filter(i => i.id !== increaseId)
    localStorage.setItem('loans', JSON.stringify(loans))
  }
}

// Amount increase management for Debts
export const addDebtIncrease = (debtId: string, increase: AmountIncrease): void => {
  if (!isBrowser) return
  const debts = getDebts()
  const index = debts.findIndex(d => d.id === debtId)
  if (index !== -1) {
    if (!debts[index].increases) {
      debts[index].increases = []
    }
    // Ensure increase amount is a number
    const increaseWithNumberAmount = {
      ...increase,
      amount: typeof increase.amount === 'string' ? parseFloat(increase.amount) : increase.amount
    }
    debts[index].increases!.push(increaseWithNumberAmount)
    localStorage.setItem('debts', JSON.stringify(debts))
  }
}

export const deleteDebtIncrease = (debtId: string, increaseId: string): void => {
  if (!isBrowser) return
  const debts = getDebts()
  const index = debts.findIndex(d => d.id === debtId)
  if (index !== -1 && debts[index].increases) {
    debts[index].increases = debts[index].increases!.filter(i => i.id !== increaseId)
    localStorage.setItem('debts', JSON.stringify(debts))
  }
}


// Utility function to clean up localStorage data
export const cleanupData = (): void => {
  if (!isBrowser) return
  
  // Clean up reminders
  const reminders = getReminders()
  localStorage.setItem('reminders', JSON.stringify(reminders))
  
  // Clean up debts
  const debts = getDebts()
  localStorage.setItem('debts', JSON.stringify(debts))
  
  // Clean up loans
  const loans = getLoans()
  localStorage.setItem('loans', JSON.stringify(loans))
  
  console.log('Data cleanup completed')
}

// Utility function to validate and fix data integrity
export const validateData = (): void => {
  if (!isBrowser) return
  
  // Validate and fix reminders
  const reminders = getReminders().filter(r => 
    r.id && r.title && r.scheduledTime && r.createdAt
  )
  localStorage.setItem('reminders', JSON.stringify(reminders))
  
  // Validate and fix debts
  const debts = getDebts().filter(d => 
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
  localStorage.setItem('debts', JSON.stringify(debts))
  
  // Validate and fix loans
  const loans = getLoans().filter(l => 
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
  localStorage.setItem('loans', JSON.stringify(loans))
  
  console.log('Data validation completed')
}

