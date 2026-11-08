/**
 * Integration test halaman Sales & Profitabilitas: label metrik (penyebut diskon/margin), konsistensi
 * filter global (mvp-6), data grafik, tabel bracket 5 baris, dan narasi tahunan "Stabilitas/Datar".
 *
 * Halaman dirender dengan `DataProvider` asli (JSON asli dari `data/processed/` lewat stub `fetch`)
 * dan router internal asli; hanya status filter yang disuntikkan. Angka harapan berasal dari
 * rekonsiliasi independen CSV sumber (`%TEMP%/opencode/verify_filters.py`, basis C) dan dari payload
 * pipeline - tidak ada nilai yang dibaca dari halaman.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataProvider, useDataState } from '@/app/DataProvider'
import { RouterProvider } from '@/app/router'
import { SalesProfitabilityPage } from '@/features/sales-profitability/SalesProfitabilityPage'
import type {
  AnnualPerformance,
  CombinedCubeRow,
  DiscountBrackets,
  FilterCubes,
  MonthlyPerformance,
  TimeDimensions,
} from '@/data/types'
import {
  aggregateFinancials,
  buildAnnualScopeRows,
  buildBracketPoints,
  buildGranularityPoints,
  buildQuarterPoints,
  DEFAULT_FILTER,
  type FilterState,
} from '@/lib/filter'

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

/** Rekonsiliasi independen per kombinasi filter (basis C dari CSV sumber, `filter-expected.json`). */
const FILTER_ANCHORS = {
  all: { orders: 138116, gross_sales: 189962560.88, discount_amount: 32819346.82 },
  year2024: { orders: 27768, gross_sales: 37987554.18, discount_amount: 6525341.36 },
  segmentVip: { orders: 13957, gross_sales: 19963213.39, discount_amount: 4031993.29 },
  combo2024ConsumerWebsiteCompleted: {
    orders: 4340,
    gross_sales: 5816627.0,
    discount_amount: 1001036.53,
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
  window.history.pushState(null, '', '/sales')
})

function Harness() {
  const state = useDataState()
  if (state.status === 'loading') return <p>memuat data</p>
  if (state.status === 'error') return <p>galat: {state.title}</p>
  return <SalesProfitabilityPage />
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
 * Opens a card's click-popover description. The popup renders in a portal, so the returned node
 * must be queried through `screen`, not through the card element.
 */
function openHint(label: string): void {
  fireEvent.click(screen.getByRole('button', { name: `Penjelasan ${label}` }))
}

/** KPI group: keeps value assertions away from legend/table copies of the same number. */
async function kpi(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: 'Indikator finansial' })
}

/** Reads one payload straight from `data/processed/`, never from the rendered page. */
function readPayload<T>(name: string): T {
  const text = Object.entries(processedRaw).find(([key]) => key.endsWith(`/${name}`))?.[1]
  if (text === undefined) throw new Error(`Berkas tidak ditemukan: ${name}`)
  return JSON.parse(text) as T
}

describe('Sales & Profitabilitas - label metrik dan KPI', () => {
  it('menampilkan KPI finansial tanpa filter dengan nilai acuan seluruh periode', async () => {
    renderPage()
    const region = await kpi()
    const view = within(region)

    expect(view.getByText('Gross sales')).toBeDefined()
    expect(view.getByText('$189,96 juta')).toBeDefined()
    expect(view.getByText('Total diskon diberikan')).toBeDefined()
    expect(view.getByText('$32,82 juta')).toBeDefined()
    expect(view.getByText('Tingkat diskon terbobot')).toBeDefined()
    expect(view.getByText('17,28%')).toBeDefined()
    expect(view.getByText('Net sales')).toBeDefined()
    expect(view.getByText('$157,14 juta')).toBeDefined()
    expect(view.getByText('Profit')).toBeDefined()
    expect(view.getByText('$59,23 juta')).toBeDefined()
    expect(view.getByText('Margin keseluruhan')).toBeDefined()
    expect(view.getByText('37,69%')).toBeDefined()
    expect(view.getByText('138,12 ribu')).toBeDefined()
    expect(view.getByText('Nilai Kerugian')).toBeDefined()
    expect(view.getByText('$426,31 ribu')).toBeDefined()
    // Nilai Kerugian diberi label periode penuh karena non-aditif.
    expect(view.getByText('Seluruh periode 2021-2025')).toBeDefined()

    // Deskripsi penyebut dibuka lewat klik ikon kartu, bukan hover.
    openHint('Nilai Kerugian')
    const lossDescription = await screen.findByText(/2\.530 pesanan rugi/)
    expect(lossDescription.textContent).toMatch(/1,83% dari seluruh pesanan/)
    expect(lossDescription.textContent).toMatch(/seluruh periode/i)
  })

  it('memberi label penyebut pada metrik diskon dan margin', async () => {
    renderPage()
    const region = await kpi()
    const view = within(region)

    // Basis margin keseluruhan dipindah ke penjelasan ikon, bukan tag di bawah nilai.
    expect(view.queryByText('Margin keseluruhan (utama)')).toBeNull()

    openHint('Tingkat diskon terbobot')
    expect(
      await screen.findByText(/Berbobot nilai, jadi beda dengan rata-rata per pesanan/),
    ).toBeDefined()

    openHint('Margin keseluruhan')
    expect(await screen.findByText(/Berbobot nilai, bukan rata-rata per transaksi/)).toBeDefined()
  })
})

