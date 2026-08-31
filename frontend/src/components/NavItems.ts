import { ArrowLeftRight, LayoutDashboard, PieChart, Tags, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  short: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', short: 'Inicio', icon: LayoutDashboard },
  { to: '/transacciones', label: 'Transacciones', short: 'Movs.', icon: ArrowLeftRight },
  { to: '/presupuestos', label: 'Presupuestos', short: 'Metas', icon: Wallet },
  { to: '/categorias', label: 'Categorias', short: 'Categorias', icon: Tags },
  { to: '/reportes', label: 'Reportes', short: 'Reportes', icon: PieChart },
]
