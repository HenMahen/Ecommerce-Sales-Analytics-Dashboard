/**
 * Uji filter global mvp-5.
 *
 * Dua lapis:
 * 1. Lapis data (tanpa DOM): `selectScopedRows` + `aggregate` dibandingkan dengan anchor
 *    rekonsiliasi independen dari CSV sumber (`%TEMP%/opencode/verify_filters.py`). Tidak ada
 *    angka yang dibaca dari komponen.
 * 2. Lapis antarmuka: bilah filter asli (`FilterProvider` + `GlobalFilterBar`) dengan data asli,
 *    untuk membuktikan setiap kontrol mengubah state, kombinasi berjalan bersamaan, chip aktif
 *    dapat dihapus satu per satu, dan "Hapus semua filter" mengosongkan semuanya.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { DataProvider, useDataState, useDashboardData } from '@/app/DataProvider'
import { FilterProvider, useFilter } from '@/app/FilterProvider'
import { GlobalFilterBar } from '@/components/layout/GlobalFilterBar'
import type {
  AnnualPerformance,
  AnomalyByDimension,
  DashboardData,
  DashboardSummary,
  DatasetMetadata,
  DiscountBrackets,
  FilterCubes,
  MonthlyPerformance,
  SegmentPerformance,
  TimeDimensions,
} from '@/data/types'
import {
  DEFAULT_FILTER,
  aggregate,
  buildSegmentShares,
  buildTrendPoints,
  describeScope,
  selectScopedRows,
  type FilterState,
} from '@/lib/filter'
import { formatCount, formatPercent, formatUsd } from '@/lib/format'

const processedRaw = import.meta.glob<string>('../data/processed/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
})

function textOf(name: string): string {
  const entry = Object.entries(processedRaw).find(([key]) => key.endsWith(`/${name}`))
  if (!entry) throw new Error(`Payload ${name} tidak ditemukan di data/processed`)
  return entry[1]
}

function readPayload<T>(name: string): T {
  return JSON.parse(textOf(name)) as T
}

/** Full DashboardData straight from the processed payloads (no page involved). */
function loadProcessed(): DashboardData {
  return {
    summary: readPayload<DashboardSummary>('dashboard-summary.json'),
    monthly: readPayload<MonthlyPerformance>('monthly-performance.json'),
    segments: readPayload<SegmentPerformance>('segment-performance.json'),
    cubes: readPayload<FilterCubes>('filter-cubes.json'),
    timeDimensions: readPayload<TimeDimensions>('time-dimensions.json'),
    annual: readPayload<AnnualPerformance>('annual-performance.json'),
    discountBrackets: readPayload<DiscountBrackets>('discount-brackets.json'),
    anomaly: readPayload<AnomalyByDimension>('anomaly-by-dimension.json'),
    metadata: readPayload<DatasetMetadata>('metadata.json'),
  }
}

const data = loadProcessed()

/** Filters under test, expressed exactly as the UI stores them. */
const filter = (partial: Partial<FilterState>): FilterState => ({ ...DEFAULT_FILTER, ...partial })

const TOTAL = { orders: 138116, net_sales: 157143214.06, profit: 59232305.35 }

