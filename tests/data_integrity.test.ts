/**
 * Uji integritas data olahan (Fase 2 rencana implementasi).
 *
 * Berkas ini tidak menghitung ulang metrik bisnis. Tugasnya menjaga output
 * `scripts/prepare_dashboard_data.py` tetap sesuai kontrak dan tolok ukur:
 * 1. daftar berkas sesuai `docs/DATA_CONTRACT.md`,
 * 2. salinan byte-for-byte antara `data/processed/` dan `public/data/`,
 * 3. anchor tolok ukur `docs/METRIC_DICTIONARY.md` Bagian 10 dan `docs/EDA_VALIDATION.md`,
 * 4. konsistensi aritmetika antarberkas dan kubus filter,
 * 5. tidak ada metrik terlarang (CLV, ROMI, jumlah order pelanggan yang tidak andal).
 *
 * Rekomputasi langsung dari CSV sumber tetap diuji oleh rekonsiliasi Python; berkas ini
 * hanya membaca JSON sehingga tetap cepat.
 */
import { describe, expect, it } from 'vitest'
import type {
  AnnualPerformance,
  AnomalyByDimension,
  DashboardSummary,
  DatasetMetadata,
  DiscountBrackets,
  DiscountMeasures,
  FilterCubes,
  MonthlyPerformance,
  PeriodRow,
  SegmentPerformance,
  TimeDimensions,
} from '@/data/types'

const CONTRACT_FILES = [
  'annual-performance.json',
  'anomaly-by-dimension.json',
  'dashboard-summary.json',
  'discount-brackets.json',
  'filter-cubes.json',
  'metadata.json',
  'monthly-performance.json',
  'segment-performance.json',
  'time-dimensions.json',
] as const

const publishedRaw = import.meta.glob<string>('../public/data/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const processedRaw = import.meta.glob<string>('../data/processed/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
})

function fileName(key: string): string {
  return key.slice(key.lastIndexOf('/') + 1)
}

function toMap(modules: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(modules).map(([key, text]) => [fileName(key), text]))
}

const published = toMap(publishedRaw)
const processed = toMap(processedRaw)

function textOf(map: Map<string, string>, name: string): string {
  const text = map.get(name)
  if (text === undefined) throw new Error(`Berkas tidak ditemukan: ${name}`)
  return text
}

function read<T>(name: string): T {
  return JSON.parse(textOf(published, name)) as T
}

const summary = read<DashboardSummary>('dashboard-summary.json')
const monthly = read<MonthlyPerformance>('monthly-performance.json')
const annual = read<AnnualPerformance>('annual-performance.json')
const segments = read<SegmentPerformance>('segment-performance.json')
const brackets = read<DiscountBrackets>('discount-brackets.json')
const anomaly = read<AnomalyByDimension>('anomaly-by-dimension.json')
const timeDimensions = read<TimeDimensions>('time-dimensions.json')
const cubes = read<FilterCubes>('filter-cubes.json')
const metadata = read<DatasetMetadata>('metadata.json')

function sumBy<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + pick(row), 0)
}

const TOTAL_ORDERS = 138116
const TOTAL_NET_SALES = 157143214.06
const TOTAL_PROFIT = 59232305.35
const TOTAL_GROSS_SALES = 189962560.88
const TOTAL_DISCOUNT = 32819346.82

