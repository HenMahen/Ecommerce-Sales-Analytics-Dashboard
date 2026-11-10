import type {
  CombinedCubeRow,
  DashboardData,
  DiscountBracketCubeRow,
  DiscountMeasures,
  MonthRow,
  PanelCubeKey,
  PeriodRow,
} from '@/data/types'
import { formatPeriodLabel } from '@/lib/format'

/**
 * Global filter state and the aggregation that turns scoped cube rows into display values.
 *
 * Rules (docs/DATA_CONTRACT.md §4.1-§4.2, definitions_version mvp-6):
 * - Additive measures (`orders`, `net_sales`, `profit`, `gross_sales`, `discount_amount`) are
 *   summed.
 * - Ratios are always recomputed from the summed subset: weighted margin `sum(profit) /
 *   sum(net_sales) * 100`, weighted discount rate `sum(discount) / sum(gross) * 100`, profit per
 *   order `sum(profit) / sum(orders)`, and display shares `sum(part) / sum(total) * 100`.
 * - Year-over-year change reuses the pipeline formula on two summed buckets:
 *   `(current - previous) / previous * 100`, shown only when both years are complete in scope.
 * - All four combinable filters (month range, customer segment, sales channel, order status) read
 *   the `combined` cube, so every combination is a plain sum of compatible rows.
 * - Non-additive measures (`customers`, `avg_transaction_margin_pct`) are NOT carried by the
 *   combined cube. Panels that need them stay whole-period and never react to the filter.
 * - Panel cubes (`day_type`, `delivery_status`, `discount_bracket`, `region`) follow the period
 *   range only. They cannot be combined with a dimension filter; panels that cannot follow the
 *   active filter are hidden instead of showing unfiltered numbers.
 */

export type DimensionKey = 'segment' | 'salesChannel' | 'orderStatus'

/** Presentation order of the dimension filters (channel labels, chips, scope text). */
export const DIMENSION_KEYS: readonly DimensionKey[] = ['segment', 'salesChannel', 'orderStatus']

export interface FilterState {
  from: string | null
  to: string | null
  segment: string | null
  salesChannel: string | null
  orderStatus: string | null
}

export const DEFAULT_FILTER: FilterState = {
  from: null,
  to: null,
  segment: null,
  salesChannel: null,
  orderStatus: null,
}

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  segment: 'Segmen pelanggan',
  salesChannel: 'Sales channel',
  orderStatus: 'Status order',
}

/** Column of the `combined` cube that carries each dimension value. */
const DIMENSION_ROW_KEYS: Record<DimensionKey, 'segment' | 'sales_channel' | 'order_status'> = {
  segment: 'segment',
  salesChannel: 'sales_channel',
  orderStatus: 'order_status',
}

const PREFERRED_ORDER: Record<DimensionKey, string[]> = {
  segment: ['VIP', 'Premium', 'Consumer', 'Business'],
  salesChannel: ['Marketplace', 'Website', 'Mobile App', 'Social Media'],
  orderStatus: ['Completed', 'Pending', 'Returned', 'Cancelled'],
}

export interface Option {
  value: string
  label: string
  /** Rendered as a non-selectable entry (used for the derived "custom range" state). */
  disabled?: boolean
  /** Kept mounted but visually hidden, so a selected value never disappears from the list. */
  hidden?: boolean
}

export function isFilterActive(filter: FilterState): boolean {
  return (
    filter.from !== null ||
    filter.to !== null ||
    filter.segment !== null ||
    filter.salesChannel !== null ||
    filter.orderStatus !== null
  )
}

export function isDimensionFiltered(filter: FilterState): boolean {
  return filter.segment !== null || filter.salesChannel !== null || filter.orderStatus !== null
}

/** True when a month range is active (period-only panels and cubes can be restricted to it). */
export function isPeriodFiltered(filter: FilterState): boolean {
  return Boolean(filter.from || filter.to)
}

export function activeFilterCount(filter: FilterState): number {
  let count = 0
  if (filter.from || filter.to) count += 1
  for (const dimension of DIMENSION_KEYS) if (filter[dimension]) count += 1
  return count
}

export function periodRange(data: DashboardData): { min: string; max: string } {
  const periods = data.monthly.months_by_year.map((row) => row.period)
  return { min: periods[0], max: periods[periods.length - 1] }
}