describe('efek setiap filter terhadap kubus gabungan', () => {
  it('tanpa filter = seluruh dataset tervalidasi (keadaan awal)', () => {
    const rows = selectScopedRows(data, DEFAULT_FILTER)
    const metrics = aggregate(rows)
    expect(rows.length).toBeGreaterThan(0)
    expect(metrics.orders).toBe(TOTAL.orders)
    expect(metrics.netSales).toBeCloseTo(TOTAL.net_sales, 2)
    expect(metrics.profit).toBeCloseTo(TOTAL.profit, 2)
    expect(metrics.marginPct).toBeCloseTo((TOTAL.profit / TOTAL.net_sales) * 100, 2)
  })

  it('filter tahun 2024 (rentang 2024-01..2024-12) sama dengan anchor CSV', () => {
    const metrics = aggregate(selectScopedRows(data, filter({ from: '2024-01', to: '2024-12' })))
    expect(metrics.orders).toBe(27768)
    expect(metrics.netSales).toBeCloseTo(31462212.82, 2)
    expect(metrics.profit).toBeCloseTo(11903089.81, 2)
    expect(metrics.marginPct).toBeCloseTo(37.83, 2)
  })

  it('filter rentang 2024-01..2024-06 sama dengan anchor CSV', () => {
    const metrics = aggregate(selectScopedRows(data, filter({ from: '2024-01', to: '2024-06' })))
    expect(metrics.orders).toBe(12131)
    expect(metrics.netSales).toBeCloseTo(13504520.22, 2)
    expect(metrics.profit).toBeCloseTo(5782109.2, 2)
    expect(metrics.marginPct).toBeCloseTo(42.82, 2)
  })

  it('filter segmen VIP sama dengan anchor CSV', () => {
    const metrics = aggregate(selectScopedRows(data, filter({ segment: 'VIP' })))
    expect(metrics.orders).toBe(13957)
    expect(metrics.netSales).toBeCloseTo(15931220.1, 2)
    expect(metrics.profit).toBeCloseTo(5634959.06, 2)
    expect(metrics.marginPct).toBeCloseTo(35.37, 2)
  })

  it('filter sales channel Website sama dengan anchor CSV', () => {
    const metrics = aggregate(selectScopedRows(data, filter({ salesChannel: 'Website' })))
    expect(metrics.orders).toBe(48237)
    expect(metrics.netSales).toBeCloseTo(54871164.5, 2)
    expect(metrics.profit).toBeCloseTo(20722164.95, 2)
  })

  it('filter status order Completed sama dengan anchor CSV dan payload status_margins', () => {
    const metrics = aggregate(selectScopedRows(data, filter({ orderStatus: 'Completed' })))
    expect(metrics.orders).toBe(113559)
    expect(metrics.netSales).toBeCloseTo(127907006.57, 2)
    expect(metrics.profit).toBeCloseTo(45998727.67, 2)

    const fromSummary = data.summary.status_margins.Completed
    expect(metrics.orders).toBe(fromSummary.orders)
    expect(metrics.netSales).toBeCloseTo(fromSummary.net_sales, 2)
    expect(metrics.profit).toBeCloseTo(fromSummary.profit, 2)
  })

  it('kombinasi 2024 + Consumer + Website + Completed sama dengan anchor CSV', () => {
    const metrics = aggregate(
      selectScopedRows(
        data,
        filter({
          from: '2024-01',
          to: '2024-12',
          segment: 'Consumer',
          salesChannel: 'Website',
          orderStatus: 'Completed',
        }),
      ),
    )
    expect(metrics.orders).toBe(4340)
    expect(metrics.netSales).toBeCloseTo(4815590.47, 2)
    expect(metrics.profit).toBeCloseTo(1824763.78, 2)
    expect(metrics.marginPct).toBeCloseTo(37.89, 2)
  })

  it('kombinasi 2023 + Premium + Mobile App + Returned sama dengan anchor CSV', () => {
    const metrics = aggregate(
      selectScopedRows(
        data,
        filter({
          from: '2023-01',
          to: '2023-12',
          segment: 'Premium',
          salesChannel: 'Mobile App',
          orderStatus: 'Returned',
        }),
      ),
    )
    expect(metrics.orders).toBe(194)
    expect(metrics.netSales).toBeCloseTo(251269.28, 2)
    expect(metrics.profit).toBeCloseTo(117687.74, 2)
    expect(metrics.marginPct).toBeCloseTo(46.84, 2)
  })

  it('kombinasi tanpa hasil = nol baris, nol nilai, margin null (bukan NaN)', () => {
    const rows = selectScopedRows(
      data,
      filter({
        from: '2021-01',
        to: '2021-01',
        segment: 'Business',
        salesChannel: 'Marketplace',
        orderStatus: 'Pending',
      }),
    )
    expect(rows).toEqual([])
    const metrics = aggregate(rows)
    expect(metrics.orders).toBe(0)
    expect(metrics.netSales).toBe(0)
    expect(metrics.profit).toBe(0)
    expect(metrics.marginPct).toBeNull()
  })

  it('KPI dan tren konsisten: jumlah poin bulanan = total KPI untuk cakupan yang sama', () => {
    const current = filter({
      from: '2024-01',
      to: '2024-12',
      segment: 'Consumer',
    })
    const rows = selectScopedRows(data, current)
    const metrics = aggregate(rows)
    const points = buildTrendPoints(rows, null)
    expect(points.length).toBe(12)
    expect(points.reduce((total, point) => total + point.netSales, 0)).toBeCloseTo(
      metrics.netSales,
      6,
    )
    expect(points.reduce((total, point) => total + point.profit, 0)).toBeCloseTo(metrics.profit, 6)
    expect(points.reduce((total, point) => total + point.orders, 0)).toBe(metrics.orders)
    for (const point of points) {
      expect(point.marginPct).toBeCloseTo((point.profit / point.netSales) * 100, 6)
    }
  })

  it('porsi segmen dihitung dari cakupan yang sama dan tetap 100%', () => {
    const shares = buildSegmentShares(selectScopedRows(data, DEFAULT_FILTER))
    const shareSum = shares.reduce((total, row) => total + row.sharePct, 0)
    expect(shareSum).toBeCloseTo(100, 2)

    const { segments } = data.segments
    const top = segments.reduce((a, b) => (a.profit > b.profit ? a : b))
    expect(shares[0].segment).toBe(top.segment)
    expect(shares[0].sharePct).toBeCloseTo(top.profit_share_pct, 1)

    const scoped = buildSegmentShares(selectScopedRows(data, filter({ segment: 'VIP' })))
    expect(scoped).toHaveLength(1)
    expect(scoped[0].sharePct).toBeCloseTo(100, 6)
  })
})

