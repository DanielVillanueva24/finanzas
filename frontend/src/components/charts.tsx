import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { formatCompact, formatCurrency } from '../lib/format'
import type { CategoryTotal, MonthPoint } from '../types'

const GRID = '#ECEFF3'
const AXIS = '#8D99AE'
const INCOME = '#2EC4B6'
const EXPENSE = '#E63946'
const PRIMARY = '#4361EE'

const AXIS_TICK = { fill: AXIS, fontSize: 11 }

/** Tooltip compartido: fondo blanco, sombra suave y montos ya formateados. */
function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-pop">
      {label && <p className="mb-1 text-xs font-semibold text-ink">{label}</p>}
      {payload.map((entry) => (
        <p key={String(entry.name)} className="flex items-center gap-2 text-xs text-muted">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.name}</span>
          <span className="ml-auto font-semibold text-ink">
            {formatCurrency(Number(entry.value ?? 0))}
          </span>
        </p>
      ))}
    </div>
  )
}

/** Leyenda en HTML: la identidad nunca depende solo del color. */
function Legend({ items }: { items: Array<{ label: string; color: string; value?: string }> }) {
  return (
    <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[3px]"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-medium text-ink">{item.label}</span>
          {item.value && <span>{item.value}</span>}
        </li>
      ))}
    </ul>
  )
}

/** Ingresos vs gastos por mes. */
export function MonthlyBars({ data }: { data: MonthPoint[] }) {
  return (
    <div>
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -14 }} barGap={2}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={58}
              tickFormatter={(value: number) => formatCompact(value)}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(67,97,238,0.06)' }} />
            <Bar dataKey="income" name="Ingresos" fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={26} />
            <Bar dataKey="expense" name="Gastos" fill={EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={[
          { label: 'Ingresos', color: INCOME },
          { label: 'Gastos', color: EXPENSE },
        ]}
      />
    </div>
  )
}

/** Distribucion de gastos por categoria. */
export function CategoryDonut({ data }: { data: CategoryTotal[] }) {
  const top = data.slice(0, 8)
  const rest = data.slice(8)
  const slices =
    rest.length > 0
      ? [
          ...top,
          {
            category_id: null,
            name: 'Otras',
            icon: '',
            color: '#8D99AE',
            type: 'expense' as const,
            total: rest.reduce((sum, item) => sum + item.total, 0),
            percentage: rest.reduce((sum, item) => sum + item.percentage, 0),
            count: rest.length,
          },
        ]
      : top

  return (
    <div>
      <div className="h-52 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="84%"
              paddingAngle={2}
              stroke="#FFFFFF"
              strokeWidth={2}
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={slices.map((slice) => ({
          label: slice.name,
          color: slice.color,
          value: slice.percentage.toFixed(0) + '%',
        }))}
      />
    </div>
  )
}

/** Evolucion del saldo acumulado. */
export function BalanceLine({ data }: { data: MonthPoint[] }) {
  return (
    <div className="h-60 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={58}
            tickFormatter={(value: number) => formatCompact(value)}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: AXIS, strokeDasharray: '4 4', strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            name="Saldo acumulado"
            stroke={PRIMARY}
            strokeWidth={2}
            dot={{ r: 3, fill: PRIMARY, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: PRIMARY, stroke: '#FFFFFF', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