export function buildPeriodOptions(data: DashboardData): Option[] {
  return data.monthly.months_by_year.map((row) => ({
    value: row.period,
    label: formatPeriodLabel(row.period),
  }))
}

/** Years present in the dataset, in calendar order. */
export function buildYearOptions(data: DashboardData): Option[] {
  const years = [...new Set(data.monthly.months_by_year.map((row) => row.period.slice(0, 4)))]
  return years.map((year) => ({ value: year, label: year }))
}

/**
 * Year of the active month range when it covers exactly one calendar year, otherwise null.
 * The year selector is derived from the range, never stored twice, so the two controls cannot
 * contradict each other.
 */
export function rangeYear(filter: FilterState): string | null {
  if (!filter.from || !filter.to) return null
  const year = filter.from.slice(0, 4)
  return filter.from === `${year}-01` && filter.to === `${year}-12` ? year : null
}

export function buildDimensionOptions(data: DashboardData, dimension: DimensionKey): Option[] {
  const key = DIMENSION_ROW_KEYS[dimension]
  const rows = data.cubes.cubes[key] as unknown as Array<Record<string, unknown>>
  const values = new Set<string>()
  for (const row of rows) values.add(String(row[key]))
  const preferred = PREFERRED_ORDER[dimension]
  return [...values]
    .sort((a, b) => preferred.indexOf(a) - preferred.indexOf(b))
    .map((value) => ({ value, label: value }))
}

function withinPeriod(period: string, from: string | null, to: string | null): boolean {
  if (from && period < from) return false
  if (to && period > to) return false
  return true
}

/**
 * Combined-cube rows inside the active scope (month range + the three dimension filters).
 * This is the single source for every filter-aware panel: KPI, trends, composition, status table.
 */
export function selectScopedRows(data: DashboardData, filter: FilterState): CombinedCubeRow[] {
  const rows = data.cubes.cubes.combined
  return rows.filter((row) => {
    if (!withinPeriod(row.period, filter.from, filter.to)) return false
    if (filter.segment !== null && row.segment !== filter.segment) return false
    if (filter.salesChannel !== null && row.sales_channel !== filter.salesChannel) return false
    if (filter.orderStatus !== null && row.order_status !== filter.orderStatus) return false
    return true
  })
}

/**
 * Rows of one period-only panel cube inside the active month range. The dimension filters are
 * deliberately NOT applied: this is only valid for panels that do not react to a dimension
 * filter. When a dimension filter is active those panels are hidden, never shown unfiltered.
 */
export function selectCubeRows(
  data: DashboardData,
  key: PanelCubeKey,
  filter: FilterState,
): Array<PeriodRow & Record<string, unknown>> {
  const rows = data.cubes.cubes[key] as unknown as Array<PeriodRow & Record<string, unknown>>
  return rows.filter((row) => withinPeriod(row.period, filter.from, filter.to))
}

export interface Aggregate {
  orders: number
  netSales: number
  profit: number
  /** Weighted aggregate margin, or null when there is no revenue to divide by. */
  marginPct: number | null
}

export function aggregate(rows: PeriodRow[]): Aggregate {
  let orders = 0
  let netSales = 0
  let profit = 0
  for (const row of rows) {
    orders += row.orders
    netSales += row.net_sales
    profit += row.profit
  }
  return {
    orders,
    netSales,
    profit,
    marginPct: netSales === 0 ? null : (profit / netSales) * 100,
  }
}

export interface FinancialAggregate extends Aggregate {
  grossSales: number
  discountAmount: number
  /**
   * Weighted discount rate `sum(discount) / sum(gross) * 100`
   * (docs/METRIC_DICTIONARY.md §4.1). Denominator is summed gross sales, not the order count -
   * the row-level averages live in the whole-period statistics and never follow the filter.
   */
  weightedDiscountPct: number | null
}

/** Sums the additive discount-side measures of scoped rows on top of `aggregate`. */
export function aggregateFinancials(rows: Array<PeriodRow & DiscountMeasures>): FinancialAggregate {
  let grossSales = 0
  let discountAmount = 0
  for (const row of rows) {
    grossSales += row.gross_sales
    discountAmount += row.discount_amount
  }
  return {
    ...aggregate(rows),
    grossSales,
    discountAmount,
    weightedDiscountPct: grossSales === 0 ? null : (discountAmount / grossSales) * 100,
  }
}

