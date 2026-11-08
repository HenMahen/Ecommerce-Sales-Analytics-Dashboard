/**
 * Type contracts for the dashboard JSON payloads written by
 * `scripts/prepare_dashboard_data.py`. These mirror `docs/DATA_CONTRACT.md` §8.
 *
 * Only shapes that the UI actually renders are marked required; every payload also carries
 * `definitions_version`, which the loader checks for consistency.
 */

export interface DashboardTotals {
  gross_sales: number
  discount_amount: number
  net_sales: number
  product_cost: number
  profit: number
  orders: number
  customers_active: number
  customers_master: number
  products_used: number
}

export interface DashboardMargins {
  aggregate_margin_pct: number
  avg_transaction_margin_pct: number
  primary_basis: string
  net_sales_basis: string
}

export interface StatusMarginRow {
  orders: number
  net_sales: number
  profit: number
  aggregate_margin_pct: number
}

export interface DashboardDerived {
  note: string
  profit_per_customer: number
  orders_per_customer: number
  discount_rate_weighted_pct: number
  discount_rate_row_mean_pct: number
  discount_rate_row_median_pct: number
  discount_rate_row_max_pct: number
  loss_orders: number
  total_loss: number
  definitions: Record<string, string>
}

export interface DashboardSummary {
  definitions_version: string
  generated_at: string
  source_rows: number
  date_min: string
  date_max: string
  net_sales_basis: string
  totals: DashboardTotals
  margins: DashboardMargins
  pass_through: { note: string; tax_collected: number; shipping_billed: number }
  as_stored: { note: string; net_sales: number; profit: number; aggregate_margin_pct: number }
  kpis: {
    avg_order_value: number
    mean_rating: number
    repeat_customer_rate_customer_level_pct: number
    high_margin_transaction_share_pct: number
  }
  derived: DashboardDerived
  status_mix: Record<string, number>
  status_margins: Record<string, StatusMarginRow>
  return_rate_pct: number
  cancellation_rate_pct: number
  undelivered_rate_pct: number
}

/** One period bucket (month) with basis-C measures. Shared by months and cube rows. */
export interface PeriodRow {
  period: string
  orders: number
  net_sales: number
  profit: number
  avg_transaction_margin_pct: number
  aggregate_margin_pct: number
}

/**
 * Additive discount-side measures carried by every cube row since definitions_version mvp-6.
 * `gross_sales` and `discount_amount` are plain sums, so gross sales, discount amount, and the
 * weighted discount rate (Σdiscount ÷ Σgross sales × 100) follow every global filter exactly like
 * `orders`/`net_sales`/`profit`. The per-row discount rate is non-additive and is never summed.
 */
export interface DiscountMeasures {
  gross_sales: number
  discount_amount: number
}

export interface MonthRow extends PeriodRow {
  month_name: string
}

export interface MonthlyPerformance {
  definitions_version: string
  months: MonthRow[]
  months_by_year: PeriodRow[]
}

export interface SegmentRow {
  segment: string
  orders: number
  customers: number
  net_sales: number
  profit: number
  avg_transaction_margin_pct: number
  aggregate_margin_pct: number
  profit_share_pct: number
  profit_per_customer: number
  orders_per_customer: number
  avg_discount_rate_row_mean_pct: number
  avg_discount_rate_weighted_pct: number
}

export interface SegmentPerformance {
  definitions_version: string
  segments: SegmentRow[]
}

export interface SegmentCubeRow extends PeriodRow, DiscountMeasures {
  segment: string
  customers: number
}

export interface SalesChannelCubeRow extends PeriodRow, DiscountMeasures {
  sales_channel: string
  customers: number
}

export interface OrderStatusCubeRow extends PeriodRow, DiscountMeasures {
  order_status: string
  customers: number
}

/**
 * Panel cubes (definitions_version mvp-4): period x one dimension, no `customers`, and only
 * valid for the period range. They never combine with a filter dimension.
 */
export interface DayTypeCubeRow extends PeriodRow, DiscountMeasures {
  day_type: string
}

export interface DeliveryStatusCubeRow extends PeriodRow, DiscountMeasures {
  delivery_status: string
}

export interface DiscountBracketCubeRow extends PeriodRow, DiscountMeasures {
  discount_bracket: string
}

export interface RegionCubeRow extends PeriodRow, DiscountMeasures {
  region: string
}

