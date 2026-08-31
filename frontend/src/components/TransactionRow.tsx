import { ArrowLeftRight, Pencil, Trash2 } from 'lucide-react'
import { cx, formatCurrency, formatDate } from '../lib/format'
import type { Transaction } from '../types'

const SIGN: Record<Transaction['type'], string> = {
  income: '+',
  expense: '-',
  transfer: '',
}

const AMOUNT_COLOR: Record<Transaction['type'], string> = {
  income: 'text-income',
  expense: 'text-expense',
  transfer: 'text-muted',
}

interface Props {
  transaction: Transaction
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
}

export function TransactionRow({ transaction, onEdit, onDelete }: Props) {
  const { category, type, amount, description, date, note } = transaction
  const color = category?.color ?? '#8D99AE'

  return (
    <li className="group flex items-center gap-3 px-1 py-3">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base"
        style={{ backgroundColor: color + '1F', color }}
        aria-hidden
      >
        {category ? category.icon : <ArrowLeftRight size={17} />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{description}</p>
        <p className="truncate text-xs text-muted">
          {category?.name ?? 'Sin categoria'} · {formatDate(date)}
          {note ? ' · ' + note : ''}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <span className={cx('whitespace-nowrap text-sm font-bold tabular-nums', AMOUNT_COLOR[type])}>
          {SIGN[type]}
          {formatCurrency(amount)}
        </span>

        {(onEdit || onDelete) && (
          <div className="flex opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(transaction)}
                aria-label={'Editar ' + description}
                className="rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-primary"
              >
                <Pencil size={15} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(transaction)}
                aria-label={'Eliminar ' + description}
                className="rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-expense"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
