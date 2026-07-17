import type { ExpenseCategory } from './types'

// Category dot/bar colors, shared by the expenses page and the home quick-add.
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: '#f97316', // orange
  groceries: '#84cc16', // lime
  transport: '#3b82f6', // blue
  bills: '#eab308', // yellow
  rent: '#14b8a6', // teal
  mobile: '#06b6d4', // cyan
  shopping: '#ec4899', // pink
  health: '#10b981', // emerald
  education: '#8b5cf6', // violet
  entertainment: '#d946ef', // fuchsia
  other: '#64748b', // slate
}

export const CATEGORIES = Object.keys(CATEGORY_COLORS) as ExpenseCategory[]