export type FilterCubeKey = 'segment' | 'sales_channel' | 'order_status'
export type PanelCubeKey = 'day_type' | 'delivery_status' | 'discount_bracket' | 'region'
export type CubeKey = 'combined' | FilterCubeKey | PanelCubeKey

export type PanelCubeRow =
  DayTypeCubeRow | DeliveryStatusCubeRow | DiscountBracketCubeRow | RegionCubeRow

/**
 * Combined cube (definitions_version mvp-5): period x segment x sales_channel x order_status.
 * Additive measures only (`orders`, `net_sales`, `profit`, plus `gross_sales` and
 * `discount_amount` since mvp-6), so every combination of the four global filters is a plain sum.
 * Non-additive measures (`customers`, `avg_transaction_margin_pct`) are deliberately absent.
 */
export interface CombinedCubeRow extends PeriodRow, DiscountMeasures {
  segment: string
  sales_channel: string
  order_status: string
}

export interface FilterCubes {
  definitions_version: string
  note: string
  dimensions: string[]
  combined_dimensions: string[]
  panel_dimensions: string[]
  non_additive_measures: string[]
  notes: string[]
  cubes: {
    combined: CombinedCubeRow[]
    segment: SegmentCubeRow[]
    sales_channel: SalesChannelCubeRow[]
    order_status: OrderStatusCubeRow[]
    day_type: DayTypeCubeRow[]
    delivery_status: DeliveryStatusCubeRow[]
    discount_bracket: DiscountBracketCubeRow[]
    region: RegionCubeRow[]
  }
}

export interface AnnualRow {
  year: number
  orders: number
  customers: number
  net_sales: number
  profit: number
  avg_transaction_margin_pct: number
  aggregate_margin_pct: number
  revenue_yoy_pct: number | null
  profit_yoy_pct: number | null
}

export interface AnnualPerformance {
  definitions_version: string
  years: AnnualRow[]
}

export interface DiscountBracketRow {
  bracket: string
  orders: number
  net_sales: number
  profit: number
  avg_transaction_margin_pct: number
  aggregate_margin_pct: number
  profit_per_order: number
  loss_orders: number
}

export interface DiscountBrackets {
  definitions_version: string
  brackets: DiscountBracketRow[]
}

export interface AnomalyDimensionRow {
  value: string
  orders: number
  anomalies: number
  anomaly_rate_pct: number
}

export interface AnomalyByDimension {
  definitions_version: string
  rule: {
    percentile_revenue: number
    percentile_margin: number
    operator: string
    revenue_threshold: number
    margin_threshold_pct: number
    thresholds_scope: string
    revenue_column: string
    margin_column: string
  }
  summary: {
    orders: number
    order_share_pct: number
    net_sales: number
    profit: number
    avg_transaction_margin_pct: number
    aggregate_margin_pct: number
    counterfactual_gap_avg_txn_margin: number
    counterfactual_gap_aggregate_margin: number
    assumptions: string[]
  }
  dimensions: {
    sales_channel: AnomalyDimensionRow[]
    region: AnomalyDimensionRow[]
    marketing_channel: AnomalyDimensionRow[]
  }
}

export interface QuarterRow extends Omit<PeriodRow, 'period'> {
  quarter: string
}

export interface YearQuarterRow extends PeriodRow {
  year: number
  quarter: string
}

export interface DayTypeRow extends Omit<PeriodRow, 'period'> {
  day_type: string
  order_share_pct: number
}

export interface DeliveryStatusRow {
  value: string
  orders: number
  share_pct: number
}

export interface TimeDimensions {
  definitions_version: string
  quarters: QuarterRow[]
  year_quarters: YearQuarterRow[]
  day_types: DayTypeRow[]
  delivery_status: DeliveryStatusRow[]
  notes: string[]
}

export interface DatasetMetadata {
  definitions_version: string
  dataset_version: string
  source_files: string[]
  excluded_source_files: string[]
  row_count: number
  date_range: { min: string; max: string }
  decisions: Record<string, unknown>
  derived_columns: Record<string, string>
  generated_at: string
  tolerances: { money_abs: number; pct_abs: number; count_abs: number }
}

/** Everything the Executive Overview (and later pages) need, loaded in one pass. */
export interface DashboardData {
  summary: DashboardSummary
  monthly: MonthlyPerformance
  segments: SegmentPerformance
  cubes: FilterCubes
  timeDimensions: TimeDimensions
  annual: AnnualPerformance
  discountBrackets: DiscountBrackets
  anomaly: AnomalyByDimension
  metadata: DatasetMetadata
}
