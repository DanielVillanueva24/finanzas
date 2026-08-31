import type { ReactNode } from 'react'
import { cx, formatCurrency } from '../lib/format'

interface Props {
  label: string
  value: number
  icon: ReactNode
  tone: 'income' | 'expense' | 'neutral'
  hint?: string
}

const TONES = {
  income: { text: 'text-income', chip: 'bg-income/10 text-income' },
  expense: { text: 'text-expense', chip: 'bg-expense/10 text-expense' },
  neutral: { text: 'text-ink', chip: 'bg-primary-light text-primary' },
}

export function StatCard({ label, value, icon, tone, hint }: Props) {
  const styles = TONES[tone]
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        <span className={cx('grid h-8 w-8 place-items-center rounded-lg', styles.chip)}>{icon}</span>
      </div>
      <p className={cx('text-xl font-bold tabular-nums sm:text-2xl', styles.text)}>
        {formatCurrency(value)}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}
