import { api } from './client'
import type {
  AuthResponse,
  Budget,
  Category,
  CategoryTotal,
  CategoryType,
  MonthPoint,
  Period,
  Summary,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionPage,
  User,
} from '../types'

// ------------------------------------------------------------------ auth
export const authApi = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', { username, password })
    return data
  },
  async register(username: string, password: string, fullName?: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', {
      username,
      password,
      full_name: fullName || null,
    })
    return data
  },
  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me')
    return data
  },
}

// ---------------------------------------------------------- transacciones
function cleanParams(filters: TransactionFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) params[key] = value as string | number
  })
  return params
}

export const transactionsApi = {
  async list(filters: TransactionFilters = {}): Promise<TransactionPage> {
    const { data } = await api.get<TransactionPage>('/transactions', {
      params: cleanParams(filters),
    })
    return data
  },
  async create(payload: TransactionInput): Promise<Transaction> {
    const { data } = await api.post<Transaction>('/transactions', payload)
    return data
  },
  async update(id: number, payload: Partial<TransactionInput>): Promise<Transaction> {
    const { data } = await api.put<Transaction>('/transactions/' + id, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await api.delete('/transactions/' + id)
  },
}

// -------------------------------------------------------------- categorias
export const categoriesApi = {
  async list(type?: CategoryType): Promise<Category[]> {
    const { data } = await api.get<Category[]>('/categories', { params: type ? { type } : {} })
    return data
  },
  async create(payload: Omit<Category, 'id' | 'is_default'>): Promise<Category> {
    const { data } = await api.post<Category>('/categories', payload)
    return data
  },
  async update(id: number, payload: Partial<Omit<Category, 'id' | 'is_default'>>): Promise<Category> {
    const { data } = await api.put<Category>('/categories/' + id, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await api.delete('/categories/' + id)
  },
}

// ------------------------------------------------------------ presupuestos
export const budgetsApi = {
  async list(year: number, month: number): Promise<Budget[]> {
    const { data } = await api.get<Budget[]>('/budgets', { params: { year, month } })
    return data
  },
  async create(payload: {
    category_id: number
    amount: number
    year: number
    month: number
    recurring: boolean
  }): Promise<Budget> {
    const { data } = await api.post<Budget>('/budgets', payload)
    return data
  },
  async update(id: number, payload: { amount?: number; recurring?: boolean }): Promise<Budget> {
    const { data } = await api.put<Budget>('/budgets/' + id, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await api.delete('/budgets/' + id)
  },
}

// ----------------------------------------------------------------- reportes
export interface RangeParams {
  period?: Period
  start?: string
  end?: string
}

export const reportsApi = {
  async summary(params: RangeParams): Promise<Summary> {
    const { data } = await api.get<Summary>('/reports/summary', { params })
    return data
  },
  async byCategory(params: RangeParams & { type?: 'income' | 'expense' }): Promise<CategoryTotal[]> {
    const { data } = await api.get<CategoryTotal[]>('/reports/by-category', { params })
    return data
  },
  async balanceHistory(months = 6): Promise<MonthPoint[]> {
    const { data } = await api.get<MonthPoint[]>('/reports/balance-history', { params: { months } })
    return data
  },
  async exportCsv(params: RangeParams): Promise<Blob> {
    const { data } = await api.get('/reports/export-csv', { params, responseType: 'blob' })
    return data as Blob
  },
}