export interface CubeGroup extends Aggregate {
  value: string
}

/** Sum one cube per dimension value. A value missing in a month simply adds nothing. */
export function groupCubeRows<T extends PeriodRow>(rows: T[], valueKey: string): CubeGroup[] {
  const buckets = new Map<string, T[]>()
  for (const row of rows) {
    const value = String((row as unknown as Record<string, unknown>)[valueKey])
    const bucket = buckets.get(value)
    if (bucket) bucket.push(row)
    else buckets.set(value, [row])
  }
  return [...buckets].map(([value, bucket]) => ({ value, ...aggregate(bucket) }))
}

export interface TrendPoint {
  period: string
  orders: number
  netSales: number
  profit: number
  /** Weighted aggregate margin for the month, or null when the month has no revenue. */
  marginPct: number | null
  /**
   * Secondary per-row average margin, carried only when the scope allows it: the processed
   * per-month value is available for plain month ranges, but the measure is non-additive and is
   * therefore absent once a dimension filter is active.
   */
  avgTxnMarginPct: number | null
}

/**
 * Monthly points for the trend charts and the insight ranking: sum the scoped rows per month and
 * recompute the weighted margin. `avgSource` (months_by_year) supplies the secondary non-additive
 * value; pass null when a dimension filter is active.
 */
export function buildTrendPoints(rows: PeriodRow[], avgSource: PeriodRow[] | null): TrendPoint[] {
  const buckets = new Map<string, { orders: number; netSales: number; profit: number }>()
  for (const row of rows) {
    const bucket = buckets.get(row.period) ?? { orders: 0, netSales: 0, profit: 0 }
    bucket.orders += row.orders
    bucket.netSales += row.net_sales
    bucket.profit += row.profit
    buckets.set(row.period, bucket)
  }
  const avgByPeriod = new Map(
    (avgSource ?? []).map((row) => [row.period, row.avg_transaction_margin_pct]),
  )
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([period, bucket]) => ({
      period,
      orders: bucket.orders,
      netSales: bucket.netSales,
      profit: bucket.profit,
      marginPct: bucket.netSales === 0 ? null : (bucket.profit / bucket.netSales) * 100,
      avgTxnMarginPct: avgByPeriod.get(period) ?? null,
    }))
}

export type TrendGranularity = 'month' | 'quarter' | 'year'

export interface GranularityPoint {
  /** "2024-03" (month), "2024-Q1" (quarter), or "2024" (year); sortable as a string. */
  key: string
  orders: number
  netSales: number
  profit: number
  grossSales: number
  discountAmount: number
  /** Weighted aggregate margin of the bucket, or null when the bucket has no revenue. */
  marginPct: number | null
  /** Weighted discount rate `sum(discount) / sum(gross sales) * 100` of the bucket. */
  weightedDiscountPct: number | null
}

function granularityKey(period: string, granularity: TrendGranularity): string {
  if (granularity === 'month') return period
  const [year, month] = period.split('-')
  if (granularity === 'year') return year
  return `${year}-Q${Math.ceil(Number(month) / 3)}`
}

/**
 * Scoped rows summed per month, quarter, or year. Every bucket reuses the same two operations as
 * the rest of the page - plain sums and the weighted margin - so the view switch can never change
 * the underlying numbers.
 */
export function buildGranularityPoints(
  rows: Array<PeriodRow & DiscountMeasures>,
  granularity: TrendGranularity,
): GranularityPoint[] {
  const buckets = new Map<
    string,
    { orders: number; netSales: number; profit: number; grossSales: number; discountAmount: number }
  >()
  for (const row of rows) {
    const key = granularityKey(row.period, granularity)
    const bucket = buckets.get(key) ?? {
      orders: 0,
      netSales: 0,
      profit: 0,
      grossSales: 0,
      discountAmount: 0,
    }
    bucket.orders += row.orders
    bucket.netSales += row.net_sales
    bucket.profit += row.profit
    bucket.grossSales += row.gross_sales
    bucket.discountAmount += row.discount_amount
    buckets.set(key, bucket)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, bucket]) => ({
      key,
      orders: bucket.orders,
      netSales: bucket.netSales,
      profit: bucket.profit,
      grossSales: bucket.grossSales,
      discountAmount: bucket.discountAmount,
      marginPct: bucket.netSales === 0 ? null : (bucket.profit / bucket.netSales) * 100,
      weightedDiscountPct:
        bucket.grossSales === 0 ? null : (bucket.discountAmount / bucket.grossSales) * 100,
    }))
}