describe('kontrak berkas', () => {
  it('menyediakan tepat 9 berkas kontrak di kedua direktori', () => {
    expect([...published.keys()].sort()).toEqual([...CONTRACT_FILES])
    expect([...processed.keys()].sort()).toEqual([...CONTRACT_FILES])
  })

  it('menyalin berkas ke public/data byte-for-byte', () => {
    for (const name of CONTRACT_FILES) {
      expect(textOf(processed, name), `salinan berbeda: ${name}`).toEqual(textOf(published, name))
    }
  })

  it('menulis definitions_version mvp-6 di setiap payload', () => {
    const payloads: Array<[string, { definitions_version: string }]> = [
      ['dashboard-summary.json', summary],
      ['monthly-performance.json', monthly],
      ['annual-performance.json', annual],
      ['segment-performance.json', segments],
      ['discount-brackets.json', brackets],
      ['anomaly-by-dimension.json', anomaly],
      ['time-dimensions.json', timeDimensions],
      ['filter-cubes.json', cubes],
      ['metadata.json', metadata],
    ]

    for (const [name, payload] of payloads) {
      expect(payload.definitions_version, name).toBe('mvp-6')
    }
  })

  it('mencatat keputusan metrik yang terkunci tanpa mengubah definisinya', () => {
    expect(metadata.decisions).toMatchObject({
      margin_basis: 'aggregate_primary',
      avg_transaction_margin: 'secondary',
      net_sales_basis: 'merchandise_gross_minus_discount',
      tax_treatment: 'pass_through',
      shipping_treatment: 'pass_through',
      anomaly_operator: 'inclusive',
      repeat_customer_definition: 'customer_with_more_than_one_order',
      product_level_metrics: 'excluded',
      business_formulas_location: 'python_prep_only',
      excluded_metrics: ['clv', 'romi'],
      non_additive_measures: ['customers', 'avg_transaction_margin_pct'],
      filter_dimensions: ['segment', 'sales_channel', 'order_status'],
      panel_dimensions: ['day_type', 'delivery_status', 'discount_bracket', 'region'],
    })
  })

  it('mencatat rentang tanggal, jumlah baris, dan berkas sumber yang dikecualikan', () => {
    expect(metadata.row_count).toBe(TOTAL_ORDERS)
    expect(summary.source_rows).toBe(TOTAL_ORDERS)
    expect(metadata.date_range).toEqual({ min: '2021-01-01', max: '2025-12-31' })
    expect(metadata.excluded_source_files).toEqual(['order_items.csv', 'dataset_statistics.csv'])
    expect(metadata.source_files).toEqual([
      'ecommerce_sales_customer_analytics_150k.csv',
      'customer_master.csv',
      'product_catalog.csv',
    ])
    expect(metadata.tolerances).toEqual({ money_abs: 0.01, pct_abs: 0.01, count_abs: 0 })
  })
})

interface AnchorCase {
  name: string
  actual: number
  expected: number
  tolerance: number
}

/**
 * Angka harapan diambil apa adanya dari dokumen, bukan dihitung ulang di sini.
 * `ANC-*` = docs/METRIC_DICTIONARY.md Bagian 10, `EDA-*` = docs/EDA_VALIDATION.md Bagian 3/5.
 */
