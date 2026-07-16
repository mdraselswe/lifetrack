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
  // Distinguishes which auto-created reminder this is when a debt/loan links
  // more than one (due date + promise date + installments all share sourceId).
  // Undefined on older reminders means "due" (the original single-reminder shape).
  reminderKind?: 'due' | 'promise' | 'installment'
  // Raw params for auto-created reminders so the reminders page can render
  // their title/description LIVE in the current language (the stored title/
  // description are frozen at creation time — kept only for push + as a
  // fallback for manual/legacy reminders). Present ⇒ render from these.
  autoParams?: {
    name?: string
    amount?: number
    date?: string // YYYY-MM-DD or datetime-local
    i?: number // installment index (1-based)
    n?: number // installment count
    generic?: boolean // promise: an installment plan exists → generic wording
  }
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
  personPhone?: string // for call / WhatsApp nudge
  amount: number
  reason?: string
  date: string
  dueDate?: string
  // "কথা দিয়েছে X তারিখ দেবে" — a promised repayment date to follow up on.
  promiseDate?: string
  returned: boolean
  createdAt: string
  payments?: Payment[]
  increases?: AmountIncrease[]
  // Soft delete: set instead of removing the doc; purged manually from Trash.
  deletedAt?: string
}

export interface Loan {
  id: string
  personName: string
  personPhone?: string // for call / WhatsApp nudge
  amount: number
  reason?: string
  date: string
  dueDate?: string
  // "কথা দিয়েছি X তারিখ দেব" — a promised repayment date to follow up on.
  promiseDate?: string
  returned: boolean
  createdAt: string
  payments?: Payment[]
  increases?: AmountIncrease[]
  // Soft delete: set instead of removing the doc; purged manually from Trash.
  deletedAt?: string
}

// ===== Expenses (daily spending tracker) =====
export type ExpenseCategory =
  | 'food' | 'groceries' | 'transport' | 'bills' | 'rent' | 'mobile'
  | 'shopping' | 'health' | 'education' | 'entertainment' | 'other'

export interface Expense {
  id: string
  amount: number
  category: ExpenseCategory
  note?: string
  date: string // YYYY-MM-DD
  createdAt: string
}

// Per-user preferences stored at users/{uid}/meta/prefs.
export interface UserPrefs {
  monthlyBudget?: number // expense budget in ৳
  pinHash?: string // SHA-256 of the app-lock PIN; absent = lock off
}

