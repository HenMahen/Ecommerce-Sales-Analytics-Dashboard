/**
 * Integration test halaman Ringkasan Eksekutif: filter global gabungan (mvp-5), tren terpisah,
 * wawasan bisnis, dan keadaan kosong.
 *
 * Halaman dirender dengan `DataProvider` asli (JSON asli dari `data/processed/` lewat stub `fetch`)
 * dan router internal asli, jadi pemuat data, pemeriksaan rekonsiliasi, dan komponen tampilan
 * benar-benar dijalankan. Hanya status filter yang disuntikkan.
 *
 * Angka harapan berasal dari rekonsiliasi independen dari CSV sumber
 * (`%TEMP%/opencode/verify_filters.py`, basis C) dan dari payload pipeline; tidak ada nilai yang
 * dibaca dari halaman.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataProvider, useDataState } from '@/app/DataProvider'
import { RouterProvider } from '@/app/router'
import { ExecutiveOverviewPage } from '@/features/executive-overview/ExecutiveOverviewPage'
import { DEFAULT_FILTER, type FilterState } from '@/lib/filter'
import { formatCountScaled, formatPercent, formatPeriodLabel, formatUsdScaled } from '@/lib/format'

const filterState = vi.hoisted(() => ({
  current: {
    from: null,
    to: null,
    segment: null,
    salesChannel: null,
    orderStatus: null,
  } as unknown as FilterState,
}))

vi.mock('@/app/FilterProvider', () => ({
  useFilter: () => ({
    filter: filterState.current,
    setPeriod: () => {},
    setDimension: () => {},
    setYear: () => {},
    reset: () => {},
    isActive: Boolean(
      filterState.current.from ||
      filterState.current.to ||
      filterState.current.segment ||
      filterState.current.salesChannel ||
      filterState.current.orderStatus,
    ),
    activeCount: 0,
  }),
}))

/** Payload asli dari `data/processed/`, dibaca lewat mekanisme yang sama dengan uji integritas. */
const processedRaw = import.meta.glob<string>('../data/processed/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
})

/** Rekonsiliasi independen rentang 2024-01..2024-12 (basis C dari CSV sumber). */
const RANGE_2024 = {
  orders: 27768,
  net_sales: 31462212.82,
  profit: 11903089.81,
  delivery_on_time_orders: 17380,
  status_completed_orders: 22670,
  status_completed_net_sales: 25454307.22,
  status_completed_profit: 9194798.61,
}

/**
 * Rekonsiliasi independen per kombinasi filter (basis C dari CSV sumber,
 * `%TEMP%/opencode/verify_filters.py` -> `filter-expected.json`).
 */
const FILTER_ANCHORS = {
  segmentVip: { orders: 13957, net_sales: 15931220.1, profit: 5634959.06 },
  channelWebsite: { orders: 48237, net_sales: 54871164.5, profit: 20722164.95 },
  statusCompleted: { orders: 113559, net_sales: 127907006.57, profit: 45998727.67 },
  combo2024ConsumerWebsiteCompleted: {
    orders: 4340,
    net_sales: 4815590.47,
    profit: 1824763.78,
  },
  combo2023PremiumMobileReturned: {
    orders: 194,
    net_sales: 251269.28,
    profit: 117687.74,
  },
} as const

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

beforeEach(() => {
  filterState.current = { ...DEFAULT_FILTER }
  window.history.pushState(null, '', '/')
})

function Harness() {
  const state = useDataState()
  if (state.status === 'loading') return <p>memuat data</p>
  if (state.status === 'error') return <p>galat: {state.title}</p>
  return <ExecutiveOverviewPage />
}

function renderPage() {
  return render(
    <RouterProvider>
      <DataProvider>
        <Harness />
      </DataProvider>
    </RouterProvider>,
  )
}

/** Locates a ChartCard by its title, so assertions stay scoped to one panel. */
function card(title: string): HTMLElement {
  const node = screen.getByText(title).closest('[data-slot="card"]')
  if (!node) throw new Error(`Kartu "${title}" tidak ditemukan.`)
  return node as HTMLElement
}

/**
 * Opens a tile's click-popover explanation. The popup renders in a portal, so its content is read
 * from `screen`, not from the card node.
 */
