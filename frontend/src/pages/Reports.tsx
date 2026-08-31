import { useEffect, useState } from 'react'
import { Download, PieChart as PieIcon } from 'lucide-react'
import { errorMessage } from '../api/client'
import { reportsApi } from '../api/endpoints'
import { BalanceLine } from '../components/charts'
import { StatCard } from '../components/StatCard'
import { Button, Card, CardTitle, EmptyState, Field, Input, Skeleton } from '../components/ui'
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react'
import { useRefresh } from '../hooks/useRefresh'
import { useToast } from '../hooks/useToast'
import { cx, formatCurrency, formatDate, todayISO } from '../lib/format'
import type { CategoryTotal, MonthPoint, Period, Summary } from '../types'

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Ano' },
]

function defaultRange(period: Period): { start: string; end: string } {
  const today = new Date()
  const iso = (date: Date) =>
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')

  if (period === 'week') {
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { start: iso(monday), end: iso(sunday) }
  }
  if (period === 'year') {
    return { start: today.getFullYear() + '-01-01', end: today.getFullYear() + '-12-31' }
  }
  const first = new Date(today.getFullYear(), today.getMonth(), 1)
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return { start: iso(first), end: iso(last) }
}

export default function Reports() {
  const { version } = useRefresh()
  const toast = useToast()

  const [period, setPeriod] = useState<Period>('month')
  const [range, setRange] = useState(() => defaultRange('month'))
  const [summary, setSummary] = useState<Summary | null>(null)
  const [expenses, setExpenses] = useState<CategoryTotal[]>([])
  const [incomes, setIncomes] = useState<CategoryTotal[]>([])
  const [history, setHistory] = useState<MonthPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const applyPeriod = (next: Period) => {
    setPeriod(next)
    setRange(defaultRange(next))
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      reportsApi.summary(range),
      reportsApi.byCategory({ ...range, type: 'expense' }),
      reportsApi.byCategory({ ...range, type: 'income' }),
      reportsApi.balanceHistory(12),
    ])
      .then(([summaryData, expenseData, incomeData, historyData]) => {
        if (!active) return
        setSummary(summaryData)
        setExpenses(expenseData)
        setIncomes(incomeData)
        setHistory(historyData)
      })
      .catch((error) => active && toast.error(errorMessage(error, 'No se pudo cargar el reporte')))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, version])

  const downloadCsv = async () => {
    setDownloading(true)
    try {
      const blob = await reportsApi.exportCsv(range)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'finanzas_' + range.start + '_' + range.end + '.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('CSV descargado')
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo exportar el CSV'))
    } finally {
      setDownloading(false)
    }
  }

  const renderTable = (title: string, rows: CategoryTotal[], tone: string) => (
    <Card padded={false}>
      <div className="px-4 pt-4 sm:px-5">
        <CardTitle>{title}</CardTitle>
      </div>
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-medium sm:px-5">Categoria</th>
                <th className="px-4 py-2 text-right font-medium">Movs.</th>
                <th className="px-4 py-2 text-right font-medium">%</th>
                <th className="px-4 py-2 text-right font-medium sm:px-5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={String(row.category_id) + row.name}>
                  <td className="px-4 py-2.5 sm:px-5">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                        style={{ backgroundColor: row.color }}
                        aria-hidden
                      />
                      <span className="font-medium text-ink">
                        {row.icon} {row.name}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{row.count}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                    {row.percentage.toFixed(1)}%
                  </td>
                  <td className={cx('px-4 py-2.5 text-right font-semibold tabular-nums sm:px-5', tone)}>
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<PieIcon size={22} />} title="Sin datos en este periodo" />
      )}
    </Card>
  )

  return (
    <div className="space-y-4">
      {/* Controles */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
            {PERIODS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => applyPeriod(option.value)}
                className={cx(
                  'rounded-[7px] px-4 py-1.5 text-sm font-semibold transition-colors',
                  period === option.value ? 'bg-primary text-white' : 'text-muted hover:text-ink',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={downloadCsv}
            loading={downloading}
            icon={<Download size={16} />}
          >
            Exportar CSV
          </Button>
        </div>

        <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
          <Field label="Desde">
            <Input
              type="date"
              max={range.end}
              value={range.start}
              onChange={(e) => setRange((c) => ({ ...c, start: e.target.value || todayISO() }))}
            />
          </Field>
          <Field label="Hasta">
            <Input
              type="date"
              min={range.start}
              value={range.end}
              onChange={(e) => setRange((c) => ({ ...c, end: e.target.value || todayISO() }))}
            />
          </Field>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-card" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-56 rounded-card" />
        </div>
      ) : (
        <>
          <p className="px-1 text-xs text-muted">
            Periodo analizado: {formatDate(range.start)} al {formatDate(range.end)} ·{' '}
            {summary?.transactions ?? 0} movimientos
          </p>

          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Ingresos"
              value={summary?.income ?? 0}
              tone="income"
              icon={<ArrowUpRight size={16} />}
            />
            <StatCard
              label="Gastos"
              value={summary?.expense ?? 0}
              tone="expense"
              icon={<ArrowDownLeft size={16} />}
            />
            <StatCard
              label="Saldo del periodo"
              value={summary?.net ?? 0}
              tone="neutral"
              icon={<Scale size={16} />}
            />
          </section>

          <Card>
            <CardTitle>Evolucion del saldo acumulado (12 meses)</CardTitle>
            <BalanceLine data={history} />
          </Card>

          {renderTable('Gastos por categoria', expenses, 'text-expense')}
          {renderTable('Ingresos por categoria', incomes, 'text-income')}
        </>
      )}
    </div>
  )
}
