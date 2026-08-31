import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { errorMessage } from '../api/client'
import { budgetsApi } from '../api/endpoints'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Modal } from '../components/Modal'
import { Button, Card, EmptyState, Field, Input, Select, Skeleton } from '../components/ui'
import { useCategories } from '../hooks/useCategories'
import { useMonth } from '../hooks/useMonth'
import { useRefresh } from '../hooks/useRefresh'
import { useToast } from '../hooks/useToast'
import { cx, formatCurrency, monthName } from '../lib/format'
import type { Budget, BudgetStatus } from '../types'

const STATUS: Record<BudgetStatus, { bar: string; text: string; label: string }> = {
  ok: { bar: 'bg-income', text: 'text-income', label: 'En control' },
  warning: { bar: 'bg-[#F77F00]', text: 'text-[#F77F00]', label: 'Cerca del limite' },
  exceeded: { bar: 'bg-expense', text: 'text-expense', label: 'Presupuesto superado' },
}

export default function Budgets() {
  const { categories } = useCategories()
  const { year, month } = useMonth()
  const { version, refresh } = useRefresh()
  const toast = useToast()

  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState<{ categoryId?: string; amount?: string }>({})
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Budget | null>(null)
  const [deleting, setDeleting] = useState(false)

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    budgetsApi
      .list(year, month)
      .then((data) => active && setBudgets(data))
      .catch((error) => active && toast.error(errorMessage(error, 'No se pudieron cargar los presupuestos')))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, version])

  const totals = useMemo(
    () =>
      budgets.reduce(
        (acc, budget) => {
          acc.planned += budget.amount
          acc.spent += budget.spent
          return acc
        },
        { planned: 0, spent: 0 },
      ),
    [budgets],
  )

  const openNew = () => {
    setEditing(null)
    setCategoryId('')
    setAmount('')
    setErrors({})
    setOpen(true)
  }

  const openEdit = (budget: Budget) => {
    setEditing(budget)
    setCategoryId(String(budget.category_id))
    setAmount(String(budget.amount))
    setErrors({})
    setOpen(true)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const found: { categoryId?: string; amount?: string } = {}
    if (!categoryId) found.categoryId = 'Elige una categoria'
    const value = Number(amount)
    if (!amount.trim()) found.amount = 'Escribe un monto'
    else if (Number.isNaN(value) || value <= 0) found.amount = 'El monto debe ser mayor a cero'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await budgetsApi.update(editing.id, { amount: value })
        toast.success('Presupuesto actualizado')
      } else {
        await budgetsApi.create({
          category_id: Number(categoryId),
          amount: value,
          year,
          month,
          recurring: true,
        })
        toast.success('Presupuesto creado')
      }
      setOpen(false)
      refresh()
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo guardar el presupuesto'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await budgetsApi.remove(toDelete.id)
      toast.success('Presupuesto eliminado')
      setToDelete(null)
      refresh()
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo eliminar'))
    } finally {
      setDeleting(false)
    }
  }

  const available = expenseCategories.filter(
    (category) => !budgets.some((b) => b.category_id === category.id) || editing?.category_id === category.id,
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-card" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">
              Presupuesto de {monthName(month)} {year}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
              {formatCurrency(totals.spent)}{' '}
              <span className="text-base font-medium text-muted">
                de {formatCurrency(totals.planned)}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted">
              Te quedan {formatCurrency(Math.max(totals.planned - totals.spent, 0))} por gastar.
            </p>
          </div>
          <Button onClick={openNew} icon={<Plus size={16} />}>
            Nuevo presupuesto
          </Button>
        </div>
      </Card>

      {budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet size={22} />}
            title="Aun no defines presupuestos"
            description="Pon un limite mensual por categoria y la app te avisa cuando te acerques."
            action={
              <Button onClick={openNew} icon={<Plus size={16} />}>
                Crear el primero
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {budgets.map((budget) => {
            const style = STATUS[budget.status]
            const width = Math.min(budget.percentage, 100)
            return (
              <li key={budget.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base"
                    style={{ backgroundColor: budget.category.color + '1F' }}
                    aria-hidden
                  >
                    {budget.category.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{budget.category.name}</p>
                    <p className="text-xs text-muted">
                      {formatCurrency(budget.spent)} de {formatCurrency(budget.amount)}
                    </p>
                  </div>
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => openEdit(budget)}
                      aria-label={'Editar presupuesto de ' + budget.category.name}
                      className="rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-primary"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setToDelete(budget)}
                      aria-label={'Eliminar presupuesto de ' + budget.category.name}
                      className="rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-expense"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cx('h-full rounded-full transition-all duration-500', style.bar)}
                      style={{ width: width + '%' }}
                      role="progressbar"
                      aria-valuenow={Math.round(budget.percentage)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={'Avance del presupuesto de ' + budget.category.name}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                    <span className={cx('flex items-center gap-1 font-medium', style.text)}>
                      {budget.status === 'ok' ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <AlertTriangle size={13} />
                      )}
                      {style.label}
                    </span>
                    <span className="tabular-nums text-muted">
                      {budget.percentage.toFixed(0)}% ·{' '}
                      {budget.remaining >= 0
                        ? 'restan ' + formatCurrency(budget.remaining)
                        : 'excedido por ' + formatCurrency(Math.abs(budget.remaining))}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={open}
        title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="budget-form" loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <form id="budget-form" onSubmit={save} className="space-y-4" noValidate>
          <Field label="Categoria" required error={errors.categoryId}>
            <Select
              value={categoryId}
              disabled={Boolean(editing)}
              error={Boolean(errors.categoryId)}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setErrors((c) => ({ ...c, categoryId: undefined }))
              }}
            >
              <option value="">Elige una categoria de gasto</option>
              {available.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Limite mensual"
            required
            error={errors.amount}
            hint="Se renueva solo cada mes con el mismo monto."
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-muted">
                $
              </span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="3000.00"
                className="pl-7"
                value={amount}
                error={Boolean(errors.amount)}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setErrors((c) => ({ ...c, amount: undefined }))
                }}
              />
            </div>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar presupuesto"
        message={
          toDelete
            ? 'Se eliminara el presupuesto de "' + toDelete.category.name + '" para este mes.'
            : ''
        }
        loading={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
