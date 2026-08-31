import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './NavItems'
import { cx } from '../lib/format'

export function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg">
        {NAV_ITEMS.map(({ to, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cx(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cx(
                    'grid h-8 w-12 place-items-center rounded-full transition-colors',
                    isActive && 'bg-primary-light',
                  )}
                >
                  <Icon size={19} />
                </span>
                {short}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