function openHint(label: string): void {
  fireEvent.click(screen.getByRole('button', { name: `Penjelasan ${label}` }))
}

/** Waits for a portal popover whose text contains `expected`. */
async function findHintContent(expected: string): Promise<HTMLElement> {
  return screen.findByText((text) => text.includes(expected))
}

/** KPI group: keeps value assertions away from legend/table copies of the same number. */
async function kpi(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: 'Indikator utama' })
}

interface MonthlyPayload {
  months_by_year: Array<{
    period: string
    orders: number
    net_sales: number
    profit: number
    avg_transaction_margin_pct: number
    aggregate_margin_pct: number
  }>
}

interface SummaryPayload {
  totals: { orders: number; net_sales: number; profit: number }
  status_margins: Record<string, { orders: number; net_sales: number; profit: number }>
}

interface SegmentsPayload {
  segments: Array<{ segment: string; profit: number; profit_share_pct: number }>
}

interface CombinedPayload {
  cubes: {
    combined: Array<{
      period: string
      segment: string
      sales_channel: string
      order_status: string
      orders: number
      net_sales: number
      profit: number
    }>
  }
}

/** Reads one payload straight from `data/processed/`, never from the rendered page. */
function readPayload<T>(name: string): T {
  const entry = Object.entries(processedRaw).find(([key]) => key.endsWith(`/${name}`))
  if (!entry) throw new Error(`Payload ${name} tidak ditemukan di data/processed`)
  return JSON.parse(entry[1]) as T
}

function topBy<T>(rows: T[], value: (row: T) => number): T {
  return rows.reduce((best, row) => (value(row) > value(best) ? row : best))
}

