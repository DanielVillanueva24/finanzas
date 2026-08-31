import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cx } from '../lib/format'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const STYLES: Record<ToastKind, { bar: string; icon: ReactNode }> = {
  success: { bar: 'bg-income', icon: <CheckCircle2 size={18} className="text-income" /> },
  error: { bar: 'bg-expense', icon: <AlertTriangle size={18} className="text-expense" /> },
  info: { bar: 'bg-primary', icon: <Info size={18} className="text-primary" /> },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current, { id, kind, message }])
      window.setTimeout(() => dismiss(id), 3800)
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
      info: (message: string) => push('info', message),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 sm:top-5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-3 overflow-hidden rounded-card bg-white shadow-pop"
          >
            <span className={cx('h-full w-1 self-stretch', STYLES[toast.kind].bar)} />
            <span className="py-3">{STYLES[toast.kind].icon}</span>
            <p className="flex-1 py-3 pr-2 text-sm font-medium text-ink">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Cerrar aviso"
              className="p-3 text-muted transition-colors hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
