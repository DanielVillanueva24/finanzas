import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Receipt, Scale, Wallet } from 'lucide-react'
import { errorMessage } from '../api/client'
import { reportsApi, transactionsApi } from '../api/endpoints'
import { CategoryDonut, MonthlyBars } from '../components/charts'
import { StatCard } from '../components/StatCard'
import { TransactionRow } from '../components/TransactionRow'
import { Card, CardTitle, EmptyState, Skeleton, SkeletonCard } from '../components/ui'
import { useMonth } from '../hooks/useMonth'
import { useRefresh } from '../hooks/useRefresh'
import { useToast } from '../hooks/useToast'
import { formatCurrency, monthName } from '../lib/format'
import type { CategoryTotal, MonthPoint, Summary, Transaction } from '../types'

export default function Dashboard() {
  const { year, month, start, end } = useMonth()
  const { version } = useRefresh()
  const toast = useToast()

  const [summary, setSummary] = useState<Summary | null>(null)
  const [byCategory, setByCategory] = useState<CategoryTotal[]>([])
  const [history, setHistory] = useState<MonthPoint[]>([])
  const [recent, setRecent] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      reportsApi.summary({ start, end }),
      reportsApi.byCategory({ start, end, type: 'expense' }),
      reportsApi.balanceHistory(6),
      transactionsApi.list({ page: 1, limit: 5 }),
    ])
      .then(([summaryData, categoryData, historyData, page]) => {
        if (!active) return
        setSummary(summaryData)
        setByCategory(categoryData)
        setHistory(historyData)
        setRecent(page.items)
      })
      .catch((error) => active && toast.error(errorMessage(error, 'No se pudo cargar el resumen')))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, version])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-card" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    )
  }

  const net = summary?.net ?? 0
  const positive = net >= 0

  return (
    <div className="space-y-4">
      {/* Balance del mes */}
      <section className="rounded-card bg-navy p-5 text-white shadow-card sm:p-6">
        <p className="text-xs uppercase tracking-wide text-white/50">
          Balance de {monthName(month)} {year}
        </p>
        <p className="mt-1.5 text-3xl font-bold tabular-nums sm:text-4xl">{formatCurrency(net)}</p>
        <p className="mt-2 text-sm text-white/60">
          {positive
            ? 'Vas en positivo este mes, sigue asi.'
            : 'Este mes gastaste mas de lo que ingresaste.'}
          {summary ? ' ' + summary.transactions + ' movimientos registrados.' : ''}
        </p>
      </section>

      {/* Tarjetas resumen */}
      <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Ingresos del mes"
          value={summary?.income ?? 0}
          tone="income"
          icon={<ArrowUpRight size={16} />}
        />
        <StatCard
          label="Gastos del mes"
          value={summary?.expense ?? 0}
          tone="expense"
          icon={<ArrowDownLeft size={16} />}
        />
        <StatCard
          label="Saldo neto"
          value={net}
          tone="neutral"
          icon={<Scale size={16} />}
          hint={'Promedio diario de gasto: ' + formatCurrency(summary?.avg_daily_expense ?? 0)}
        />
      </section>

      {/* Graficas */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Ingresos vs gastos (6 meses)</CardTitle>
          <MonthlyBars data={history} />
        </Card>

        <Card>
          <CardTitle>Gastos por categoria</CardTitle>
          {byCategory.length > 0 ? (
            <CategoryDonut data={byCategory} />
          ) : (
            <EmptyState
              icon={<Wallet size={22} />}
              title="Sin gastos este mes"
              description="Cuando registres un gasto veras aqui como se reparte."
            />
          )}
        </Card>
      </section>

      {/* Ultimas transacciones */}
      <Card>
        <CardTitle
          action={
            <Link to="/transacciones" className="text-xs font-semibold text-primary hover:underline">
              Ver todas
            </Link>
          }
        >
          Ultimos movimientos
        </CardTitle>
        {recent.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {recent.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Receipt size={22} />}
            title="Aun no hay movimientos"
            description="Usa el boton + para registrar tu primer ingreso o gasto."
          />
        )}
      </Card>
    </div>
  )
}
