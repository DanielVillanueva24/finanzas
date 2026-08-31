import type { ReactNode } from 'react'
import { TrendingUp } from 'lucide-react'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Panel de marca, solo en escritorio */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-navy p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-lg font-bold text-white">
            F
          </div>
          <span className="text-lg font-semibold text-white">Finanzas</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Cada peso, en su lugar.
          </h2>
          <p className="mt-4 text-white/60">
            Registra ingresos y gastos, define presupuestos por categoria y mira a donde se te va
            el dinero mes con mes.
          </p>
          <div className="mt-10 space-y-3">
            {[
              ['Balance del mes siempre a la vista', '#2EC4B6'],
              ['Presupuestos con alertas al 80%', '#4361EE'],
              ['Reportes y exportacion a CSV', '#F72585'],
            ].map(([text, color]) => (
              <div key={text} className="flex items-center gap-3 text-sm text-white/75">
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                  style={{ backgroundColor: color + '26', color }}
                >
                  <TrendingUp size={15} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/35">Tus datos viven en tu propio servidor.</p>
      </div>

      {/* Formulario */}
      <div className="flex w-full items-center justify-center px-5 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-lg font-bold text-white">
              F
            </div>
            <span className="text-lg font-semibold text-ink">Finanzas</span>
          </div>

          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>

          <div className="mt-7">{children}</div>
          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
        </div>
      </div>
    </div>
  )
}
