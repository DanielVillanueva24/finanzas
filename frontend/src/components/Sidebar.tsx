import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { NAV_ITEMS } from './NavItems'
import { useAuth } from '../hooks/useAuth'
import { cx } from '../lib/format'

export function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-navy px-4 py-6 md:flex">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg font-bold text-white">
          F
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Finanzas</p>
          <p className="text-xs text-white/45">Control personal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="mb-2 flex items-center gap-3 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sm font-semibold text-white">
            {(user?.full_name || user?.username || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-white">
              {user?.full_name || user?.username}
            </p>
            <p className="truncate text-xs text-white/45">@{user?.username}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} />
          Cerrar sesion
        </button>
      </div>
    </aside>
  )
}