const ANCHOR_CASES: AnchorCase[] = [
  {
    name: 'ANC-01 total gross sales',
    actual: summary.totals.gross_sales,
    expected: 189962560.88,
    tolerance: 0.01,
  },
  {
    name: 'ANC-02 total discount amount',
    actual: summary.totals.discount_amount,
    expected: 32819346.82,
    tolerance: 0.01,
  },
  {
    name: 'ANC-03 total net sales (basis C)',
    actual: summary.totals.net_sales,
    expected: 157143214.06,
    tolerance: 0.01,
  },
  {
    name: 'ANC-04 total product cost',
    actual: summary.totals.product_cost,
    expected: 97910908.71,
    tolerance: 0.01,
  },
  {
    name: 'ANC-05 total profit (basis C)',
    actual: summary.totals.profit,
    expected: 59232305.35,
    tolerance: 0.01,
  },
  {
    name: 'ANC-06 margin keseluruhan',
    actual: summary.margins.aggregate_margin_pct,
    expected: 37.69,
    tolerance: 0.01,
  },
  {
    name: 'ANC-07 rata-rata margin transaksi',
    actual: summary.margins.avg_transaction_margin_pct,
    expected: 41.16,
    tolerance: 0.01,
  },
  {
    name: 'ANC-08 volume transaksi',
    actual: summary.totals.orders,
    expected: 138116,
    tolerance: 0,
  },
  {
    name: 'ANC-09 pelanggan aktif',
    actual: summary.totals.customers_active,
    expected: 24911,
    tolerance: 0,
  },
  {
    name: 'ANC-10 average order value',
    actual: summary.kpis.avg_order_value,
    expected: 1137.76,
    tolerance: 0.01,
  },
  {
    name: 'ANC-11 repeat customer rate (level pelanggan)',
    actual: summary.kpis.repeat_customer_rate_customer_level_pct,
    expected: 97.9,
    tolerance: 0.01,
  },
  {
    name: 'ANC-12 high margin share (>20%)',
    actual: summary.kpis.high_margin_transaction_share_pct,
    expected: 92.01,
    tolerance: 0.01,
  },
  {
    name: 'ANC-13 pesanan merugi',
    actual: summary.derived.loss_orders,
    expected: 2530,
    tolerance: 0,
  },
  {
    name: 'ANC-14 total nilai kerugian (absolut)',
    actual: Math.abs(summary.derived.total_loss),
    expected: 426306.8,
    tolerance: 0.01,
  },
  { name: 'ANC-15 pesanan anomali', actual: anomaly.summary.orders, expected: 12855, tolerance: 0 },
  {
    name: 'ANC-16 revenue pesanan anomali',
    actual: anomaly.summary.net_sales,
    expected: 34665272.99,
    tolerance: 0.01,
  },
  {
    name: 'ANC-17 margin keseluruhan anomali',
    actual: anomaly.summary.aggregate_margin_pct,
    expected: 21.72,
    tolerance: 0.01,
  },
  {
    name: 'ANC-18 opportunity gap basis agregat',
    actual: anomaly.summary.counterfactual_gap_aggregate_margin,
    expected: 5537690.05,
    tolerance: 0.01,
  },
  {
    name: 'ANC-19 tingkat diskon terbobot',
    actual: summary.derived.discount_rate_weighted_pct,
    expected: 17.28,
    tolerance: 0.01,
  },
  {
    name: 'ANC-20 rerata rating',
    actual: summary.kpis.mean_rating,
    expected: 3.677,
    tolerance: 0.001,
  },
  {
    name: 'ANC-21 pajak dipungut (pass-through)',
    actual: summary.pass_through.tax_collected,
    expected: 16914090.41,
    tolerance: 0.01,
  },
  {
    name: 'ANC-22 ongkir ditagih (pass-through)',
    actual: summary.pass_through.shipping_billed,
    expected: 3076959.27,
    tolerance: 0.01,
  },
  {
    name: 'ANC-23 kubus segment: jumlah net sales',
    actual: sumBy(cubes.cubes.segment, (row) => row.net_sales),
    expected: 157143214.06,
    tolerance: 1,
  },
  {
    name: 'ANC-24 kubus panel day_type: jumlah profit',
    actual: sumBy(cubes.cubes.day_type, (row) => row.profit),
    expected: 59232305.35,
    tolerance: 1,
  },
  {
    name: 'ANC-25 kubus panel delivery_status: jumlah profit',
    actual: sumBy(cubes.cubes.delivery_status, (row) => row.profit),
    expected: 59232305.35,
    tolerance: 1,
  },
  {
    name: 'ANC-26 kubus panel discount_bracket: jumlah profit',
    actual: sumBy(cubes.cubes.discount_bracket, (row) => row.profit),
    expected: 59232305.35,
    tolerance: 1,
  },
  {
    name: 'ANC-27 kubus panel region: jumlah profit',
    actual: sumBy(cubes.cubes.region, (row) => row.profit),
    expected: 59232305.35,
    tolerance: 1,
  },
  {
    name: 'EDA-3 as_stored net sales',
    actual: summary.as_stored.net_sales,
    expected: 177134263.74,
    tolerance: 0.01,
  },
  {
    name: 'EDA-3 as_stored profit',
    actual: summary.as_stored.profit,
    expected: 76146395.76,
    tolerance: 0.01,
  },
  {
    name: 'EDA-3 as_stored margin keseluruhan',
    actual: summary.as_stored.aggregate_margin_pct,
    expected: 42.99,
    tolerance: 0.01,
  },
  {
    name: 'EDA-3 profit per pelanggan',
    actual: summary.derived.profit_per_customer,
    expected: 2377.76,
    tolerance: 0.01,
  },
  {
    name: 'EDA-3 order per pelanggan',
    actual: summary.derived.orders_per_customer,
    expected: 5.544,
    tolerance: 0.001,
  },
  {
    name: 'EDA-5.7 order rugi basis C',
    actual: summary.derived.loss_orders,
    expected: 2530,
    tolerance: 0,
  },
  {
    name: 'EDA-5.10 tingkat retur',
    actual: summary.return_rate_pct,
    expected: 6.85,
    tolerance: 0.01,
  },
  {
    name: 'EDA-5.10 tingkat pembatalan',
    actual: summary.cancellation_rate_pct,
    expected: 6.08,
    tolerance: 0.01,
  },
  {
    name: 'EDA-5.10 pesanan tidak dikirim',
    actual: summary.undelivered_rate_pct,
    expected: 17.78,
    tolerance: 0.01,
  },
]

