import { useEffect, useMemo, useState } from 'react'
import { errorMessage } from '../api/client'
import { transactionsApi } from '../api/endpoints'
import { useToast } from '../hooks/useToast'
import { cx, todayISO } from '../lib/format'
import type { Category, Transaction, TransactionType } from '../types'
import { Modal } from './Modal'
import { Button, Field, Input, Select, Textarea } from './ui'

const TYPES: Array<{ value: TransactionType; label: string; active: string }> = [
  { value: 'expense', label: 'Gasto', active: 'bg-expense text-white border-expense' },
  { value: 'income', label: 'Ingreso', active: 'bg-income text-white border-income' },
  { value: 'transfer', label: 'Transferencia', active: 'bg-muted text-white border-muted' },
]

interface FormState {
  type: TransactionType
  amount: string
  description: string
  category_id: string
  date: string
  note: string
}

const EMPTY: FormState = {
  type: 'expense',
  amount: '',
  description: '',
  category_id: '',
  date: todayISO(),
  note: '',
}

type Errors = Partial<Record<keyof FormState, string>>

function validate(form: FormState): Errors {
  const errors: Errors = {}
  const amount = Number(form.amount)
  if (!form.amount.trim()) errors.amount = 'Escribe un monto'
  else if (Number.isNaN(amount)) errors.amount = 'El monto debe ser un numero'
  else if (amount <= 0) errors.amount = 'El monto debe ser mayor a cero'

  if (!form.description.trim()) errors.description = 'Escribe una descripcion'
  else if (form.description.trim().length > 160) errors.description = 'Maximo 160 caracteres'

  if (!form.date) errors.date = 'Elige una fecha'
  if (form.type !== 'transfer' && !form.category_id) errors.category_id = 'Elige una categoria'
  return errors
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  categories: Category[]
  transaction?: Transaction | null
}

export function TransactionForm({ open, onClose, onSaved, categories, transaction }: Props) {
  const toast = useToast()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(transaction)

  useEffect(() => {
    if (!open) return
    setTouched({})
    setErrors({})
    if (transaction) {
      setForm({
        type: transaction.type,
        amount: String(transaction.amount),
        description: transaction.description,
        category_id: transaction.category_id ? String(transaction.category_id) : '',
        date: transaction.date,
        note: transaction.note ?? '',
      })
    } else {
      setForm({ ...EMPTY, date: todayISO() })
    }
  }, [open, transaction])

  // Validacion en tiempo real: recalcula en cada cambio, se muestra al tocar el campo.
  useEffect(() => {
    setErrors(validate(form))
  }, [form])

  const visibleCategories = useMemo(() => {
    if (form.type === 'transfer') return categories
    return categories.filter((c) => c.type === form.type)
  }, [categories, form.type])

  const set = (key: keyof FormState, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value }
      // Al cambiar de tipo la categoria elegida puede dejar de aplicar.
      if (key === 'type') {
        const stillValid = categories.some(
          (c) => String(c.id) === current.category_id && (value === 'transfer' || c.type === value),
        )
        if (!stillValid) next.category_id = ''
      }
      return next
    })
  }

  const showError = (key: keyof FormState) => (touched[key] ? errors[key] : undefined)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const found = validate(form)
    setErrors(found)
    setTouched({
      amount: true,
      description: true,
      category_id: true,
      date: true,
      type: true,
      note: true,
    })
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      const payload = {
        type: form.type,
        amount: Number(form.amount),
        description: form.description.trim(),
        category_id: form.category_id ? Number(form.category_id) : null,
        date: form.date,
        note: form.note.trim() ? form.note.trim() : null,
      }
      if (transaction) {
        await transactionsApi.update(transaction.id, payload)
        toast.success('Transaccion actualizada')
      } else {
        await transactionsApi.create(payload)
        toast.success('Transaccion guardada')
      }
      onSaved()
      onClose()
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo guardar la transaccion'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar transaccion' : 'Nueva transaccion'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="transaction-form" loading={saving}>
            {isEdit ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">Tipo</span>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => set('type', option.value)}
                className={cx(
                  'rounded-lg border px-2 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]',
                  form.type === option.value
                    ? option.active
                    : 'border-slate-200 bg-white text-muted hover:border-slate-300 hover:text-ink',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Monto" required error={showError('amount')}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-muted">
              $
            </span>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="pl-7"
              value={form.amount}
              error={Boolean(showError('amount'))}
              onChange={(e) => set('amount', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
            />
          </div>
        </Field>

        <Field label="Descripcion" required error={showError('description')}>
          <Input
            placeholder="Ej. Super de la semana"
            maxLength={160}
            value={form.description}
            error={Boolean(showError('description'))}
            onChange={(e) => set('description', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, description: true }))}
          />
        </Field>

        <Field
          label="Categoria"
          required={form.type !== 'transfer'}
          error={showError('category_id')}
          hint={form.type === 'transfer' ? 'Opcional para transferencias' : undefined}
        >
          <Select
            value={form.category_id}
            error={Boolean(showError('category_id'))}
            onChange={(e) => set('category_id', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, category_id: true }))}
          >
            <option value="">Sin categoria</option>
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Fecha" required error={showError('date')}>
          <Input
            type="date"
            value={form.date}
            error={Boolean(showError('date'))}
            onChange={(e) => set('date', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, date: true }))}
          />
        </Field>

        <Field label="Nota" hint="Opcional">
          <Textarea
            rows={2}
            maxLength={500}
            placeholder="Detalle adicional"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  )
}
