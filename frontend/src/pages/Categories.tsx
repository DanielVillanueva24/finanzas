import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { errorMessage } from '../api/client'
import { categoriesApi } from '../api/endpoints'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Modal } from '../components/Modal'
import { Button, Card, CardTitle, EmptyState, Field, Input, Select, Skeleton } from '../components/ui'
import { useCategories } from '../hooks/useCategories'
import { useRefresh } from '../hooks/useRefresh'
import { useToast } from '../hooks/useToast'
import { cx } from '../lib/format'
import type { Category, CategoryType } from '../types'

// Paleta validada para daltonismo: colores vecinos siempre distinguibles.
const SWATCHES = [
  '#E63946', '#118AB2', '#7B2CBF', '#F77F00', '#43AA8B',
  '#4361EE', '#B58900', '#C2185B', '#2EC4B6', '#8D99AE',
]

const EMOJIS = ['🍽️', '🚌', '🏠', '🎬', '💉', '🎓', '👕', '💡', '📦', '💼', '💻', '📈', '🎁', '💵', '🐶', '✈️', '🏋️', '☕']

interface FormState {
  name: string
  icon: string
  color: string
  type: CategoryType
}

const EMPTY: FormState = { name: '', icon: '📦', color: '#4361EE', type: 'expense' }

export default function Categories() {
  const { categories, loading, reload } = useCategories()
  const { refresh } = useRefresh()
  const toast = useToast()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const groups = useMemo(
    () => ({
      expense: categories.filter((c) => c.type === 'expense'),
      income: categories.filter((c) => c.type === 'income'),
    }),
    [categories],
  )

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({ name: editing.name, icon: editing.icon, color: editing.color, type: editing.type })
    } else {
      setForm(EMPTY)
    }
    setError(undefined)
  }, [open, editing])

  const openNew = () => {
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    setOpen(true)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setError('Escribe un nombre')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await categoriesApi.update(editing.id, { ...form, name })
        toast.success('Categoria actualizada')
      } else {
        await categoriesApi.create({ ...form, name })
        toast.success('Categoria creada')
      }
      await reload()
      refresh()
      setOpen(false)
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo guardar la categoria'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await categoriesApi.remove(toDelete.id)
      toast.success('Categoria eliminada')
      setToDelete(null)
      await reload()
      refresh()
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo eliminar la categoria'))
    } finally {
      setDeleting(false)
    }
  }

  const renderGroup = (title: string, list: Category[]) => (
    <Card>
      <CardTitle>{title}</CardTitle>
      {list.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((category) => (
            <li
              key={category.id}
              className="group flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 transition-colors hover:border-slate-200"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base"
                style={{ backgroundColor: category.color + '1F' }}
                aria-hidden
              >
                {category.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{category.name}</p>
                <p className="text-xs text-muted">
                  {category.is_default ? 'Predefinida' : 'Personalizada'}
                </p>
              </div>
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden
              />
              <div className="flex opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => openEdit(category)}
                  aria-label={'Editar ' + category.name}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-primary"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(category)}
                  aria-label={'Eliminar ' + category.name}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-expense"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Tags size={22} />} title="Sin categorias en este grupo" />
      )}
    </Card>
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Organiza tus movimientos. Las predefinidas tambien se pueden editar.
        </p>
        <Button onClick={openNew} icon={<Plus size={16} />}>
          Nueva
        </Button>
      </div>

      {renderGroup('Categorias de gasto', groups.expense)}
      {renderGroup('Categorias de ingreso', groups.income)}

      <Modal
        open={open}
        title={editing ? 'Editar categoria' : 'Nueva categoria'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="category-form" loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={save} className="space-y-4" noValidate>
          <Field label="Nombre" required error={error}>
            <Input
              placeholder="Ej. Mascotas"
              maxLength={60}
              value={form.name}
              error={Boolean(error)}
              onChange={(e) => {
                setForm((c) => ({ ...c, name: e.target.value }))
                setError(undefined)
              }}
            />
          </Field>

          <Field label="Tipo">
            <Select
              value={form.type}
              onChange={(e) => setForm((c) => ({ ...c, type: e.target.value as CategoryType }))}
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </Select>
          </Field>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">Icono</span>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, icon: emoji }))}
                  className={cx(
                    'grid h-9 w-9 place-items-center rounded-lg border text-base transition-colors',
                    form.icon === emoji
                      ? 'border-primary bg-primary-light'
                      : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">Color</span>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={'Color ' + color}
                  onClick={() => setForm((c) => ({ ...c, color }))}
                  className={cx(
                    'h-8 w-8 rounded-full ring-offset-2 transition-all',
                    form.color === color ? 'ring-2 ring-ink' : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar categoria"
        message={
          toDelete
            ? 'Se eliminara "' +
              toDelete.name +
              '". Las transacciones que la usaban quedaran sin categoria.'
            : ''
        }
        loading={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