describe('Ringkasan Eksekutif: cakupan filter gabungan (mvp-5)', () => {
  it('tanpa filter memakai seluruh dataset pada KPI, tabel status, dan pengiriman', async () => {
    renderPage()

    const summaryTotals = readPayload<SummaryPayload>('dashboard-summary.json').totals
    expect(
      await within(await kpi()).findByText(formatUsdScaled(summaryTotals.net_sales)),
    ).toBeInTheDocument()

    const delivery = card('Status pengiriman')
    expect(within(delivery).getByText('62,93% · 86,92 ribu order')).toBeInTheDocument()
    expect(within(delivery).getByText('Seluruh periode 2021-2025')).toBeInTheDocument()

    const status = card('Status order: volume, penjualan, dan margin')
    expect(within(status).getByText('35,96%')).toBeInTheDocument()

    const { segments } = readPayload<SegmentsPayload>('segment-performance.json')
    const topSegment = topBy(segments, (row) => row.profit)
    const donut = card('Komposisi profit per segmen')
    expect(within(donut).getByText(formatPercent(topSegment.profit_share_pct))).toBeInTheDocument()

    const sales = card('Tren penjualan bersih bulanan')
    expect(within(sales).getByText('Seluruh periode 2021-2025')).toBeInTheDocument()

    expect(screen.queryByText(/Rekonsiliasi data gagal/)).not.toBeInTheDocument()
  })

  it('rentang bulan 2024 mengubah KPI, status kirim, dan tabel status order', async () => {
    filterState.current = { ...DEFAULT_FILTER, from: '2024-01', to: '2024-12' }
    renderPage()

    expect(
      await within(await kpi()).findByText(formatUsdScaled(RANGE_2024.net_sales)),
    ).toBeInTheDocument()
    expect(within(await kpi()).getByText(formatCountScaled(RANGE_2024.orders))).toBeInTheDocument()
    expect(
      within(await kpi()).getByText(
        formatPercent((RANGE_2024.profit / RANGE_2024.net_sales) * 100),
      ),
    ).toBeInTheDocument()

    const delivery = card('Status pengiriman')
    expect(
      within(delivery).getByText(
        `${formatPercent((RANGE_2024.delivery_on_time_orders / RANGE_2024.orders) * 100)} · ${formatCountScaled(RANGE_2024.delivery_on_time_orders)} order`,
      ),
    ).toBeInTheDocument()

    const status = card('Status order: volume, penjualan, dan margin')
    expect(
      within(status).getByText(
        formatPercent(
          (RANGE_2024.status_completed_profit / RANGE_2024.status_completed_net_sales) * 100,
        ),
      ),
    ).toBeInTheDocument()
    expect(
      within(status).getByText(formatCountScaled(RANGE_2024.status_completed_orders)),
    ).toBeInTheDocument()
    expect(within(status).getByText('Mengikuti filter')).toBeInTheDocument()
  })

  it('filter segmen tunggal: KPI terfilter, pengiriman disembunyikan, bukan ditampilkan tanpa filter', async () => {
    filterState.current = { ...DEFAULT_FILTER, segment: 'VIP' }
    renderPage()

    const { segmentVip } = FILTER_ANCHORS
    expect(
      await within(await kpi()).findByText(formatUsdScaled(segmentVip.net_sales)),
    ).toBeInTheDocument()
    expect(within(await kpi()).getByText(formatCountScaled(segmentVip.orders))).toBeInTheDocument()
    expect(
      within(await kpi()).getByText(
        formatPercent((segmentVip.profit / segmentVip.net_sales) * 100),
      ),
    ).toBeInTheDocument()

    const delivery = card('Status pengiriman')
    expect(within(delivery).getByText('Panel tidak mengikuti filter dimensi')).toBeInTheDocument()
    expect(within(delivery).queryByText('62,93% · 86,92 ribu order')).not.toBeInTheDocument()

    const insights = card('Wawasan bisnis')
    expect(within(insights).getAllByText('Mengikuti filter')).toHaveLength(4)
  })

  it('kombinasi 2024 + Consumer + Website + Completed cocok dengan rekonsiliasi CSV', async () => {
    filterState.current = {
      from: '2024-01',
      to: '2024-12',
      segment: 'Consumer',
      salesChannel: 'Website',
      orderStatus: 'Completed',
    }
    renderPage()

    const { combo2024ConsumerWebsiteCompleted: combo } = FILTER_ANCHORS
    expect(
      await within(await kpi()).findByText(formatUsdScaled(combo.net_sales)),
    ).toBeInTheDocument()
    expect(within(await kpi()).getByText(formatUsdScaled(combo.profit))).toBeInTheDocument()
    expect(within(await kpi()).getByText(formatCountScaled(combo.orders))).toBeInTheDocument()
    expect(
      within(await kpi()).getByText(formatPercent((combo.profit / combo.net_sales) * 100)),
    ).toBeInTheDocument()

    const status = card('Status order: volume, penjualan, dan margin')
    expect(within(status).getByText('Completed')).toBeInTheDocument()

    const delivery = card('Status pengiriman')
    expect(within(delivery).getByText('Panel tidak mengikuti filter dimensi')).toBeInTheDocument()
  })

  it('kombinasi 2023 + Premium + Mobile App + Returned cocok dengan rekonsiliasi CSV', async () => {
    filterState.current = {
      from: '2023-01',
      to: '2023-12',
      segment: 'Premium',
      salesChannel: 'Mobile App',
      orderStatus: 'Returned',
    }
    renderPage()

    const { combo2023PremiumMobileReturned: combo } = FILTER_ANCHORS
    expect(
      await within(await kpi()).findByText(formatUsdScaled(combo.net_sales)),
    ).toBeInTheDocument()
    expect(within(await kpi()).getByText(formatCountScaled(combo.orders))).toBeInTheDocument()
    expect(
      within(await kpi()).getByText(formatPercent((combo.profit / combo.net_sales) * 100)),
    ).toBeInTheDocument()

    const status = card('Status order: volume, penjualan, dan margin')
    expect(within(status).getByText('Returned')).toBeInTheDocument()
  })

  it('KPI, tren, dan tabel status memakai cakupan yang sama (Σ poin bulanan = total KPI)', async () => {
    filterState.current = {
      from: '2024-01',
      to: '2024-12',
      segment: 'Consumer',
      salesChannel: null,
      orderStatus: null,
    }
    renderPage()

    const { cubes } = readPayload<CombinedPayload>('filter-cubes.json')
    const scoped = cubes.combined.filter(
      (row) => row.period >= '2024-01' && row.period <= '2024-12' && row.segment === 'Consumer',
    )
    const totalNetSales = scoped.reduce((total, row) => total + row.net_sales, 0)
    const totalOrders = scoped.reduce((total, row) => total + row.orders, 0)

    expect(await within(await kpi()).findByText(formatUsdScaled(totalNetSales))).toBeInTheDocument()
    expect(within(await kpi()).getByText(formatCountScaled(totalOrders))).toBeInTheDocument()

    const sales = card('Tren penjualan bersih bulanan')
    expect(within(sales).getByText('Mengikuti filter')).toBeInTheDocument()
    expect(within(sales).queryByText('Tidak ada bulan pada rentang ini')).not.toBeInTheDocument()

    const profit = card('Tren laba bulanan')
    expect(within(profit).getByText('Mengikuti filter')).toBeInTheDocument()
  })

  it('kombinasi filter tanpa hasil: banner, keadaan kosong, dan tanpa angka palsu', async () => {
    filterState.current = {
      from: '2021-01',
      to: '2021-01',
      segment: 'Business',
      salesChannel: 'Marketplace',
      orderStatus: 'Pending',
    }
    renderPage()

    expect(await screen.findByText(/Tidak ada data untuk kombinasi filter ini/)).toBeInTheDocument()
    expect(screen.getAllByText('Tidak ada bulan pada rentang ini')).toHaveLength(2)
    expect(screen.getByText('Tidak ada data segmen pada cakupan ini')).toBeInTheDocument()
    expect(screen.getByText('Tidak ada bulan kalender pada cakupan ini')).toBeInTheDocument()
    expect(screen.getByText('Tidak ada status order pada cakupan ini')).toBeInTheDocument()
    expect(screen.getByText('Belum ada wawasan pada rentang ini')).toBeInTheDocument()
    expect(within(await kpi()).getAllByText('$0,00')).toHaveLength(2)
    expect(within(await kpi()).getByText('—')).toBeInTheDocument()
  })

  it('rentang di luar data menampilkan keadaan kosong, bukan angka palsu', async () => {
    filterState.current = { ...DEFAULT_FILTER, from: '2030-01', to: '2030-12' }
    renderPage()

    expect(await screen.findByText(/Tidak ada data untuk kombinasi filter ini/)).toBeInTheDocument()
    expect(screen.getAllByText('Tidak ada bulan pada rentang ini')).toHaveLength(2)
    expect(screen.getByText('Tidak ada data pengiriman pada rentang ini')).toBeInTheDocument()
    expect(within(await kpi()).getAllByText('$0,00')).toHaveLength(2)
    expect(within(await kpi()).getByText('—')).toBeInTheDocument()
  })

  it('deskripsi kartu terbuka saat ikon diklik, bukan saat hover', async () => {
    renderPage()

    const trigger = await screen.findByRole('button', { name: 'Penjelasan Margin keseluruhan' })
    expect(screen.queryByText(/Persentase laba dari total penjualan/)).not.toBeInTheDocument()

    fireEvent.click(trigger)
    expect(await screen.findByText(/Persentase laba dari total penjualan/)).toBeInTheDocument()
  })
})

