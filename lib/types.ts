export type ReminderCategory = 'medicine' | 'money' | 'personal' | 'work'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Reminder {
  id: string
  title: string
  description?: string
  scheduledTime: string
  dismissed: boolean
  createdAt: string
  // Set when auto-created from a debt/loan due date; lets us remove the
  // reminder if that debt/loan is deleted.
  sourceId?: string
  sourceType?: 'debt' | 'loan'
  // Repetitive reminder fields
  isRepetitive?: boolean
  repeatInterval?: number // number of days/weeks/months
  repeatType?: 'days' | 'weeks' | 'months' | 'weekdays'
  repeatWeekdays?: number[] // for repeatType 'weekdays': 0=Sun … 6=Sat
  repeatUntil?: string // 'YYYY-MM-DD' — stop repeating after this date
  completionCount?: number // how many times completed
  occurrences?: ReminderOccurrence[] // history of completions
  originalReminderId?: string // reference to original reminder if this is a repetition
  // Optional extras
  category?: ReminderCategory
  checklist?: ChecklistItem[]
  leadMinutes?: number // also notify this many minutes BEFORE scheduledTime
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