describe('Sales & Profitabilitas - konsistensi filter global', () => {
  it('menghitung ulang tingkat diskon terbobot pada rentang 2024', async () => {
    filterState.current = { ...DEFAULT_FILTER, from: '2024-01', to: '2024-12' }
    renderPage()
    const region = await kpi()
    const view = within(region)

    expect(view.getByText('$37,99 juta')).toBeDefined()
    expect(view.getByText('$6,53 juta')).toBeDefined()
    expect(view.getByText('17,18%')).toBeDefined()
    expect(view.getByText('$31,46 juta')).toBeDefined()
    expect(view.getByText('$11,90 juta')).toBeDefined()
    expect(view.getByText('37,83%')).toBeDefined()
    expect(view.getByText('27,77 ribu')).toBeDefined()
  })

  it('konsisten pada kombinasi bulan x segmen x channel x status', async () => {
    filterState.current = {
      from: '2024-01',
      to: '2024-12',
      segment: 'Consumer',
      salesChannel: 'Website',
      orderStatus: 'Completed',
    }
    renderPage()
    const region = await kpi()
    const view = within(region)

    expect(view.getByText('$5,82 juta')).toBeDefined()
    expect(view.getByText('$1,00 juta')).toBeDefined()
    expect(view.getByText('17,21%')).toBeDefined()
    expect(view.getByText('$4,82 juta')).toBeDefined()
    expect(view.getByText('$1,82 juta')).toBeDefined()
    expect(view.getByText('37,89%')).toBeDefined()
    expect(view.getByText('4,34 ribu')).toBeDefined()
  })

  it('menyembunyikan panel period-only saat filter dimensi aktif', async () => {
    filterState.current = { ...DEFAULT_FILTER, segment: 'VIP' }
    renderPage()
    const region = await kpi()
    expect(within(region).getByText('$15,93 juta')).toBeDefined()
    expect(within(region).getByText('20,20%')).toBeDefined()

    const dayCard = card('Hari kerja vs akhir pekan')
    expect(within(dayCard).getByText('Panel tidak mengikuti filter dimensi')).toBeDefined()
    expect(within(dayCard).queryByText(/98\.686/)).toBeNull()

    const bracketCard = card('Analisis bracket diskon')
    expect(within(bracketCard).getByText('Panel tidak mengikuti filter dimensi')).toBeDefined()
  })

  it('legenda perbandingan saluran memisahkan batang net sales dan garis margin', async () => {
    renderPage()

    await screen.findByText('Perbandingan saluran penjualan')
    const channelCard = card('Perbandingan saluran penjualan')
    expect(within(channelCard).getByText('Net sales')).toBeInTheDocument()
    expect(within(channelCard).getByText('Margin keseluruhan')).toBeInTheDocument()
  })

  it('menampilkan banner cakupan kosong untuk kombinasi tanpa data', async () => {
    filterState.current = {
      from: '2021-01',
      to: '2021-01',
      segment: 'Business',
      salesChannel: 'Marketplace',
      orderStatus: 'Pending',
    }
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(
          'Tidak ada data untuk kombinasi filter ini. Hapus semua filter untuk kembali ke seluruh dataset.',
        ),
      ).toBeDefined()
    })
  })
})

