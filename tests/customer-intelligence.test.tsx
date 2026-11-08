/**
 * Integration test halaman Customer Intelligence: penyebut pelanggan aktif (24.911, bukan 25.000
 * master), perilaku non-aditif saat filter melewati satu bulan, konsistensi filter global pada
 * panel distribusi (kubus gabungan), tabel profil segmen beserta pengurutan, dan ringkasan
 * perilaku per tingkat.
 *
 * Halaman dirender dengan `DataProvider` asli (JSON `data/processed/` lewat stub `fetch`) dan
 * router internal asli; hanya status filter yang disuntikkan. Angka harapan berasal dari payload
 * pipeline dan rekonsiliasi independen CSV sumber (mis. pelanggan 2024-03 = 2.106 dihitung dari
 * CSV sumber, 0 pelanggan lintas segmen) - tidak ada nilai yang dibaca dari halaman.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataProvider, useDataState } from '@/app/DataProvider'
import { RouterProvider } from '@/app/router'
import { CustomerIntelligencePage } from '@/features/customer-intelligence/CustomerIntelligencePage'
import { DEFAULT_FILTER, type FilterState } from '@/lib/filter'

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
  window.history.pushState(null, '', '/customers')
})

function Harness() {
  const state = useDataState()
  if (state.status === 'loading') return <p>memuat data</p>
  if (state.status === 'error') return <p>galat: {state.title}</p>
  return <CustomerIntelligencePage />
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

/** KPI group: keeps value assertions away from table copies of the same number. */
async function kpiRegion(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: 'Indikator pelanggan' })
}

/** One KPI card inside the indicator group, located by its label. */
function kpiCard(label: string): HTMLElement {
  const region = screen.getByRole('region', { name: 'Indikator pelanggan' })
  const node = within(region).getByText(label).closest('[data-slot="card"]')
  if (!node) throw new Error(`Kartu KPI "${label}" tidak ditemukan.`)
  return node as HTMLElement
}

/** The big value span of a KPI card (label/hint may repeat the same number). */
function kpiValue(label: string): string {
  const value = kpiCard(label).querySelector('span.font-heading')
  if (!value) throw new Error(`Nilai kartu "${label}" tidak ditemukan.`)
  return value.textContent ?? ''
}

/**
 * Opens a card's click-popover description. The popup renders in a portal, so the returned node
 * must be queried through `screen`, not through the card element.
 */
function openHint(label: string): void {
  fireEvent.click(screen.getByRole('button', { name: `Penjelasan ${label}` }))
}

/** Text of the first data row (skip the header) whose segment cell starts with `segment`. */
function segmentRowText(segment: string): string {
  const table = within(card('Profil komparatif segmen pelanggan')).getByRole('table')
  const rows = within(table).getAllByRole('row')
  const match = rows.slice(1).find((row) => row.textContent?.trimStart().startsWith(segment))
  if (!match) throw new Error(`Baris segmen "${segment}" tidak ditemukan.`)
  return match.textContent ?? ''
}

function firstSegmentRow(): string {
  const table = within(card('Profil komparatif segmen pelanggan')).getByRole('table')
  return within(table).getAllByRole('row')[1]?.textContent ?? ''
}

/** Text of the first behavior row whose metric cell contains `metric`. */
function behaviorRowText(metric: string): string {
  const table = within(card('Ringkasan perilaku pelanggan')).getByRole('table')
  const rows = within(table).getAllByRole('row')
  const match = rows.slice(1).find((row) => row.textContent?.includes(metric))
  if (!match) throw new Error(`Baris perilaku "${metric}" tidak ditemukan.`)
  return match.textContent ?? ''
}

describe('Customer Intelligence - KPI dan penyebut pelanggan', () => {
  it('menampilkan KPI pelanggan tanpa filter dengan penyebut 24.911 pelanggan aktif', async () => {
    renderPage()
    const region = await kpiRegion()
    const view = within(region)

    expect(kpiValue('Pelanggan aktif')).toBe('24,91 ribu')
    expect(kpiValue('Pesanan per pelanggan aktif')).toBe('5,544')
    expect(kpiValue('Profit per pelanggan aktif')).toBe('$2.377,76')
    expect(kpiValue('Tingkat pelanggan berulang')).toBe('97,90%')
    expect(kpiValue('Pangsa transaksi margin >20%')).toBe('92,01%')
    expect(kpiValue('Rating pelanggan')).toBe('3,677')

    // Denominator is stated in plain language; the technical master-count comparison stays out
    // of the customer-facing popover.
    openHint('Pelanggan aktif')
    const denominatorNote = await screen.findByText(/24\.911 pelanggan unik 2021-2025/)
    expect(denominatorNote.textContent).not.toContain('COUNT DISTINCT')
    expect(denominatorNote.textContent).not.toContain('pelanggan master')
    // The three non-additive cards are labelled whole-period.
    expect(view.getAllByText('Seluruh periode 2021-2025').length).toBe(3)
  })

  it('menjelaskan rating hanya dihitung dari order terkirim', async () => {
    renderPage()
    await kpiRegion()
    openHint('Rating pelanggan')
    const ratingNote = await screen.findByText(/Hanya dari pesanan yang benar-benar terkirim/)
    expect(ratingNote.textContent).toContain('113.559 order terkirim')
    expect(ratingNote.textContent).toContain('24.557 order tidak dikirim bernilai kosong')
  })
})

