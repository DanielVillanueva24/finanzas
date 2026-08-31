import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { categoriesApi } from '../api/endpoints'
import type { Category } from '../types'

interface CategoriesContextValue {
  categories: Category[]
  loading: boolean
  reload: () => Promise<void>
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null)

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setCategories(await categoriesApi.list())
    } catch {
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const value = useMemo(() => ({ categories, loading, reload }), [categories, loading, reload])
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategories debe usarse dentro de <CategoriesProvider>')
  return ctx
}
