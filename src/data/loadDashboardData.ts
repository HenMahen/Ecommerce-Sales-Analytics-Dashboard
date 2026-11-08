import type {
  AnomalyByDimension,
  AnnualPerformance,
  DashboardData,
  DashboardSummary,
  DatasetMetadata,
  DiscountBrackets,
  FilterCubes,
  MonthlyPerformance,
  SegmentPerformance,
  TimeDimensions,
} from './types'

const DATA_BASE = `${import.meta.env.BASE_URL}data/`

export class ReconciliationError extends Error {
  readonly failures: string[]

  constructor(failures: string[]) {
    super(`Rekonsiliasi data gagal: ${failures.join('; ')}`)
    this.name = 'ReconciliationError'
    this.failures = failures
  }
}

export class DataLoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DataLoadError'
  }
}

function sum(values: number[]): number {
  let total = 0
  for (const value of values) total += value
  return total
}

async function fetchJson<T>(file: string): Promise<T> {
  const response = await fetch(`${DATA_BASE}${file}`)
  if (!response.ok) {
    throw new DataLoadError(`Gagal memuat ${file} (HTTP ${response.status}).`)
  }
  return (await response.json()) as T
}

function pushFailure(failures: string[], label: string, actual: number, expected: number): void {
  failures.push(`${label}: ${actual} != ${expected}`)
}

/**
 * Load-time reconciliation, mirroring `docs/IMPLEMENTATION_BLUEPRINT.md` §10.
 *
 * Every check is a plain sum or a weighted division over values that were already computed in
 * Python. If anything drifts, the dashboard shows an error state instead of unverified numbers.
 */
export function reconcile(data: DashboardData): string[] {
  const failures: string[] = []
  const { money_abs: money, pct_abs: pct, count_abs: counts } = data.metadata.tolerances

  const versions = new Set(
    [
      data.summary,
      data.monthly,
      data.segments,
      data.cubes,
      data.timeDimensions,
      data.annual,
      data.discountBrackets,
      data.anomaly,
      data.metadata,
    ].map((payload) => payload.definitions_version),
  )
  if (versions.size !== 1) {
    failures.push(`definitions_version tidak seragam: ${[...versions].join(', ')}`)
  }

  const { totals, margins } = data.summary

  const check = (label: string, actual: number, expected: number, tolerance: number) => {
    if (Math.abs(actual - expected) > tolerance) {
      pushFailure(failures, label, actual, expected)
    }
  }

  // Weighted margin must come from summed profit / summed net sales.
  check(
    'margins.aggregate_margin_pct',
    margins.aggregate_margin_pct,
    (totals.profit / totals.net_sales) * 100,
    pct,
  )

  const monthTotals = {
    orders: sum(data.monthly.months_by_year.map((row) => row.orders)),
    net_sales: sum(data.monthly.months_by_year.map((row) => row.net_sales)),
    profit: sum(data.monthly.months_by_year.map((row) => row.profit)),
  }
  check('months_by_year.orders', monthTotals.orders, totals.orders, counts)
  check('months_by_year.net_sales', monthTotals.net_sales, totals.net_sales, money)
  check('months_by_year.profit', monthTotals.profit, totals.profit, money)

  const cubeEntries: Array<[string, Array<{ orders: number; net_sales: number; profit: number }>]> =
    [
      ['combined', data.cubes.cubes.combined],
      ['segment', data.cubes.cubes.segment],
      ['sales_channel', data.cubes.cubes.sales_channel],
      ['order_status', data.cubes.cubes.order_status],
      ['day_type', data.cubes.cubes.day_type],
      ['delivery_status', data.cubes.cubes.delivery_status],
      ['discount_bracket', data.cubes.cubes.discount_bracket],
      ['region', data.cubes.cubes.region],
    ]
  for (const [name, rows] of cubeEntries) {
    check(`cube ${name} orders`, sum(rows.map((row) => row.orders)), totals.orders, counts)
    check(`cube ${name} net_sales`, sum(rows.map((row) => row.net_sales)), totals.net_sales, money)
    check(`cube ${name} profit`, sum(rows.map((row) => row.profit)), totals.profit, money)
  }

  check(
    'segments.profit_share_pct',
    sum(data.segments.segments.map((row) => row.profit_share_pct)),
    100,
    pct,
  )

  check(
    'status_margins orders',
    sum(Object.values(data.summary.status_margins).map((row) => row.orders)),
    totals.orders,
    counts,
  )

  return failures
}

export async function loadDashboardData(signal?: AbortSignal): Promise<DashboardData> {
  const [
    summary,
    monthly,
    segments,
    cubes,
    timeDimensions,
    annual,
    discountBrackets,
    anomaly,
    metadata,
  ] = await Promise.all([
    fetchJson<DashboardSummary>('dashboard-summary.json'),
    fetchJson<MonthlyPerformance>('monthly-performance.json'),
    fetchJson<SegmentPerformance>('segment-performance.json'),
    fetchJson<FilterCubes>('filter-cubes.json'),
    fetchJson<TimeDimensions>('time-dimensions.json'),
    fetchJson<AnnualPerformance>('annual-performance.json'),
    fetchJson<DiscountBrackets>('discount-brackets.json'),
    fetchJson<AnomalyByDimension>('anomaly-by-dimension.json'),
    fetchJson<DatasetMetadata>('metadata.json'),
  ])

  if (signal?.aborted) throw new DataLoadError('Pemuatan dibatalkan.')

  const data: DashboardData = {
    summary,
    monthly,
    segments,
    cubes,
    timeDimensions,
    annual,
    discountBrackets,
    anomaly,
    metadata,
  }

  const failures = reconcile(data)
  if (failures.length > 0) throw new ReconciliationError(failures)

  return data
}
