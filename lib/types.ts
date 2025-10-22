export interface Reminder {
  id: string
  title: string
  description?: string
  scheduledTime: string
  dismissed: boolean
  createdAt: string
}

export interface Payment {
  id: string
  amount: number
  date: string
  note?: string
  createdAt: string
}

export interface Debt {
  id: string
  personName: string
  amount: number
  reason?: string
  date: string
  returned: boolean
  createdAt: string
  payments?: Payment[]
}

export interface Loan {
  id: string
  personName: string
  amount: number
  reason?: string
  date: string
  returned: boolean
  createdAt: string
  payments?: Payment[]
}

