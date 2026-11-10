import type { CombinedCubeRow, DashboardData, SegmentRow } from '@/data/types'
import {
  buildTrendPoints,
  groupCubeRows,
  periodRange,
  selectScopedRows,
  sharePct,
  type FilterState,
} from '@/lib/filter'
import { formatCount, formatPeriodLabel } from '@/lib/format'

/**
 * Customer-level helpers for the Customer Intelligence page.
 *
 * Scope rules (docs/DATA_CONTRACT.md §4.1-§4.2, definitions_version mvp-6):
 * - `customers` counts distinct `customer_id` and is NON-additive: it cannot be summed across
 *   months or combined across two dimensions. The processed payloads only support three valid
 *   denominators: (a) the whole dataset, (b) a single month (the month x dimension marginal
 *   cells, or the sum of the four segment cells for the same month - segments partition
 *   customers), and (c) one segment over the whole period (`segment-performance.json`).
 * - `orders`/`profit` always come from the combined cube (`selectScopedRows`), so the two
 *   per-customer ratios are ONE division between a summed measure and a validated customer
 *   count - the same operation the pipeline uses for `derived.orders_per_customer` and
 *   `profit_per_customer`. Monthly ratios are never averaged.
 * - Every other customer measure (`avg_transaction_margin_pct`, per-row discount statistics)
 *   stays whole-period and is labelled as such on the page.
 */

/** Where the active customer denominator comes from. */
export type CustomerDenominatorSource = 'dataset' | 'segment' | 'single-month' | 'unavailable'

export interface CustomerDenominator {
  /** Distinct customers for the active scope, or null when the scope cannot produce one. */
  value: number | null
  source: CustomerDenominatorSource
  /** Sentence shown under the KPI value: denominator provenance, or why it is unavailable. */
  note: string
}

export const CUSTOMER_UNAVAILABLE_NOTE =
  'Tidak tersedia untuk cakupan filter ini (pelanggan unik non-aditif).'

function unavailable(): CustomerDenominator {
  return { value: null, source: 'unavailable', note: CUSTOMER_UNAVAILABLE_NOTE }
}

/** A month x one-dimension cube, used only for single-month scopes. */
function singleMonthCell(
  data: DashboardData,
  filter: FilterState,
  period: string,
): { customers: number } | null {
  if (filter.segment !== null) {
    return (
      data.cubes.cubes.segment.find(
        (row) => row.period === period && row.segment === filter.segment,
      ) ?? null
    )
  }
  if (filter.salesChannel !== null) {
    return (
      data.cubes.cubes.sales_channel.find(
        (row) => row.period === period && row.sales_channel === filter.salesChannel,
      ) ?? null
    )
  }
  if (filter.orderStatus !== null) {
    return (
      data.cubes.cubes.order_status.find(
        (row) => row.period === period && row.order_status === filter.orderStatus,
      ) ?? null
    )
  }
  return null
}

/**
 * Distinct-customer denominator for the active global filter.
 *
 * Valid scopes: whole dataset, one segment over the whole period, or a single month with at most
 * one dimension filter. Anything spanning more than one month (or two dimensions at once) is
 * reported as unavailable instead of showing a non-additive number.
 */
export function resolveCustomerDenominator(
  data: DashboardData,
  filter: FilterState,
): CustomerDenominator {
  const { totals, date_min, date_max } = data.summary
  const years = `${date_min.slice(0, 4)}-${date_max.slice(0, 4)}`
  const dimensions = [filter.segment, filter.salesChannel, filter.orderStatus].filter(
    (value) => value !== null,
  )
  const singleMonth = filter.from !== null && filter.from === filter.to
  const range = periodRange(data)
  const fullPeriod =
    (!filter.from && !filter.to) || (filter.from === range.min && filter.to === range.max)

  if (singleMonth) {
    const period = filter.from as string
    if (dimensions.length === 0) {
      // Segments partition customers (one segment per customer), so the four monthly cells sum
      // back to the distinct customers of that month.
      const value = data.cubes.cubes.segment
        .filter((row) => row.period === period)
        .reduce((sum, row) => sum + row.customers, 0)
      if (value === 0) return unavailable()
      return {
        value,
        source: 'single-month',
        note: `Penyebut: ${formatCount(value)} pelanggan unik pada ${formatPeriodLabel(period)} (jumlah 4 sel segmen bulan itu).`,
      }
    }
    if (dimensions.length === 1) {
      const cell = singleMonthCell(data, filter, period)
      if (cell === null) return unavailable()
      return {
        value: cell.customers,
        source: 'single-month',
        note: `Penyebut: ${formatCount(cell.customers)} pelanggan unik pada ${formatPeriodLabel(period)} untuk filter yang aktif.`,
      }
    }
    return unavailable()
  }

  if (fullPeriod && dimensions.length === 0) {
    return {
      value: totals.customers_active,
      source: 'dataset',
      note: `Penyebut: ${formatCount(totals.customers_active)} pelanggan unik ${years}.`,
    }
  }

  if (fullPeriod && dimensions.length === 1 && filter.segment !== null) {
    const row = data.segments.segments.find((segment) => segment.segment === filter.segment)
    if (!row) return unavailable()
    return {
      value: row.customers,
      source: 'segment',
      note: `Penyebut: ${formatCount(row.customers)} pelanggan unik segmen ${row.segment} sepanjang ${years}.`,
    }
  }

  return unavailable()
}