describe('Customer Intelligence - konsistensi filter global', () => {
  it('menghitung penyebut untuk satu bulan tunggal (2024-03) dari sel kubus segmen', async () => {
    filterState.current = { ...DEFAULT_FILTER, from: '2024-03', to: '2024-03' }
    renderPage()
    await kpiRegion()

    // 2.106 = pelanggan unik 2024-03 pada CSV sumber (jumlah 4 sel segmen = jumlah distinct).
    expect(kpiValue('Pelanggan aktif')).toBe('2,11 ribu')
    expect(kpiValue('Pesanan per pelanggan aktif')).toBe('1,046')
    expect(kpiValue('Profit per pelanggan aktif')).toBe('$493,93')
    openHint('Pelanggan aktif')
    expect(await screen.findByText(/jumlah 4 sel segmen bulan itu/)).toBeDefined()
  })

  it('memakai sel segmen saat satu bulan difilter dengan satu dimensi (VIP 2024-03)', async () => {
    filterState.current = { ...DEFAULT_FILTER, from: '2024-03', to: '2024-03', segment: 'VIP' }
    renderPage()
    await kpiRegion()

    // 241 = pelanggan unik VIP pada 2024-03 secara independen dari CSV sumber.
    expect(kpiValue('Pelanggan aktif')).toBe('241')
    expect(kpiValue('Pesanan per pelanggan aktif')).toBe('1,054')
    expect(kpiValue('Profit per pelanggan aktif')).toBe('$463,59')
  })

  it('memakai penyebut pelanggan segmen untuk satu segmen seluruh periode (VIP)', async () => {
    filterState.current = { ...DEFAULT_FILTER, segment: 'VIP' }
    renderPage()
    await kpiRegion()

    expect(kpiValue('Pelanggan aktif')).toBe('2,54 ribu')
    expect(kpiValue('Pesanan per pelanggan aktif')).toBe('5,504')
    expect(kpiValue('Profit per pelanggan aktif')).toBe('$2.221,99')
    openHint('Pelanggan aktif')
    expect(await screen.findByText(/segmen VIP sepanjang 2021-2025/)).toBeDefined()
  })

  it('menyembunyikan metrik per pelanggan saat rentang melewati satu bulan', async () => {
    filterState.current = { ...DEFAULT_FILTER, from: '2024-01', to: '2024-12' }
    renderPage()
    await kpiRegion()

    expect(kpiValue('Pelanggan aktif')).toBe('—')
    expect(kpiValue('Pesanan per pelanggan aktif')).toBe('—')
    expect(kpiValue('Profit per pelanggan aktif')).toBe('—')

    // Penjelasan "tidak tersedia" dibuka lewat klik ikon tiap kartu (satu popover pada satu waktu).
    openHint('Pelanggan aktif')
    expect(await screen.findByText(/Tidak tersedia untuk cakupan filter ini/)).toBeDefined()
    openHint('Pesanan per pelanggan aktif')
    expect(await screen.findByText(/Tidak tersedia untuk cakupan filter ini/)).toBeDefined()
    openHint('Profit per pelanggan aktif')
    expect(await screen.findByText(/Tidak tersedia untuk cakupan filter ini/)).toBeDefined()

    // Panel distribusi tetap mengikuti filter (kubus gabungan): porsi 2024 = 54,99% untuk Consumer.
    const distribution = card('Distribusi segmen pelanggan')
    expect(within(distribution).getByText(/54,99% net sales/)).toBeDefined()

    // Detail lain pindah ke tooltip bar: tidak tampil sebagai teks, tetapi tersedia saat hover.
    expect(within(distribution).queryByText(/margin keseluruhan/)).toBeNull()
    const consumerBar = within(distribution).getByRole('button', { name: /Consumer:/ })
    expect(consumerBar.getAttribute('aria-label')).toContain('margin keseluruhan')

    fireEvent.mouseEnter(consumerBar)
    expect(
      await screen.findByText(/margin keseluruhan/, undefined, { timeout: 2000 }),
    ).toBeDefined()
  })

  it('menyembunyikan metrik per pelanggan saat satu bulan dikombinasikan dua dimensi', async () => {
    filterState.current = {
      ...DEFAULT_FILTER,
      from: '2024-03',
      to: '2024-03',
      segment: 'VIP',
      salesChannel: 'Website',
    }
    renderPage()
    await kpiRegion()

    expect(kpiValue('Pelanggan aktif')).toBe('—')
    expect(kpiValue('Pesanan per pelanggan aktif')).toBe('—')
    expect(kpiValue('Profit per pelanggan aktif')).toBe('—')
  })
})