describe('Sales & Profitabilitas - data grafik dari payload', () => {
  const cubes = readPayload<FilterCubes>('filter-cubes.json')
  const monthly = readPayload<MonthlyPerformance>('monthly-performance.json')
  const annual = readPayload<AnnualPerformance>('annual-performance.json')
  const brackets = readPayload<DiscountBrackets>('discount-brackets.json')
  const timeDimensions = readPayload<TimeDimensions>('time-dimensions.json')
  const combined: CombinedCubeRow[] = cubes.cubes.combined

  it('agregat finansial kubus gabungan cocok dengan total resmi', () => {
    const metrics = aggregateFinancials(combined)
    expect(metrics.orders).toBe(FILTER_ANCHORS.all.orders)
    expect(Math.abs(metrics.grossSales - FILTER_ANCHORS.all.gross_sales)).toBeLessThanOrEqual(1)
    expect(
      Math.abs(metrics.discountAmount - FILTER_ANCHORS.all.discount_amount),
    ).toBeLessThanOrEqual(1)
    expect(metrics.weightedDiscountPct).toBeCloseTo(17.28, 2)
  })

  it('tren bulan/kuartal/tahun mengelompokkan ulang baris yang sama', () => {
    const month = buildGranularityPoints(combined, 'month')
    const quarter = buildGranularityPoints(combined, 'quarter')
    const year = buildGranularityPoints(combined, 'year')
    expect(month).toHaveLength(60)
    expect(quarter).toHaveLength(20)
    expect(year).toHaveLength(5)

    const totalMonth = month.reduce((total, point) => total + point.netSales, 0)
    const totalQuarter = quarter.reduce((total, point) => total + point.netSales, 0)
    const totalYear = year.reduce((total, point) => total + point.netSales, 0)
    expect(Math.abs(totalMonth - totalQuarter)).toBeLessThanOrEqual(0.01)
    expect(Math.abs(totalMonth - totalYear)).toBeLessThanOrEqual(0.01)

    // Titik kuartalan = jumlah tiga bulan pada payload bulanan yang telah tervalidasi.
    const q1_2024 = quarter.find((point) => point.key === '2024-Q1')
    const monthsQ1_2024 = monthly.months_by_year
      .filter((row) => row.period >= '2024-01' && row.period <= '2024-03')
      .reduce((total, row) => total + row.net_sales, 0)
    expect(q1_2024).toBeDefined()
    expect(Math.abs((q1_2024?.netSales ?? 0) - monthsQ1_2024)).toBeLessThanOrEqual(0.01)

    // Titik tahunan = jumlah payload tahunan yang telah tervalidasi.
    for (const row of annual.years) {
      const point = year.find((item) => item.key === String(row.year))
      expect(point, String(row.year)).toBeDefined()
      expect(
        Math.abs((point?.netSales ?? 0) - row.net_sales),
        String(row.year),
      ).toBeLessThanOrEqual(0.01)
      expect(point?.marginPct ?? 0).toBeCloseTo(row.aggregate_margin_pct, 2)
    }
  })

  it('YoY tahunan dihitung dengan rumus pipeline yang sama', () => {
    const rows = buildAnnualScopeRows(combined)
    expect(rows).toHaveLength(5)
    for (const row of rows) {
      const anchor = annual.years.find((item) => String(item.year) === row.year)
      expect(anchor, row.year).toBeDefined()
      if (anchor?.revenue_yoy_pct === null) {
        expect(row.revenueYoyPct).toBeNull()
      } else {
        expect(row.revenueYoyPct ?? 0).toBeCloseTo(anchor?.revenue_yoy_pct ?? 0, 2)
        expect(row.profitYoyPct ?? 0).toBeCloseTo(anchor?.profit_yoy_pct ?? 0, 2)
      }
    }
    expect(rows[0].months).toBe(12)
  })

  it('kuartal lintas tahun cocok dengan payload time-dimensions', () => {
    const points = buildQuarterPoints(combined)
    expect(points).toHaveLength(4)
    for (const point of points) {
      const anchor = timeDimensions.quarters.find((row) => row.quarter === point.quarter)
      expect(anchor, point.quarter).toBeDefined()
      expect(
        Math.abs((point.marginPct ?? 0) - (anchor?.aggregate_margin_pct ?? 0)),
      ).toBeLessThanOrEqual(0.01)
      expect(point.orders).toBe(anchor?.orders)
    }
    expect(Math.abs((points[0].marginPct ?? 0) - 42.71)).toBeLessThanOrEqual(0.01)
    expect(Math.abs((points[3].marginPct ?? 0) - 30.22)).toBeLessThanOrEqual(0.01)
  })

  it('bracket diskon: 5 baris, 138.116 order, profit/order sesuai payload', () => {
    const points = buildBracketPoints(cubes.cubes.discount_bracket)
    expect(points).toHaveLength(5)
    expect(points.reduce((total, point) => total + point.orders, 0)).toBe(138116)
    for (const point of points) {
      const anchor = brackets.brackets.find((row) => row.bracket === point.bracket)
      expect(anchor, point.bracket).toBeDefined()
      expect(
        Math.abs((point.marginPct ?? 0) - (anchor?.aggregate_margin_pct ?? 0)),
      ).toBeLessThanOrEqual(0.01)
      expect(
        Math.abs((point.profitPerOrder ?? 0) - (anchor?.profit_per_order ?? 0)),
      ).toBeLessThanOrEqual(0.01)
      expect(point.orders).toBe(anchor?.orders)
    }
    const worst = points[points.length - 1]
    expect(worst.bracket).toBe('30%+')
    expect(Math.abs((worst.marginPct ?? 0) - 15.17)).toBeLessThanOrEqual(0.01)
    expect(Math.abs((worst.profitPerOrder ?? 0) - 182.62)).toBeLessThanOrEqual(0.01)
  })
})

