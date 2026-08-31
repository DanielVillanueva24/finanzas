import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { addMonths, monthRangeISO } from '../lib/format'

interface MonthContextValue {
  year: number
  month: number
  start: string
  end: string
  isCurrentMonth: boolean
  shift: (delta: number) => void
  reset: () => void
}

const MonthContext = createContext<MonthContextValue | null>(null)

export function MonthProvider({ children }: { children: ReactNode }) {
  const now = new Date()
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })

  const shift = useCallback((delta: number) => {
    setPeriod((current) => addMonths(current.year, current.month, delta))
  }, [])

  const reset = useCallback(() => {
    const today = new Date()
    setPeriod({ year: today.getFullYear(), month: today.getMonth() + 1 })
  }, [])

  const value = useMemo<MonthContextValue>(() => {
    const { start, end } = monthRangeISO(period.year, period.month)
    const today = new Date()
    return {
      year: period.year,
      month: period.month,
      start,
      end,
      isCurrentMonth:
        period.year === today.getFullYear() && period.month === today.getMonth() + 1,
      shift,
      reset,
    }
  }, [period, shift, reset])

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>
}

export function useMonth(): MonthContextValue {
  const ctx = useContext(MonthContext)
  if (!ctx) throw new Error('useMonth debe usarse dentro de <MonthProvider>')
  return ctx
}
