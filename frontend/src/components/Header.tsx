import { ChevronLeft, ChevronRight, LogOut, RotateCcw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useMonth } from '../hooks/useMonth'
import { monthName } from '../lib/format'

export function Header({ title }: { title: string }) {
  const { user, logout } = useAuth()
  const { year, month, shift, reset, isCurrentMonth } = useMonth()
  const initial = (user?.full_name || user?.username || '?').charAt(0).toUpperCase()

  return (
    <header className="safe-top sticky top-0 z-20 border-b border-slate-200 bg-canvas/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs text-muted">Hola, {user?.full_name?.split(' ')[0] || user?.username}</p>
          <h1 className="truncate text-lg font-bold text-ink sm:text-xl">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Mes anterior"
              className="rounded-l-lg p-2 text-muted transition-colors hover:bg-slate-50 hover:text-ink"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="min-w-[104px] select-none px-1 text-center text-sm font-semibold text-ink">
              {monthName(month).slice(0, 3)} {year}
            </span>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Mes siguiente"
              className="rounded-r-lg p-2 text-muted transition-colors hover:bg-slate-50 hover:text-ink"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          {!isCurrentMonth && (
            <button
              type="button"
              onClick={reset}
              aria-label="Volver al mes actual"
              title="Volver al mes actual"
              className="rounded-lg border border-slate-200 bg-white p-2 text-muted transition-colors hover:text-primary"
            >
              <RotateCcw size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            aria-label="Cerrar sesion"
            title="Cerrar sesion"
            className="grid h-9 w-9 place-items-center rounded-full bg-navy text-sm font-semibold text-white transition-opacity hover:opacity-85 md:hidden"
          >
            {initial}
          </button>
          <button
            type="button"
            onClick={logout}
            aria-label="Cerrar sesion"
            title="Cerrar sesion"
            className="hidden rounded-lg border border-slate-200 bg-white p-2 text-muted transition-colors hover:text-expense md:block"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