describe('Sales & Profitabilitas - tampilan panel', () => {
  it('menampilkan tabel bracket 5 baris dengan anchor margin dan profit/order', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Analisis bracket diskon')).toBeDefined()
    })
    const bracketCard = card('Analisis bracket diskon')
    const view = within(bracketCard)

    expect(view.getAllByRole('row')).toHaveLength(6) // 1 header + 5 bracket
    expect(view.getByText('0% (No Discount)')).toBeDefined()
    expect(view.getAllByText('30%+').length).toBeGreaterThanOrEqual(1)
    for (const orders of ['17,86 ribu', '35,03 ribu', '49,20 ribu', '17,73 ribu', '18,29 ribu']) {
      expect(view.getByText(orders), orders).toBeDefined()
    }
    expect(view.getByText('48,41%')).toBeDefined()
    expect(view.getByText('15,17%')).toBeDefined()
    expect(view.getByText('$589,90')).toBeDefined()
    expect(view.getByText('$182,62')).toBeDefined()
  })

  it('melabeli kolom dengan penyebut dan tidak mengklaim sebab-akibat atau ambang optimal', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Analisis bracket diskon')).toBeDefined()
    })
    const bracketCard = card('Analisis bracket diskon')
    const view = within(bracketCard)

    expect(view.getByText('Margin keseluruhan')).toBeDefined()
    expect(view.getByText('Profit/order')).toBeDefined()

    // Penyebut dan batasan dibaca lewat popover ikon, bukan teks terlihat.
    openHint('Analisis bracket diskon')
    const description = await screen.findByText(/tidak ada ambang diskon yang diklaim optimal/)
    expect(description.textContent).toContain('Nilai Kerugian')
    expect(description.textContent).toContain('$426,31 ribu')
    expect(description.textContent).toContain('2.530 pesanan')
    expect(description.textContent).not.toMatch(
      /menyebabkan|disebabkan|adalah ambang diskon yang optimal/i,
    )
  })

  it('menampilkan empat ukuran tingkat diskon dengan penyebutnya', async () => {
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText('Empat ukuran tingkat diskon — seluruh periode 2021-2025'),
      ).toBeDefined()
    })
    const bracketCard = card('Analisis bracket diskon')
    const view = within(bracketCard)

    expect(view.getByText('Diskon keseluruhan')).toBeDefined()
    expect(view.getByText('17,28%')).toBeDefined()
    expect(view.getByText('Rerata diskon')).toBeDefined()
    expect(view.getByText('15,12%')).toBeDefined()
    expect(view.getByText('Median diskon')).toBeDefined()
    expect(view.getByText('12,75%')).toBeDefined()
    expect(view.getByText('Maksimum diskon')).toBeDefined()
    expect(view.getByText('60,02%')).toBeDefined()

    openHint('Diskon keseluruhan')
    expect(await screen.findByText(/bagian penjualan bruto yang menjadi diskon/)).toBeDefined()

    openHint('Rerata diskon')
    expect(await screen.findByText(/Rata-rata diskon tiap pesanan/)).toBeDefined()
  })

  it('menyatakan narasi tahunan Stabilitas/Datar dan YoY sesuai pipeline', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Kinerja tahunan & YoY')).toBeDefined()
    })
    const annualCard = card('Kinerja tahunan & YoY')
    const view = within(annualCard)

    expect(view.getAllByRole('row')).toHaveLength(6) // 1 header + 5 tahun
    for (const yoy of ['-1,14%', '0,64%', '-0,22%', '-1,07%']) {
      expect(view.getAllByText(yoy).length, yoy).toBeGreaterThanOrEqual(1)
    }
    expect(view.getByText('$31,46 juta')).toBeDefined() // net sales 2024 dari payload

    openHint('Kinerja tahunan & YoY')
    const description = await screen.findByText(/Stabilitas\/Datar/)
    expect(description.textContent).toMatch(/bukan pertumbuhan ekspansif/)
  })

  it('mengganti mode tren Bulanan/Kuartalan/Tahunan tanpa kehilangan data', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Tren penjualan bersih & profit')).toBeDefined()
    })
    const trendCard = card('Tren penjualan bersih & profit')

    const monthly = within(trendCard).getByRole('button', { name: 'Bulanan' })
    const quarterly = within(trendCard).getByRole('button', { name: 'Kuartalan' })
    const yearly = within(trendCard).getByRole('button', { name: 'Tahunan' })
    expect(monthly.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(yearly)
    expect(yearly.getAttribute('aria-pressed')).toBe('true')
    expect(monthly.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(quarterly)
    expect(quarterly.getAttribute('aria-pressed')).toBe('true')
  })
})