describe('Customer Intelligence - tabel profil segmen', () => {
  it('memuat angka payload per segmen dan terurut profit/pelanggan menurun secara default', async () => {
    renderPage()
    await kpiRegion()

    const consumer = segmentRowText('Consumer')
    expect(consumer).toContain('13,59 ribu')
    expect(consumer).toContain('75,64 ribu')
    expect(consumer).toContain('$33,56 juta')
    expect(consumer).toContain('39,00%')
    expect(consumer).toContain('$2.470,14')
    expect(consumer).toContain('5,57')
    expect(consumer).toContain('13,70%')

    const premium = segmentRowText('Premium')
    expect(premium).toContain('6,28 ribu')
    expect(premium).toContain('$2.223,38')
    expect(premium).toContain('17,67%')

    const business = segmentRowText('Business')
    expect(business).toContain('2,52 ribu')
    expect(business).toContain('$2.420,96')
    expect(business).toContain('13,78%')

    const vip = segmentRowText('VIP')
    expect(vip).toContain('2,54 ribu')
    expect(vip).toContain('$2.221,99')
    expect(vip).toContain('17,78%')

    // Default: profit per pelanggan tertinggi (Consumer) dulu.
    expect(firstSegmentRow()).toContain('Consumer')
  })

  it('mengurutkan tabel saat judul kolom diklik', async () => {
    renderPage()
    await kpiRegion()

    const button = within(card('Profil komparatif segmen pelanggan')).getByRole('button', {
      name: 'Urutkan berdasarkan Segmen',
    })
    fireEvent.click(button)
    await waitFor(() => expect(firstSegmentRow()).toContain('Business'))

    fireEvent.click(button)
    await waitFor(() => expect(firstSegmentRow()).toContain('VIP'))
  })
})

describe('Customer Intelligence - ringkasan perilaku', () => {
  it('memisahkan metrik tingkat pelanggan dan tingkat transaksi beserta definisinya', async () => {
    renderPage()
    await kpiRegion()

    const activeCustomers = behaviorRowText('Pelanggan aktif')
    expect(activeCustomers).toContain('24,91 ribu')
    expect(activeCustomers).toContain('Pelanggan')
    expect(activeCustomers).toContain('Pelanggan unik yang pernah memesan')

    const repeat = behaviorRowText('Pelanggan berulang')
    expect(repeat).toContain('97,90%')
    expect(repeat).toContain('dua pesanan atau lebih')

    const perCustomer = behaviorRowText('Order per pelanggan')
    expect(perCustomer).toContain('dibagi pelanggan aktif')

    const transactions = behaviorRowText('Transaksi')
    expect(transactions).toContain('138,12 ribu')
    expect(transactions).toContain('Transaksi')

    const rating = behaviorRowText('Rating pelanggan')
    expect(rating).toContain('pesanan terkirim')
  })

  it('tidak menyajikan metrik yang tidak divalidasi', async () => {
    renderPage()
    await kpiRegion()

    // Panel batasan dihapus atas permintaan pengguna; metriknya tetap tidak dirender sebagai KPI.
    expect(screen.queryByText('Customer Lifetime Value (CLV)')).toBeNull()
    expect(screen.queryByText(/laba riil pada 100% pelanggan/)).toBeNull()
    expect(screen.queryByText('Perbandingan first-time vs repeat')).toBeNull()
    expect(screen.queryByText('ROMI / CAC')).toBeNull()
    expect(screen.queryByText('customer_order_count')).toBeNull()
    expect(screen.queryByText('is_repeat_customer')).toBeNull()

    // Nilai sintetis CLV tidak pernah dirender sebagai angka.
    expect(screen.queryByText('$7.721,56')).toBeNull()
  })
})