beforeAll(() => {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const file = String(input).split('/').pop() ?? ''
    const text = Object.entries(processedRaw).find(([key]) => key.endsWith(`/${file}`))?.[1]
    if (text === undefined) return new Response('tidak ditemukan', { status: 404 })
    return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
})

afterAll(() => {
  vi.unstubAllGlobals()
})

/** Shows what the filter provider currently resolves to, next to the real filter bar. */
function Probe() {
  const current = useDashboardData()
  const { filter: active, activeCount, isActive } = useFilter()
  return (
    <div>
      <p data-testid="scope">{describeScope(current, active)}</p>
      <p data-testid="count">{activeCount}</p>
      <p data-testid="active">{String(isActive)}</p>
      <p data-testid="rows">{aggregate(selectScopedRows(current, active)).orders}</p>
    </div>
  )
}

function Harness() {
  const state = useDataState()
  if (state.status !== 'ready') return <p>memuat</p>
  return (
    <>
      <GlobalFilterBar />
      <Probe />
    </>
  )
}

function renderBar() {
  return render(
    <DataProvider>
      <FilterProvider>
        <Harness />
      </FilterProvider>
    </DataProvider>,
  )
}

async function ready() {
  await waitFor(() => expect(screen.queryByTestId('scope')).toBeInTheDocument())
  expect(screen.queryByText('memuat')).not.toBeInTheDocument()
}

/** Opens one select control and picks an option by its visible label. */
async function chooseOption(control: string, option: string) {
  const trigger = screen.getByLabelText(control)
  fireEvent.click(trigger)
  const item = await screen.findByRole('option', { name: option })
  // base-ui treats a bare click as a "virtual" click unless the pointer started on the item, so
  // the pointer sequence has to be simulated before the click commits the selection.
  fireEvent.pointerDown(item)
  fireEvent.click(item)
}