describe('anchor tolok ukur', () => {
  it.each(ANCHOR_CASES)('$name', ({ actual, expected, tolerance }) => {
    expect(
      Math.abs(actual - expected),
      `aktual=${actual} harapan=${expected} toleransi=${tolerance}`,
    ).toBeLessThanOrEqual(tolerance)
  })

  it('menyimpan total kerugian sebagai nilai negatif berlabel', () => {
    expect(summary.derived.total_loss).toBeLessThan(0)
  })

  it('mendokumentasikan asumsi simulasi potensi', () => {
    expect(anomaly.summary.assumptions.length).toBeGreaterThanOrEqual(3)
    expect(anomaly.rule.operator).toBe('inclusive')
    expect(anomaly.rule.thresholds_scope).toBe('global')
    expect(anomaly.rule.revenue_threshold).toBeCloseTo(1552.32, 2)
    expect(anomaly.rule.margin_threshold_pct).toBeCloseTo(34.12, 2)
  })

  it('mencatat status pesanan sesuai dokumen validasi', () => {
    expect(summary.status_mix).toEqual({
      completed: 113559,
      pending: 6697,
      returned: 9462,
      cancelled: 8398,
    })
    expect(Object.keys(summary.status_margins).sort()).toEqual([
      'Cancelled',
      'Completed',
      'Pending',
      'Returned',
    ])
  })
})

describe('konsistensi antarberkas', () => {
  const cases: Array<[string, number, number, number]> = [
    [
      'jumlah 12 bulan = total',
      sumBy(monthly.months, (row) => row.net_sales),
      TOTAL_NET_SALES,
      0.5,
    ],
    [
      'jumlah 60 bulan = total',
      sumBy(monthly.months_by_year, (row) => row.net_sales),
      TOTAL_NET_SALES,
      0.5,
    ],
    ['jumlah 5 tahun = total', sumBy(annual.years, (row) => row.net_sales), TOTAL_NET_SALES, 0.5],
    [
      'jumlah 5 bracket = total',
      sumBy(brackets.brackets, (row) => row.net_sales),
      TOTAL_NET_SALES,
      0.5,
    ],
    [
      'jumlah bracket = jumlah order',
      sumBy(brackets.brackets, (row) => row.orders),
      TOTAL_ORDERS,
      0,
    ],
    [
      'jumlah 4 segmen = total',
      sumBy(segments.segments, (row) => row.net_sales),
      TOTAL_NET_SALES,
      0.5,
    ],
    [
      'porsi profit segmen = 100%',
      sumBy(segments.segments, (row) => row.profit_share_pct),
      100,
      0.5,
    ],
    [
      'jumlah pelanggan segmen = pelanggan aktif',
      sumBy(segments.segments, (row) => row.customers),
      24911,
      0,
    ],
    [
      'jumlah kuartal = total',
      sumBy(timeDimensions.quarters, (row) => row.net_sales),
      TOTAL_NET_SALES,
      0.5,
    ],
    [
      'jumlah kuartal per tahun = total',
      sumBy(timeDimensions.year_quarters, (row) => row.net_sales),
      TOTAL_NET_SALES,
      0.5,
    ],
    [
      'jumlah tipe hari = jumlah order',
      sumBy(timeDimensions.day_types, (row) => row.orders),
      TOTAL_ORDERS,
      0,
    ],
    [
      'jumlah status kirim = jumlah order',
      sumBy(timeDimensions.delivery_status, (row) => row.orders),
      TOTAL_ORDERS,
      0,
    ],
    [
      'porsi status kirim = 100%',
      sumBy(timeDimensions.delivery_status, (row) => row.share_pct),
      100,
      0.5,
    ],
    [
      'jumlah status pesanan = jumlah order',
      Object.values(summary.status_mix).reduce((a, b) => a + b, 0),
      TOTAL_ORDERS,
      0,
    ],
    [
      'jumlah order per bulan = jumlah order',
      sumBy(monthly.months_by_year, (row) => row.orders),
      TOTAL_ORDERS,
      0,
    ],
  ]

  it.each(cases)('%s', (_name, actual, expected, tolerance) => {
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
  })

  it('menyediakan 60 bulan dan 20 kuartal-tahun', () => {
    expect(monthly.months).toHaveLength(12)
    expect(monthly.months_by_year).toHaveLength(60)
    expect(monthly.months_by_year[0].period).toBe('2021-01')
    expect(monthly.months_by_year[59].period).toBe('2025-12')
    expect(timeDimensions.year_quarters).toHaveLength(20)
    expect(timeDimensions.delivery_status).toHaveLength(4)
  })

  it('mencatat tahun pertama tanpa pertumbuhan YoY', () => {
    expect(annual.years.map((row) => row.year)).toEqual([2021, 2022, 2023, 2024, 2025])
    expect(annual.years[0].revenue_yoy_pct).toBeNull()
    expect(annual.years[0].profit_yoy_pct).toBeNull()
  })
})

