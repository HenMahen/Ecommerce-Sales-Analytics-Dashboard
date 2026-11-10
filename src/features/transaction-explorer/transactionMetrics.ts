import type { AnomalyByDimension, AnomalyDimensionRow, CombinedCubeRow } from '@/data/types'
import { sharePct, type CubeGroup } from '@/lib/filter'

/**
 * Transaction Explorer (agregat) helpers.
 *
 * Scope rules (docs/DATA_CONTRACT.md §3.7, docs/PRD.md §5.4):
 * - The anomaly rule uses GLOBAL quartile thresholds (net sales >= $1.552,32 AND margin <=
 *   34,12%, inclusive). They are never recomputed per subset, so every anomaly number is a
 *   whole-period payload value and never follows the global filter.
 * - The only display math on top of the payload is one division between a category count and a
 *   summed total (display share), the same operation used on the other pages.
 * - Status and delivery rows aggregate cube rows (sums + weighted margin), so those tables do
 *   follow the active filters; delivery uses the period-only panel cube.
 */

export type AnomalyDimensionKey = keyof AnomalyByDimension['dimensions']

export interface AnomalyDimensionOption {
  key: AnomalyDimensionKey
  /** Toggle and footnote label; the table column header stays generic ("Kategori"). */
  label: string
}

export const ANOMALY_DIMENSIONS: AnomalyDimensionOption[] = [
  { key: 'sales_channel', label: 'Sales Channel' },
  { key: 'region', label: 'Region' },
  { key: 'marketing_channel', label: 'Marketing Channel' },
]

export interface AnomalyDisplayRow extends AnomalyDimensionRow {
  /** Share of this category inside the payload anomaly total: sum(part) / sum(total). */
  sharePct: number
}

/** Payload rows plus the display share; no metric is recomputed. */
export function buildAnomalyRows(
  rows: AnomalyDimensionRow[],
  totalAnomalies: number,
): AnomalyDisplayRow[] {
  return rows.map((row) => ({ ...row, sharePct: sharePct(row.anomalies, totalAnomalies) }))
}

export interface RateRange {
  min: number
  max: number
}

/** Narrow anomaly-rate band of one dimension, used in the panel footnote. */
export function anomalyRateRange(rows: AnomalyDisplayRow[]): RateRange | null {
  if (rows.length === 0) return null
  const rates = rows.map((row) => row.anomaly_rate_pct)
  return { min: Math.min(...rates), max: Math.max(...rates) }
}

export type SortDirection = 'asc' | 'desc'

export interface SortState<K extends string> {
  key: K
  direction: SortDirection
}

/**
 * Same interaction as the other tables: clicking the active column flips the direction, a new
 * numeric column starts descending, and a new name column starts ascending.
 */
export function nextSort<K extends string>(
  current: SortState<K> | null,
  key: K,
  firstDirection: SortDirection = 'desc',
): SortState<K> {
  if (current !== null && current.key === key) {
    return { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
  }
  return { key, direction: firstDirection }
}

export type AnomalySortKey = 'value' | 'orders' | 'anomalies' | 'anomaly_rate_pct'

/** Sortable copy of the anomaly dimension table; null keeps the payload order (rate desc). */
export function sortAnomalyRows(
  rows: AnomalyDisplayRow[],
  sort: SortState<AnomalySortKey> | null,
): AnomalyDisplayRow[] {
  if (sort === null) return rows
  const factor = sort.direction === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => {
    if (sort.key === 'value') return left.value.localeCompare(right.value, 'id') * factor
    return (left[sort.key] - right[sort.key]) * factor
  })
}

/** Documented presentation order of the order statuses. */
export const ORDER_STATUS_ORDER = ['Completed', 'Pending', 'Returned', 'Cancelled']

export interface StatusDisplayRow {
  status: string
  orders: number
  netSales: number
  profit: number
  marginPct: number | null
  /** Share of orders inside the scoped total: sum(part) / sum(total). */
  sharePct: number
}

/** Scoped status rows from the combined cube (sums + weighted margin), documented order. */
export function buildStatusRows(groups: CubeGroup[]): StatusDisplayRow[] {
  const totalOrders = groups.reduce((sum, group) => sum + group.orders, 0)
  return groups
    .map((group) => ({
      status: group.value,
      orders: group.orders,
      netSales: group.netSales,
      profit: group.profit,
      marginPct: group.marginPct,
      sharePct: sharePct(group.orders, totalOrders),
    }))
    .sort(
      (left, right) =>
        ORDER_STATUS_ORDER.indexOf(left.status) - ORDER_STATUS_ORDER.indexOf(right.status),
    )
}

export interface MonthlyStatusRatePoint {
  period: string
  orders: number
  returnRatePct: number
  undeliveredRatePct: number
}

/**
 * Monthly return and undelivered rates from the combined cube. The whole-period KPI cards read the
 * summary payload; this series only supplies the month-over-month indicator for those cards.
 */
export function buildMonthlyStatusRates(rows: CombinedCubeRow[]): MonthlyStatusRatePoint[] {
  const buckets = new Map<string, { orders: number; returned: number; undelivered: number }>()
  for (const row of rows) {
    const bucket = buckets.get(row.period) ?? { orders: 0, returned: 0, undelivered: 0 }
    bucket.orders += row.orders
    if (row.order_status === 'Returned') bucket.returned += row.orders
    if (
      row.order_status === 'Cancelled' ||
      row.order_status === 'Pending' ||
      row.order_status === 'Returned'
    ) {
      bucket.undelivered += row.orders
    }
    buckets.set(row.period, bucket)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([period, bucket]) => ({
      period,
      orders: bucket.orders,
      returnRatePct: bucket.orders === 0 ? 0 : (bucket.returned / bucket.orders) * 100,
      undeliveredRatePct: bucket.orders === 0 ? 0 : (bucket.undelivered / bucket.orders) * 100,
    }))
}

export type StatusSortKey = 'status' | 'orders' | 'sharePct' | 'netSales' | 'profit' | 'marginPct'

/** Sortable copy of the status table; null keeps the documented status order. */
export function sortStatusRows(
  rows: StatusDisplayRow[],
  sort: SortState<StatusSortKey> | null,
): StatusDisplayRow[] {
  if (sort === null) return rows
  const factor = sort.direction === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => {
    if (sort.key === 'status') return left.status.localeCompare(right.status, 'id') * factor
    const a = left[sort.key]
    const b = right[sort.key]
    return (Number(a ?? Number.NEGATIVE_INFINITY) - Number(b ?? Number.NEGATIVE_INFINITY)) * factor
  })
}

/**
 * `delivery_status` values carry two colliding names. "Cancelled" here means the order was never
 * shipped and is displayed as "Tidak Dikirim" (PRD §5.4 acceptance criterion), never as a
 * cancelled purchase.
 */
export function deliveryStatusLabel(value: string): string {
  return value === 'Cancelled' ? 'Tidak Dikirim' : value
}

export interface DeliveryDisplayRow {
  value: string
  label: string
  orders: number
  /** Share of orders inside the period scope: sum(part) / sum(total). */
  sharePct: number
}

/** Period-scoped delivery mix, largest volume first. */
export function buildDeliveryRows(groups: CubeGroup[]): DeliveryDisplayRow[] {
  const totalOrders = groups.reduce((sum, group) => sum + group.orders, 0)
  return groups
    .map((group) => ({
      value: group.value,
      label: deliveryStatusLabel(group.value),
      orders: group.orders,
      sharePct: sharePct(group.orders, totalOrders),
    }))
    .sort((left, right) => right.orders - left.orders)
}
