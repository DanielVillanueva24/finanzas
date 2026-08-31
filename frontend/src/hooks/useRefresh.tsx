import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

interface RefreshContextValue {
  /** Cambia cada vez que se crea, edita o borra algo: las pantallas lo usan como dependencia. */
  version: number
  refresh: () => void
}

const RefreshContext = createContext<RefreshContextValue | null>(null)

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion((v) => v + 1), [])
  const value = useMemo(() => ({ version, refresh }), [version, refresh])
  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
}

export function useRefresh(): RefreshContextValue {
  const ctx = useContext(RefreshContext)
  if (!ctx) throw new Error('useRefresh debe usarse dentro de <RefreshProvider>')
  return ctx
}