export interface AnnualScopeRow {
  year: string
  orders: number
  netSales: number
  profit: number
  marginPct: number | null
  /** Months present in scope for this year; a partial year suppresses its YoY column. */
  months: number
  /**
   * `(current - previous) / previous * 100` on summed net sales; the same formula the pipeline
   * uses in `annual-performance.json`. Shown only when BOTH years have 12 months in scope, so a
   * clipped month range cannot produce a misleading growth number.
   */
  revenueYoyPct: number | null
  profitYoyPct: number | null
}

/** Yearly rows for the annual panel: sums per year, weighted margin, and guarded YoY change. */
export function buildAnnualScopeRows(rows: PeriodRow[]): AnnualScopeRow[] {
  const buckets = new Map<
    string,
    { orders: number; netSales: number; profit: number; periods: Set<string> }
  >()
  for (const row of rows) {
    const year = row.period.slice(0, 4)
    const bucket = buckets.get(year) ?? { orders: 0, netSales: 0, profit: 0, periods: new Set() }
    bucket.orders += row.orders
    bucket.netSales += row.net_sales
    bucket.profit += row.profit
    bucket.periods.add(row.period)
    buckets.set(year, bucket)
  }
  const years = [...buckets.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return years.map(([year, bucket], index) => {
    const previous = index > 0 ? years[index - 1][1] : null
    const complete = previous !== null && previous.periods.size >= 12 && bucket.periods.size >= 12
    return {
      year,
      orders: bucket.orders,
      netSales: bucket.netSales,
      profit: bucket.profit,
      marginPct: bucket.netSales === 0 ? null : (bucket.profit / bucket.netSales) * 100,
      months: bucket.periods.size,
      revenueYoyPct:
        complete && previous.netSales !== 0
          ? ((bucket.netSales - previous.netSales) / previous.netSales) * 100
          : null,
      profitYoyPct:
        complete && previous.profit !== 0
          ? ((bucket.profit - previous.profit) / previous.profit) * 100
          : null,
    }
  })
}

/** Bracket order used by the discount analysis (docs/METRIC_DICTIONARY.md §4.3). */
export const DISCOUNT_BRACKET_ORDER = ['0% (No Discount)', '1-10%', '11-20%', '21-30%', '30%+']

export interface BracketPoint {
  bracket: string
  orders: number
  netSales: number
  profit: number
  marginPct: number | null
  /** `sum(profit) / sum(orders)` inside the bracket; denominator is the bracket order count. */
  profitPerOrder: number | null
  /** Share of the bracket inside the scoped bracket total: `sum(part) / sum(total)`. */
  sharePct: number
}

/**
 * Discount-bracket rows for the panel: sums per bracket plus the two display ratios, each labelled
 * with its real denominator on screen. Brackets keep the documented order; a bracket with no
 * orders in the active month range is legitimately absent.
 */
export function buildBracketPoints(rows: DiscountBracketCubeRow[]): BracketPoint[] {
  const groups = groupCubeRows(rows, 'discount_bracket')
  const total = groups.reduce((sum, group) => sum + group.netSales, 0)
  return groups
    .map((group) => ({
      bracket: group.value,
      orders: group.orders,
      netSales: group.netSales,
      profit: group.profit,
      marginPct: group.marginPct,
      profitPerOrder: group.orders === 0 ? null : group.profit / group.orders,
      sharePct: sharePct(group.netSales, total),
    }))
    .sort(
      (a, b) =>
        DISCOUNT_BRACKET_ORDER.indexOf(a.bracket) - DISCOUNT_BRACKET_ORDER.indexOf(b.bracket),
    )
}

export interface QuarterPoint {
  /** "Q1".."Q4", summed across every year in the scope. */
  quarter: string
  orders: number
  netSales: number
  profit: number
  marginPct: number | null
}

/** Scoped rows summed per calendar quarter (Q1-Q4) across every year the scope covers. */
export function buildQuarterPoints(rows: PeriodRow[]): QuarterPoint[] {
  const buckets = new Map<string, { orders: number; netSales: number; profit: number }>()
  for (const row of rows) {
    const quarter = `Q${Math.ceil(Number(row.period.slice(5)) / 3)}`
    const bucket = buckets.get(quarter) ?? { orders: 0, netSales: 0, profit: 0 }
    bucket.orders += row.orders
    bucket.netSales += row.net_sales
    bucket.profit += row.profit
    buckets.set(quarter, bucket)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([quarter, bucket]) => ({
      quarter,
      orders: bucket.orders,
      netSales: bucket.netSales,
      profit: bucket.profit,
      marginPct: bucket.netSales === 0 ? null : (bucket.profit / bucket.netSales) * 100,
    }))
}

export interface SegmentShare {
  segment: string
  orders: number
  netSales: number
  profit: number
  /** Display share of profit inside the scope: sum(part) / sum(total). */
  sharePct: number
  marginPct: number | null
} /** Profit composition per customer segment inside the active scope, largest profit first. */
export function buildSegmentShares(rows: CombinedCubeRow[]): SegmentShare[] {
  const buckets = new Map<string, { orders: number; netSales: number; profit: number }>()
  for (const row of rows) {
    const bucket = buckets.get(row.segment) ?? { orders: 0, netSales: 0, profit: 0 }
    bucket.orders += row.orders
    bucket.netSales += row.net_sales
    bucket.profit += row.profit
    buckets.set(row.segment, bucket)
  }
  const totalProfit = [...buckets.values()].reduce((total, bucket) => total + bucket.profit, 0)
  return [...buckets.entries()]
    .map(([segment, bucket]) => ({
      segment,
      orders: bucket.orders,
      netSales: bucket.netSales,
      profit: bucket.profit,
      sharePct: sharePct(bucket.profit, totalProfit),
      marginPct: bucket.netSales === 0 ? null : (bucket.profit / bucket.netSales) * 100,
    }))
    .sort((a, b) => b.profit - a.profit)
}

export interface SeasonPoint {
  /** Calendar month key "01".."12", stable across scopes. */
  key: string
  monthName: string
  orders: number
  netSales: number
  profit: number
  marginPct: number | null
}

/**
 * Net sales per calendar month inside the active scope, summed across every year present in the
 * scope. Month names come from the processed monthly payload, not from a locale guess.
 */
export function buildSeasonMonths(rows: PeriodRow[], months: MonthRow[]): SeasonPoint[] {
  const nameByMonth = new Map(months.map((month) => [month.period.slice(5), month.month_name]))
  const buckets = new Map<string, { orders: number; netSales: number; profit: number }>()
  for (const row of rows) {
    const key = row.period.slice(5)
    const bucket = buckets.get(key) ?? { orders: 0, netSales: 0, profit: 0 }
    bucket.orders += row.orders
    bucket.netSales += row.net_sales
    bucket.profit += row.profit
    buckets.set(key, bucket)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, bucket]) => ({
      key,
      monthName: nameByMonth.get(key) ?? key,
      orders: bucket.orders,
      netSales: bucket.netSales,
      profit: bucket.profit,
      marginPct: bucket.netSales === 0 ? null : (bucket.profit / bucket.netSales) * 100,
    }))
}

/** Display share of one summed additive measure inside a subset, in percent. */
export function sharePct(part: number, total: number): number {
  return total === 0 ? 0 : (part / total) * 100
}

/** Human-readable description of the active scope, used on badges and in the filter bar. */
export function describeScope(data: DashboardData, filter: FilterState): string {
  const parts: string[] = []
  for (const dimension of DIMENSION_KEYS) {
    const value = filter[dimension]
    if (value) parts.push(`${DIMENSION_LABELS[dimension]}: ${value}`)
  }
  if (filter.from || filter.to) {
    const range = periodRange(data)
    const from = filter.from ?? range.min
    const to = filter.to ?? range.max
    parts.push(
      from === to
        ? formatPeriodLabel(from)
        : `${formatPeriodLabel(from)} - ${formatPeriodLabel(to)}`,
    )
  }
  return parts.length > 0
    ? parts.join(' · ')
    : `Seluruh periode ${data.metadata.date_range.min.slice(0, 4)}-${data.metadata.date_range.max.slice(0, 4)}`
}