describe('Ringkasan Eksekutif: tren terpisah, wawasan, dan kosakata', () => {
  it('memisahkan tren net sales dan tren laba, dengan legenda yang terbaca', async () => {
    renderPage()

    await screen.findByText('Tren laba bulanan')

    const sales = card('Tren penjualan bersih bulanan')
    expect(within(sales).getByText('Net sales')).toBeInTheDocument()
    expect(within(sales).getByText('Margin keseluruhan')).toBeInTheDocument()

    const profit = card('Tren laba bulanan')
    expect(within(profit).getByText('Profit')).toBeInTheDocument()
    expect(within(profit).queryByText('Margin keseluruhan')).not.toBeInTheDocument()
  })

  it('wawasan bisnis adalah pemeringkatan dan porsi dari payload, bukan angka baru', async () => {
    renderPage()

    await screen.findByText('Wawasan bisnis')
    const insights = card('Wawasan bisnis')

    const { months_by_year: monthly } = readPayload<MonthlyPayload>('monthly-performance.json')
    const bestNet = topBy(monthly, (row) => row.net_sales)
    const netTotal = monthly.reduce((total, row) => total + row.net_sales, 0)
    expect(within(insights).getAllByText(formatPeriodLabel(bestNet.period)).length).toBeGreaterThan(
      0,
    )
    openHint('Bulan penjualan bersih tertinggi')
    expect(
      await findHintContent(
        `${formatUsdScaled(bestNet.net_sales)} · ${formatPercent((bestNet.net_sales / netTotal) * 100)} dari net sales cakupan`,
      ),
    ).toBeInTheDocument()

    const bestProfit = topBy(monthly, (row) => row.profit)
    const profitTotal = monthly.reduce((total, row) => total + row.profit, 0)
    expect(
      within(insights).getAllByText(formatPeriodLabel(bestProfit.period)).length,
    ).toBeGreaterThan(0)
    openHint('Bulan laba tertinggi')
    expect(
      await findHintContent(
        `${formatUsdScaled(bestProfit.profit)} · ${formatPercent((bestProfit.profit / profitTotal) * 100)} dari laba cakupan`,
      ),
    ).toBeInTheDocument()

    const summary = readPayload<SummaryPayload>('dashboard-summary.json')
    const statuses = Object.entries(summary.status_margins).map(([status, row]) => ({
      status,
      ...row,
    }))
    const topStatus = topBy(statuses, (row) => row.orders)
    const statusOrders = statuses.reduce((total, row) => total + row.orders, 0)
    expect(within(insights).getByText(topStatus.status)).toBeInTheDocument()
    openHint('Status order dominan')
    expect(
      await findHintContent(
        `${formatCountScaled(topStatus.orders)} order · ${formatPercent((topStatus.orders / statusOrders) * 100)} dari order tercatat`,
      ),
    ).toBeInTheDocument()

    const { segments } = readPayload<SegmentsPayload>('segment-performance.json')
    const topSegment = topBy(segments, (row) => row.profit)
    expect(within(insights).getByText(topSegment.segment)).toBeInTheDocument()
    openHint('Segmen penyumbang laba terbesar')
    expect(
      await findHintContent(
        `${formatUsdScaled(topSegment.profit)} · ${formatPercent(topSegment.profit_share_pct)} dari laba cakupan`,
      ),
    ).toBeInTheDocument()

    expect(within(insights).getAllByText('Seluruh periode 2021-2025')).toHaveLength(4)
  })

  it('cakupan 2024 mengikuti rentang dan setiap kartu wawasan menyatakan cakupan yang sama', async () => {
    filterState.current = { ...DEFAULT_FILTER, from: '2024-01', to: '2024-12' }
    renderPage()

    await screen.findByText(formatUsdScaled(RANGE_2024.net_sales))

    const insights = card('Wawasan bisnis')
    const monthly = readPayload<MonthlyPayload>('monthly-performance.json').months_by_year.filter(
      (row) => row.period >= '2024-01' && row.period <= '2024-12',
    )
    const bestNet = topBy(monthly, (row) => row.net_sales)
    const netTotal = monthly.reduce((total, row) => total + row.net_sales, 0)
    expect(within(insights).getAllByText(formatPeriodLabel(bestNet.period)).length).toBeGreaterThan(
      0,
    )
    openHint('Bulan penjualan bersih tertinggi')
    expect(
      await findHintContent(
        `${formatUsdScaled(bestNet.net_sales)} · ${formatPercent((bestNet.net_sales / netTotal) * 100)} dari net sales cakupan`,
      ),
    ).toBeInTheDocument()

    expect(within(insights).getAllByText('Mengikuti filter')).toHaveLength(4)
  })

  it('legenda musiman menjelaskan batang biasa dan bulan tertinggi', async () => {
    renderPage()

    await screen.findByText('Musiman per bulan kalender')
    const seasonCard = card('Musiman per bulan kalender')
    expect(within(seasonCard).getByText('Net sales')).toBeInTheDocument()
    expect(within(seasonCard).getByText('Bulan net sales tertinggi')).toBeInTheDocument()
  })

  it('tidak memuat kosakata pertumbuhan atau pembanding antar-periode', async () => {
    renderPage()

    await screen.findByText('Wawasan bisnis')

    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/pertumbuhan|meningkat|menurun|\bnaik\b|\bturun\b/i)
    expect(text).not.toMatch(/year-over-year|\bYoY\b/)
  })
})

it('menjaga util waitFor tetap terpakai untuk kasus asinkron', async () => {
  renderPage()
  await waitFor(() => expect(screen.queryByText('memuat data')).not.toBeInTheDocument())
})
