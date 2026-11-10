import {
  BookOpen,
  LayoutDashboard,
  ListFilter,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface AppRoute {
  id: string
  path: string
  label: string
  description: string
  icon: LucideIcon
  section: 'Analitik' | 'Referensi'
  /** 'planned' routes render the honest placeholder page instead of a dashboard. */
  status: 'ready' | 'planned'
}

export const ROUTES: AppRoute[] = [
  {
    id: 'overview',
    path: '/',
    label: 'Ringkasan Eksekutif',
    description: 'Ringkasan performa penjualan, laba, segmen pelanggan, dan status pesanan.',
    icon: LayoutDashboard,
    section: 'Analitik',
    status: 'ready',
  },
  {
    id: 'sales',
    path: '/sales',
    label: 'Sales & Profitabilitas',
    description:
      'Tren penjualan dan profit bulanan-tahunan, perbandingan saluran, serta analisis diskon dan margin.',
    icon: TrendingUp,
    section: 'Analitik',
    status: 'ready',
  },
  {
    id: 'customers',
    path: '/customers',
    label: 'Customer Intelligence',
    description: 'Performa segmen, profit per pelanggan aktif, dan definisi pelanggan berulang.',
    icon: Users,
    section: 'Analitik',
    status: 'ready',
  },
  {
    id: 'transactions',
    path: '/transactions',
    label: 'Transaction Explorer',
    description: 'Anomali revenue tinggi margin rendah per dimensi.',
    icon: ListFilter,
    section: 'Analitik',
    status: 'ready',
  },
  {
    id: 'case-study',
    path: '/case-study',
    label: 'Studi Kasus',
    description: 'Latar belakang masalah, temuan kunci, dan rekomendasi bisnis berbasis data.',
    icon: BookOpen,
    section: 'Referensi',
    status: 'ready',
  },
]

export const DEFAULT_ROUTE = ROUTES[0]

export function matchRoute(pathname: string): AppRoute {
  const exact = ROUTES.find((route) => route.path === pathname)
  if (exact) return exact
  const prefix = ROUTES.filter((route) => route.path !== '/').find((route) =>
    pathname.startsWith(route.path),
  )
  return prefix ?? DEFAULT_ROUTE
}