export interface CustomerRateValues {
  ordersPerCustomer: number | null
  profitPerCustomer: number | null
}

/**
 * The two per-customer ratios of the KPI row. Each is ONE division between a summed measure
 * (scoped combined cube) and the validated customer count; null when no denominator exists.
 */
export function customerRates(
  totals: { orders: number; profit: number },
  denominator: CustomerDenominator,
): CustomerRateValues {
  if (denominator.value === null || denominator.value === 0) {
    return { ordersPerCustomer: null, profitPerCustomer: null }
  }
  return {
    ordersPerCustomer: totals.orders / denominator.value,
    profitPerCustomer: totals.profit / denominator.value,
  }
}

export interface MonthlyCustomerPoint {
  period: string
  customers: number
  orders: number
  profit: number
  ordersPerCustomer: number
  profitPerCustomer: number
}

/**
 * Monthly customer series for the KPI trend indicator, limited to scopes where the customer
 * denominator is validated: the whole dataset (segments partition customers) or one segment over
 * the whole period. Each month is a distinct-customer count, never a sum across months.
 */
export function buildMonthlyCustomerPoints(
  data: DashboardData,
  filter: FilterState,
  denominator: CustomerDenominator,
): MonthlyCustomerPoint[] {
  const customersByPeriod = new Map<string, number>()

  if (denominator.source === 'dataset') {
    for (const row of data.cubes.cubes.segment) {
      customersByPeriod.set(row.period, (customersByPeriod.get(row.period) ?? 0) + row.customers)
    }
  } else if (denominator.source === 'segment' && filter.segment !== null) {
    for (const row of data.cubes.cubes.segment) {
      if (row.segment === filter.segment) customersByPeriod.set(row.period, row.customers)
    }
  } else {
    return []
  }

  const measures = new Map(
    buildTrendPoints(selectScopedRows(data, filter), null).map((point) => [point.period, point]),
  )

  return [...customersByPeriod.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .flatMap(([period, customers]) => {
      const measure = measures.get(period)
      if (!measure || customers === 0) return []
      return [
        {
          period,
          customers,
          orders: measure.orders,
          profit: measure.profit,
          ordersPerCustomer: measure.orders / customers,
          profitPerCustomer: measure.profit / customers,
        },
      ]
    })
}

export interface SegmentDistributionPoint {
  segment: string
  orders: number
  netSales: number
  profit: number
  marginPct: number | null
  /** Display share of the segment inside the scoped net sales: sum(part) / sum(total). */
  netSalesSharePct: number
  /** Display share of the segment inside the scoped profit: sum(part) / sum(total). */
  profitSharePct: number
}

/** Filter-aware segment composition: plain sums per segment plus display shares. */
export function buildSegmentDistribution(rows: CombinedCubeRow[]): SegmentDistributionPoint[] {
  const groups = groupCubeRows(rows, 'segment')
  const totalNetSales = groups.reduce((sum, group) => sum + group.netSales, 0)
  const totalProfit = groups.reduce((sum, group) => sum + group.profit, 0)
  return groups
    .map((group) => ({
      segment: group.value,
      orders: group.orders,
      netSales: group.netSales,
      profit: group.profit,
      marginPct: group.marginPct,
      netSalesSharePct: sharePct(group.netSales, totalNetSales),
      profitSharePct: sharePct(group.profit, totalProfit),
    }))
    .sort((left, right) => right.netSales - left.netSales)
}

export type SegmentSortKey =
  | 'segment'
  | 'customers'
  | 'orders'
  | 'net_sales'
  | 'profit'
  | 'aggregate_margin_pct'
  | 'profit_per_customer'
  | 'orders_per_customer'
  | 'avg_discount_rate_row_mean_pct'

export type SortDirection = 'asc' | 'desc'

export interface SegmentSort {
  key: SegmentSortKey
  direction: SortDirection
}

/** First click on a column sorts descending (numbers) or ascending (segment names). */
export function nextSort(current: SegmentSort, key: SegmentSortKey): SegmentSort {
  if (current.key === key) {
    return { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
  }
  return { key, direction: key === 'segment' ? 'asc' : 'desc' }
}

/** Sortable copy of the whole-period segment profile (payload values, no recomputation). */
export function sortSegmentRows(
  rows: SegmentRow[],
  key: SegmentSortKey,
  direction: SortDirection,
): SegmentRow[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => {
    const a = left[key]
    const b = right[key]
    if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'id') * factor
    return (Number(a) - Number(b)) * factor
  })
}
