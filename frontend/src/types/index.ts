export type TransactionType = 'income' | 'expense' | 'transfer'
export type CategoryType = 'income' | 'expense'
export type BudgetStatus = 'ok' | 'warning' | 'exceeded'
export type Period = 'week' | 'month' | 'year'

export interface User {
  id: number
  username: string
  full_name: string | null
  currency: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Category {
  id: number
  name: string
  icon: string
  color: string
  type: CategoryType
  is_default: boolean
}

export interface Transaction {
  id: number
  type: TransactionType
  amount: number
  description: string
  date: string
  category_id: number | null
  note: string | null
  created_at: string
  category: Category | null
}

export interface TransactionPage {
  items: Transaction[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface TransactionInput {
  type: TransactionType
  amount: number
  description: string
  date: string
  category_id: number | null
  note: string | null
}

export interface Budget {
  id: number
  category_id: number
  amount: number
  year: number
  month: number
  recurring: boolean
  category: Category
  spent: number
  remaining: number
  percentage: number
  status: BudgetStatus
}

export interface Summary {
  start: string
  end: string
  income: number
  expense: number
  net: number
  transactions: number
  avg_daily_expense: number
}

export interface CategoryTotal {
  category_id: number | null
  name: string
  icon: string
  color: string
  type: TransactionType
  total: number
  percentage: number
  count: number
}

export interface MonthPoint {
  year: number
  month: number
  label: string
  income: number
  expense: number
  balance: number
  cumulative: number
}

export interface TransactionFilters {
  page?: number
  limit?: number
  type?: TransactionType | ''
  category_id?: number | ''
  start_date?: string
  end_date?: string
  search?: string
}
