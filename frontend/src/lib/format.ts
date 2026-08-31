const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** Formatea un monto como $1,234.56 */
export function formatCurrency(value: number, currency = '$'): string {
  const formatted = Math.abs(value).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return (value < 0 ? '-' : '') + currency + formatted
}

/** Version compacta para ejes de graficas: $1.2k */
export function formatCompact(value: number, currency = '$'): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1000000) return sign + currency + (abs / 1000000).toFixed(1) + 'M'
  if (abs >= 1000) return sign + currency + (abs / 1000).toFixed(1) + 'k'
  return sign + currency + abs.toFixed(0)
}

/** '2026-08-31' -> '31 ago 2026' */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return d + ' ' + MONTHS[m - 1].slice(0, 3).toLowerCase() + ' ' + y
}

/** '2026-08-31' -> 'lunes, 31 de agosto' */
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const weekday = date.toLocaleDateString('es-MX', { weekday: 'long' })
  return weekday + ', ' + d + ' de ' + MONTHS[m - 1].toLowerCase()
}

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? ''
}

export function todayISO(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return now.getFullYear() + '-' + mm + '-' + dd
}

export function monthRangeISO(year: number, month: number): { start: string; end: string } {
  const lastDay = new Date(year, month, 0).getDate()
  const mm = String(month).padStart(2, '0')
  return {
    start: year + '-' + mm + '-01',
    end: year + '-' + mm + '-' + String(lastDay).padStart(2, '0'),
  }
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/** Une clases condicionales sin dependencias externas. */
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