describe('kubus filter global dan kubus panel (mvp-5/mvp-6)', () => {
  type CubeRow = PeriodRow & DiscountMeasures & { customers: number }
  type FinancialRow = PeriodRow & DiscountMeasures
  const filterCubeRows: Array<[string, CubeRow[]]> = [
    ['segment', cubes.cubes.segment],
    ['sales_channel', cubes.cubes.sales_channel],
    ['order_status', cubes.cubes.order_status],
  ]
  const panelCubeRows: Array<[string, FinancialRow[]]> = [
    ['day_type', cubes.cubes.day_type],
    ['delivery_status', cubes.cubes.delivery_status],
    ['discount_bracket', cubes.cubes.discount_bracket],
    ['region', cubes.cubes.region],
  ]
  const allCubeRows: Array<[string, FinancialRow[]]> = [...filterCubeRows, ...panelCubeRows]

  it('menyediakan tiga dimensi filter, empat dimensi panel, dan satu kubus gabungan', () => {
    expect(cubes.dimensions).toEqual(['segment', 'sales_channel', 'order_status'])
    expect(cubes.combined_dimensions).toEqual(['segment', 'sales_channel', 'order_status'])
    expect(cubes.panel_dimensions).toEqual([
      'day_type',
      'delivery_status',
      'discount_bracket',
      'region',
    ])
    expect(cubes.non_additive_measures).toEqual(['customers', 'avg_transaction_margin_pct'])
    expect(Object.keys(cubes.cubes)).toEqual([
      'combined',
      ...cubes.dimensions,
      ...cubes.panel_dimensions,
    ])
  })

  it.each(allCubeRows)('kubus %s menutup 60 periode', (_key, rows) => {
    expect(new Set(rows.map((row) => row.period)).size).toBe(60)
  })

  it.each(allCubeRows)('kubus %s menjumlah ke total resmi', (_key, rows) => {
    expect(sumBy(rows, (row) => row.orders)).toBe(TOTAL_ORDERS)
    expect(Math.abs(sumBy(rows, (row) => row.net_sales) - TOTAL_NET_SALES)).toBeLessThanOrEqual(1)
    expect(Math.abs(sumBy(rows, (row) => row.profit) - TOTAL_PROFIT)).toBeLessThanOrEqual(1)
    // mvp-6: the two additive discount-side measures are carried by every cube row.
    expect(Math.abs(sumBy(rows, (row) => row.gross_sales) - TOTAL_GROSS_SALES)).toBeLessThanOrEqual(
      1,
    )
    expect(
      Math.abs(sumBy(rows, (row) => row.discount_amount) - TOTAL_DISCOUNT),
    ).toBeLessThanOrEqual(1)
  })

  it.each(allCubeRows)('kubus %s menulis periode dan margin sesuai kontrak', (_key, rows) => {
    for (const row of rows) {
      expect(row.period).toMatch(/^\d{4}-\d{2}$/)
      expect(typeof row.avg_transaction_margin_pct).toBe('number')
      expect(typeof row.aggregate_margin_pct).toBe('number')
    }
  })

  it.each(filterCubeRows)(
    'kubus filter %s membawa ukuran non-aditif untuk satu subset',
    (_key, rows) => {
      for (const row of rows) {
        expect(typeof row.customers).toBe('number')
        expect(typeof row.avg_transaction_margin_pct).toBe('number')
      }
    },
  )

  it.each(panelCubeRows)(
    'kubus panel %s tidak mengirim customers (non-aditif dan tidak dipakai panel)',
    (_key, rows) => {
      for (const row of rows) {
        expect('customers' in row).toBe(false)
      }
    },
  )

  /**
   * ANC-24..ANC-27: setiap kubus panel wajib mereproduksi jumlah order per nilai yang sudah
   * ditampilkan panel global (time-dimensions.json, discount-brackets.json, anomaly-by-dimension.json),
   * sehingga tampilan terfilter dan tak terfilter tidak mungkin berbeda.
   */
  const panelValueOrders: Array<[string, Record<string, number>]> = [
    [
      'day_type',
      Object.fromEntries(timeDimensions.day_types.map((row) => [row.day_type, row.orders])),
    ],
    [
      'delivery_status',
      Object.fromEntries(timeDimensions.delivery_status.map((row) => [row.value, row.orders])),
    ],
    [
      'discount_bracket',
      Object.fromEntries(brackets.brackets.map((row) => [row.bracket, row.orders])),
    ],
    ['region', Object.fromEntries(anomaly.dimensions.region.map((row) => [row.value, row.orders]))],
  ]

  it.each(panelValueOrders)(
    'kubus panel %s mereproduksi jumlah order per nilai panel global',
    (key, expected) => {
      const rows = cubes.cubes[key as keyof FilterCubes['cubes']] as PeriodRow[]
      const actual = new Map<string, number>()
      for (const row of rows) {
        const value = String((row as unknown as Record<string, unknown>)[key])
        actual.set(value, (actual.get(value) ?? 0) + row.orders)
      }
      expect([...actual.keys()].sort()).toEqual(Object.keys(expected).sort())
      for (const [value, orders] of Object.entries(expected)) {
        expect(actual.get(value), value).toBe(orders)
      }
    },
  )

  /**
   * ANC-28..ANC-31 (mvp-5): the combined cube is the single source for every combinable filter.
   * It carries additive measures only and must reproduce every marginal of the single-dimension
   * cubes and the monthly rows exactly, so filtered and unfiltered views cannot diverge.
   */
  const combined = cubes.cubes.combined

  it('kubus gabungan hanya membawa ukuran aditif', () => {
    for (const row of combined) {
      expect(row.period).toMatch(/^\d{4}-\d{2}$/)
      expect(typeof row.segment).toBe('string')
      expect(typeof row.sales_channel).toBe('string')
      expect(typeof row.order_status).toBe('string')
      expect(typeof row.gross_sales).toBe('number')
      expect(typeof row.discount_amount).toBe('number')
      expect('customers' in row).toBe(false)
      expect('avg_transaction_margin_pct' in row).toBe(false)
    }
  })

  it('setiap baris kubus memenuhi identitas net sales = gross sales - diskon', () => {
    const rowSets: FinancialRow[][] = [combined, ...allCubeRows.map(([, rows]) => rows)]
    for (const rows of rowSets) {
      for (const row of rows) {
        expect(
          Math.abs(row.net_sales - (row.gross_sales - row.discount_amount)),
          `${row.period} selisih lebih dari 3 sen`,
        ).toBeLessThanOrEqual(0.03)
      }
    }
  })

  it('kubus gabungan menjumlah ke total resmi pada 60 periode', () => {
    expect(new Set(combined.map((row) => row.period)).size).toBe(60)
    expect(sumBy(combined, (row) => row.orders)).toBe(TOTAL_ORDERS)
    expect(Math.abs(sumBy(combined, (row) => row.net_sales) - TOTAL_NET_SALES)).toBeLessThanOrEqual(
      1,
    )
    expect(Math.abs(sumBy(combined, (row) => row.profit) - TOTAL_PROFIT)).toBeLessThanOrEqual(1)
    expect(
      Math.abs(sumBy(combined, (row) => row.gross_sales) - TOTAL_GROSS_SALES),
    ).toBeLessThanOrEqual(1)
    expect(
      Math.abs(sumBy(combined, (row) => row.discount_amount) - TOTAL_DISCOUNT),
    ).toBeLessThanOrEqual(1)
  })

  const combinedMarginals: Array<[keyof FilterCubes['cubes'], string]> = [
    ['segment', 'segment'],
    ['sales_channel', 'sales_channel'],
    ['order_status', 'order_status'],
  ]

  it.each(combinedMarginals)(
    'kubus gabungan mereproduksi marginal %s per sel',
    (cubeKey, rowKey) => {
      const expected = new Map<string, FinancialRow>()
      for (const row of cubes.cubes[cubeKey] as FinancialRow[]) {
        expected.set(
          `${row.period}|${String((row as unknown as Record<string, unknown>)[rowKey])}`,
          row,
        )
      }
      const actual = new Map<string, FinancialRow>()
      for (const row of combined) {
        const key = `${row.period}|${String((row as unknown as Record<string, unknown>)[rowKey])}`
        const bucket =
          actual.get(key) ??
          ({
            period: row.period,
            orders: 0,
            net_sales: 0,
            profit: 0,
            gross_sales: 0,
            discount_amount: 0,
            avg_transaction_margin_pct: 0,
            aggregate_margin_pct: 0,
          } as FinancialRow)
        bucket.orders += row.orders
        bucket.net_sales += row.net_sales
        bucket.profit += row.profit
        bucket.gross_sales += row.gross_sales
        bucket.discount_amount += row.discount_amount
        actual.set(key, bucket)
      }
      expect([...actual.keys()].sort()).toEqual([...expected.keys()].sort())
      for (const [key, row] of expected) {
        const bucket = actual.get(key)
        if (!bucket) throw new Error(`sel hilang: ${key}`)
        expect(bucket.orders, key).toBe(row.orders)
        expect(Math.abs(bucket.net_sales - row.net_sales), key).toBeLessThanOrEqual(0.01)
        expect(Math.abs(bucket.profit - row.profit), key).toBeLessThanOrEqual(0.01)
        expect(Math.abs(bucket.gross_sales - row.gross_sales), key).toBeLessThanOrEqual(0.01)
        expect(Math.abs(bucket.discount_amount - row.discount_amount), key).toBeLessThanOrEqual(
          0.01,
        )
      }
    },
  )

  it('kubus gabungan mereproduksi total net sales per bulan', () => {
    const byPeriod = new Map<string, number>()
    for (const row of combined) {
      byPeriod.set(row.period, (byPeriod.get(row.period) ?? 0) + row.net_sales)
    }
    for (const month of monthly.months_by_year) {
      expect(
        Math.abs((byPeriod.get(month.period) ?? 0) - month.net_sales),
        month.period,
      ).toBeLessThanOrEqual(0.01)
    }
  })
})

describe('metrik terlarang', () => {
  function collectKeys(value: unknown, keys: string[] = []): string[] {
    if (Array.isArray(value)) {
      for (const item of value) collectKeys(item, keys)
      return keys
    }
    if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        keys.push(key)
        collectKeys(child, keys)
      }
    }
    return keys
  }

  const FORBIDDEN =
    /clv|romi|lifetime_value|acquisition_cost|customer_order_count|is_repeat_customer/i

  it.each([...CONTRACT_FILES])('%s tidak memuat metrik belum tervalidasi', (name) => {
    const keys = collectKeys(JSON.parse(textOf(published, name)))
    const offenders = keys.filter((key) => FORBIDDEN.test(key))
    expect(offenders).toEqual([])
  })
})
