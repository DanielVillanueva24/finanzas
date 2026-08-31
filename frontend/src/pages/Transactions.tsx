import { useEffect, useMemo, useState } from 'react'
import { Plus, Receipt, Search, SlidersHorizontal, X } from 'lucide-react'
import { errorMessage } from '../api/client'
import { transactionsApi } from '../api/endpoints'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionRow } from '../components/TransactionRow'
import { Button, Card, EmptyState, Field, Input, Select, Skeleton } from '../components/ui'
import { useCategories } from '../hooks/useCategories'
import { useMonth } from '../hooks/useMonth'
import { useRefresh } from '../hooks/useRefresh'
import { useToast } from '../hooks/useToast'
import { cx, formatCurrency } from '../lib/format'
import type { Transaction, TransactionType } from '../types'

const LIMIT = 20

export default function Transactions() {
  const { categories } = useCategories()
  const { start, end } = useMonth()
  const { version, refresh } = useRefresh()
  const toast = useToast()

  const [items, setItems] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [type, setType] = useState<TransactionType | ''>('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [startDate, setStartDate] = useState(start)
  const [endDate, setEndDate] = useState(end)
  const [showFilters, setShowFilters] = useState(false)

  const [editing, setEditing] = useState<Transaction | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState(false)

  // El selector de mes del header manda sobre el rango de fechas.
  useEffect(() => {
    setStartDate(start)
    setEndDate(end)
    setPage(1)
  }, [start, end])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search)
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    setLoading(true)
    transactionsApi
      .list({
        page,
        limit: LIMIT,
        type,
        category_id: categoryId,
        start_date: startDate,
        end_date: endDate,
        search: debounced.trim(),
      })
      .then((data) => {
        if (!active) return
        setItems(data.items)
        setTotal(data.total)
        setPages(data.pages)
      })
      .catch((error) => active && toast.error(errorMessage(error, 'No se pudieron cargar los movimientos')))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type, categoryId, startDate, endDate, debounced, version])

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        if (item.type === 'income') acc.income += item.amount
        if (item.type === 'expense') acc.expense += item.amount
        return acc
      },
      { income: 0, expense: 0 },
    )
  }, [items])

  const activeFilters = [type, categoryId].filter((value) => value !== '').length

  const clearFilters = () => {
    setType('')
    setCategoryId('')
    setStartDate(start)
    setEndDate(end)
    setSearch('')
    setPage(1)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await transactionsApi.remove(toDelete.id)
      toast.success('Transaccion eliminada')
      setToDelete(null)
      refresh()
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo eliminar'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Buscador y filtros */}
      <Card className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <Input
              className="pl-9"
              placeholder="Buscar por descripcion o nota"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpiar busqueda"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-muted hover:text-ink"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowFilters((v) => !v)}
            icon={<SlidersHorizontal size={16} />}
            className={cx(showFilters && 'border-primary text-primary')}
          >
            <span className="hidden sm:inline">Filtros</span>
            {activeFilters > 0 && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
                {activeFilters}
              </span>
            )}
          </Button>
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            icon={<Plus size={16} />}
            className="hidden sm:inline-flex"
          >
            Nueva
          </Button>
        </div>

        {showFilters && (
          <div className="grid animate-fade-in gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Tipo">
              <Select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as TransactionType | '')
                  setPage(1)
                }}
              >
                <option value="">Todos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Gastos</option>
                <option value="transfer">Transferencias</option>
              </Select>
            </Field>

            <Field label="Categoria">
              <Select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value ? Number(e.target.value) : '')
                  setPage(1)
                }}
              >
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Desde">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
              />
            </Field>

            <Field label="Hasta">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
              />
            </Field>

            <div className="sm:col-span-2 lg:col-span-4">
              <Button variant="ghost" onClick={clearFilters} icon={<X size={15} />}>
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Resultados */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-ink">
            {total} {total === 1 ? 'movimiento' : 'movimientos'}
          </p>
          <p className="flex gap-3 text-xs">
            <span className="text-income">+{formatCurrency(totals.income)}</span>
            <span className="text-expense">-{formatCurrency(totals.expense)}</span>
            <span className="text-muted">en esta pagina</span>
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <ul className="divide-y divide-slate-100 px-3">
            {items.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                onEdit={(item) => {
                  setEditing(item)
                  setFormOpen(true)
                }}
                onDelete={setToDelete}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Receipt size={22} />}
            title="Sin resultados"
            description="Prueba con otros filtros o registra un nuevo movimiento."
            action={
              <Button
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
                icon={<Plus size={16} />}
              >
                Nueva transaccion
              </Button>
            }
          />
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted">
              Pagina {page} de {pages}
            </span>
            <Button
              variant="secondary"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        )}
      </Card>

      <TransactionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSaved={refresh}
        categories={categories}
        transaction={editing}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar transaccion"
        message={
          toDelete
            ? 'Se eliminara "' + toDelete.description + '". Esta accion no se puede deshacer.'
            : ''
        }
        loading={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