describe('bilah filter global: setiap filter, kombinasi, penghapusan', () => {
  it('pilih tahun 2024: chip muncul, hitungan benar, hasil menyempit', async () => {
    renderBar()
    await ready()
    expect(screen.getByTestId('scope').textContent).toBe('Seluruh periode 2021-2025')

    await chooseOption('Tahun', '2024')

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    expect(screen.getByTestId('scope').textContent).toBe('Jan 2024 - Des 2024')
    expect(screen.getByRole('button', { name: 'Hapus filter Tahun 2024' })).toBeInTheDocument()
    expect(screen.getByTestId('rows').textContent).toBe('27768')
  })

  it('filter segmen dan channel berjalan bersamaan tanpa saling menggantikan', async () => {
    renderBar()
    await ready()

    await chooseOption('Segmen pelanggan', 'VIP')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Hapus filter Segmen pelanggan: VIP' })),
    )

    await chooseOption('Sales channel', 'Website')
    await chooseOption('Status order', 'Completed')

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'))
    expect(
      screen.getByRole('button', { name: 'Hapus filter Segmen pelanggan: VIP' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Hapus filter Sales channel: Website' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Hapus filter Status order: Completed' }),
    ).toBeInTheDocument()

    const expectedOrders = data.cubes.cubes.combined
      .filter(
        (row) =>
          row.segment === 'VIP' &&
          row.sales_channel === 'Website' &&
          row.order_status === 'Completed',
      )
      .reduce((total, row) => total + row.orders, 0)
    expect(screen.getByTestId('rows').textContent).toBe(String(expectedOrders))
  })

  it('chip dapat dihapus satu per satu tanpa menyentuh filter lain', async () => {
    renderBar()
    await ready()

    await chooseOption('Tahun', '2024')
    await chooseOption('Segmen pelanggan', 'Consumer')
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'))

    fireEvent.click(screen.getByRole('button', { name: 'Hapus filter Tahun 2024' }))

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    expect(screen.getByTestId('scope').textContent).toBe('Segmen pelanggan: Consumer')
    expect(
      screen.queryByRole('button', { name: 'Hapus filter Tahun 2024' }),
    ).not.toBeInTheDocument()
  })

  it('"Hapus semua filter" mengembalikan keadaan awal seluruh dataset', async () => {
    renderBar()
    await ready()

    await chooseOption('Tahun', '2023')
    await chooseOption('Segmen pelanggan', 'Business')
    await chooseOption('Status order', 'Returned')
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'))

    fireEvent.click(screen.getByRole('button', { name: /Hapus semua filter/ }))

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'))
    expect(screen.getByTestId('scope').textContent).toBe('Seluruh periode 2021-2025')
    expect(screen.getByTestId('rows').textContent).toBe(String(TOTAL.orders))
    expect(screen.getByText('Tanpa filter')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hapus filter/ })).not.toBeInTheDocument()
  })

  it('rentang kustom dan pilih tahun tidak saling bertentangan', async () => {
    renderBar()
    await ready()

    await chooseOption('Dari bulan', 'Mar 2024')
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    expect(screen.getByTestId('scope').textContent).toBe('Mar 2024 - Des 2025')
    expect(screen.getByLabelText('Tahun').textContent).toContain('Rentang kustom')

    await chooseOption('Tahun', '2023')
    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('Jan 2023 - Des 2023'))
    expect(screen.getByLabelText('Tahun').textContent).toContain('2023')
    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('kombinasi tanpa hasil: bilah tetap jujur menampilkan filter aktif dan 0 baris', async () => {
    renderBar()
    await ready()

    await chooseOption('Dari bulan', 'Jan 2021')
    await chooseOption('Sampai bulan', 'Jan 2021')
    await chooseOption('Segmen pelanggan', 'Business')
    await chooseOption('Sales channel', 'Marketplace')
    await chooseOption('Status order', 'Pending')

    await waitFor(() => expect(screen.getByTestId('rows').textContent).toBe('0'))
    expect(screen.getByTestId('count').textContent).toBe('4')
    expect(screen.getByTestId('active').textContent).toBe('true')
    expect(screen.getByTestId('scope').textContent).toContain('Jan 2021')
    expect(
      screen.getByRole('button', { name: 'Hapus filter Status order: Pending' }),
    ).toBeInTheDocument()
  })
})

describe('format angka pada lapisan data tetap konsisten', () => {
  it('membandingkan representasi tampilan KPI dengan nilai agregat yang sama', () => {
    const metrics = aggregate(selectScopedRows(data, filter({ segment: 'VIP' })))
    expect(formatUsd(metrics.netSales)).toBe('$15.931.220')
    expect(formatCount(metrics.orders)).toBe('13.957')
    expect(formatPercent(metrics.marginPct ?? 0)).toBe('35,37%')
  })
})
