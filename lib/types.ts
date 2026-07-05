export interface Reminder {
  id: string
  title: string
  description?: string
  scheduledTime: string
  dismissed: boolean
  createdAt: string
  // Repetitive reminder fields
  isRepetitive?: boolean
  repeatInterval?: number // number of days/weeks/months
  repeatType?: 'days' | 'weeks' | 'months'
  completionCount?: number // how many times completed
  occurrences?: ReminderOccurrence[] // history of completions
  originalReminderId?: string // reference to original reminder if this is a repetition
}

export interface ReminderOccurrence {
  id: string
  scheduledTime: string
  completedTime: string
  note?: string
}

export interface Payment {
  id: string
  amount: number
  date: string
  note?: string
  createdAt: string
  // Set when the payment was auto-added by "mark paid" to cover the balance.
  // Reverting to unpaid removes these so the full amount becomes due again.
  auto?: boolean
}

export interface AmountIncrease {
  id: string
  amount: number
  date: string
  reason?: string
  createdAt: string
}

export interface Debt {
  id: string
  personName: string
  amount: number
  reason?: string
  date: string
  dueDate?: string
  returned: boolean
  createdAt: string
  payments?: Payment[]
  increases?: AmountIncrease[]
}

export interface Loan {
  id: string
  personName: string
  amount: number
  reason?: string
  date: string
  dueDate?: string
  returned: boolean
  createdAt: string
  payments?: Payment[]
  increases?: AmountIncrease[]
}

