import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { TransactionForm } from './TransactionForm'
import { NAV_ITEMS } from './NavItems'
import { useCategories } from '../hooks/useCategories'
import { useRefresh } from '../hooks/useRefresh'

export function Layout() {
  const location = useLocation()
  const { categories } = useCategories()
  const { refresh } = useRefresh()
  const [formOpen, setFormOpen] = useState(false)

  const current = NAV_ITEMS.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
  )

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />

      <div className="md:pl-60">
        <Header title={current?.label ?? 'Finanzas'} />
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 md:pb-10">
          <Outlet />
        </main>
      </div>

      <button
        type="button"
        onClick={() => setFormOpen(true)}
        aria-label="Nueva transaccion"
        className="fixed bottom-[76px] right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-pop transition-transform active:scale-95 md:bottom-8 md:right-8"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Plus size={24} />
      </button>

      <BottomNav />

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        categories={categories}
      />
    </div>
  )
}
