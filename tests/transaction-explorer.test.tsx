/**
 * Integration test halaman Transaction Explorer (agregat): KPI anomali (ambang global $1.552,32 /
 * 34,12%), simulasi potensi berlabel "Simulasi potensi", sakelar dimensi & satuan,
 * pengurutan tabel, konsistensi filter global (status pesanan mengikuti
 * kubus gabungan; pengiriman mengikuti rentang periode), serta catatan cakupan (tanpa pencarian
 * Order ID dan tanpa paginasi baris karena tidak ada payload tingkat order).
 *
 * Halaman dirender dengan `DataProvider` asli (JSON `data/processed/` lewat stub `fetch`) dan
 * router internal asli; hanya status filter yang disuntikkan. Angka harapan berasal dari payload
 * pipeline yang sudah divalidasi (data_integrity.test.ts), bukan dari halaman.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataProvider, useDataState } from '@/app/DataProvider'
import { RouterProvider } from '@/app/router'
import { TransactionExplorerPage } from '@/features/transaction-explorer/TransactionExplorerPage'
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
  window.history.pushState(null, '', '/transactions')
})

function Harness() {
  const state = useDataState()
  if (state.status === 'loading') return <p>memuat data</p>
  if (state.status === 'error') return <p>galat: {state.title}</p>
  return <TransactionExplorerPage />
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

/** KPI group: keeps value assertions away from panel copies of the same number. */
async function kpiRegion(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: 'Indikator anomali dan operasional' })
}

/** One KPI card inside the indicator group, located by its label. */
function kpiCard(label: string): HTMLElement {
  const region = screen.getByRole('region', { name: 'Indikator anomali dan operasional' })
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

function anomalyPanel(): HTMLElement {
  return card('Sebaran anomali lintas dimensi')
}

/** Text of the first data row (skip the header) of the active anomaly table. */
function firstAnomalyRow(): string {
  const table = within(anomalyPanel()).getByRole('table')
  return within(table).getAllByRole('row')[1]?.textContent ?? ''
}

/** Text of the first data row whose category cell starts with `category`. */
function anomalyRowText(category: string): string {
  const table = within(anomalyPanel()).getByRole('table')
  const rows = within(table).getAllByRole('row')
  const match = rows.slice(1).find((row) => row.textContent?.trimStart().startsWith(category))
  if (!match) throw new Error(`Baris kategori "${category}" tidak ditemukan.`)
  return match.textContent ?? ''
}

/** Text of the first data row whose status cell contains `status`. */
function statusRowText(status: string): string {
  const table = within(card('Status pesanan & margin realisasi')).getByRole('table')
  const rows = within(table).getAllByRole('row')
  const match = rows.slice(1).find((row) => row.textContent?.includes(status))
  if (!match) throw new Error(`Baris status "${status}" tidak ditemukan.`)
  return match.textContent ?? ''
}

describe('Transaction Explorer - KPI anomali', () => {
  it('menampilkan delapan KPI dengan angka payload seluruh periode', async () => {
    renderPage()
    const region = await kpiRegion()
    const view = within(region)

    expect(kpiValue('Pesanan anomali')).toBe('12,86 ribu')
    expect(kpiValue('Omzet anomali')).toBe('$34,67 juta')
    expect(kpiValue('Laba anomali')).toBe('$7,53 juta')
    expect(kpiValue('Margin keseluruhan anomali')).toBe('21,72%')
    expect(kpiValue('Opportunity gap (agregat)')).toBe('$5,54 juta')
    expect(kpiValue('Order rugi')).toBe('2,53 ribu')
    expect(kpiValue('Tingkat retur')).toBe('6,85%')
    expect(kpiValue('Tidak dikirim')).toBe('17,78%')

    // Label cakupan lama dan label basis pada dua KPI sudah dihapus.
    expect(screen.queryByText('Agregat, bukan baris transaksi')).toBeNull()
    expect(
      within(kpiCard('Margin keseluruhan anomali')).queryByText('Margin keseluruhan (utama)'),
    ).toBeNull()
    expect(
      within(kpiCard('Opportunity gap (agregat)')).queryByText('Margin keseluruhan (utama)'),
    ).toBeNull()

    // Ambang global dan label simulasi menempel pada kartu terkait; ambang dibaca lewat popover.
    openHint('Pesanan anomali')
    expect(await screen.findByText(/net sales ≥ \$1\.552,32/)).toBeDefined()
    expect(screen.getByText(/margin ≤ 34,12%/)).toBeDefined()
    expect(within(kpiCard('Opportunity gap (agregat)')).getByText('Simulasi potensi')).toBeDefined()

    // Non-aditif / ambang global: kartu diberi label seluruh periode.
    expect(view.getAllByText('Seluruh periode 2021-2025').length).toBeGreaterThanOrEqual(6)
    expect(document.body.textContent).not.toContain('—')
  })
})

describe('Transaction Explorer - aturan anomali & potensi laba', () => {
  it('menampilkan ambang kuartil global dan dua angka simulasi potensi dengan asumsinya', async () => {
    renderPage()
    await kpiRegion()

    const panel = card('Aturan anomali & potensi laba')
    const view = within(panel)

    expect(view.getByText(/1\.552,32/)).toBeDefined()
    expect(view.getByText(/34,12%/)).toBeDefined()
    // Satu aturan dalam bahasa sehari-hari; detail teknis tetap di dokumen.
    expect(view.getByText(/Pesanan dianggap anomali/)).toBeDefined()
    expect(view.getByText(/Batas ini ditetapkan sekali dari seluruh data/)).toBeDefined()
    expect(view.queryByText(/persentil 75/)).toBeNull()
    expect(view.queryByText(/Operator inklusif/)).toBeNull()

    expect(view.getByText('$5,54 juta')).toBeDefined()
    expect(view.getByText('$6,74 juta')).toBeDefined()
    // Kedua angka simulasi potensi wajib berlabel simulasi.
    expect(view.getAllByText('Simulasi potensi').length).toBe(2)
    expect(view.getByText(/bukan prakiraan dan bukan target/)).toBeDefined()
    expect(view.getByText(/Harga jual dan jumlah pesanan dianggap tetap/)).toBeDefined()
    expect(view.getByText(/kesiapan operasional tidak dihitung/)).toBeDefined()
    expect(view.queryByRole('button', { name: /Penjelasan asumsi simulasi/i })).toBeNull()
  })

  it('membuka penjelasan apa, kenapa, bagaimana dari ikon tiap kartu', async () => {
    renderPage()
    await kpiRegion()

    openHint('aturan anomali')
    expect(await screen.findByText(/Batas ini menyaring pesanan bernilai besar/)).toBeDefined()

    openHint('potensi laba basis margin keseluruhan')
    expect(await screen.findByText(/peluang yang belum terealisasi/)).toBeDefined()

    openHint('potensi laba basis rata-rata transaksi')
    expect(await screen.findByText(/Fungsinya sebagai pembanding/)).toBeDefined()
  })
})

describe('Transaction Explorer - sebaran anomali lintas dimensi', () => {
  it('menampilkan tabel dimensi aktif dengan rentang sempit dan sakelar dimensi', async () => {
    renderPage()
    await kpiRegion()

    // Default: Sales Channel, urut tingkat anomali menurun dari payload.
    expect(firstAnomalyRow()).toContain('Marketplace')
    const marketplace = anomalyRowText('Marketplace')
    expect(marketplace).toContain('20,70 ribu')
    // Kolom transaksi anomali memakai jumlah pasti, bukan campuran angka dan "ribu".
    expect(marketplace).toContain('2.002')
    expect(marketplace).toContain('9,67%')

    // Rentang dan pesan inti ada di popover ikon (klik), bukan teks terlihat.
    // Mengganti dimensi menutup popover, jadi popover dibuka ulang setelah tiap sakelar.
    openHint('Sebaran anomali lintas dimensi')
    expect(await screen.findByText(/9,15% hingga 9,67%/)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Region' }))
    await waitFor(() => expect(anomalyRowText('South')).toContain('9,48%'))
    openHint('Sebaran anomali lintas dimensi')
    expect(await screen.findByText(/8,99% hingga 9,48%/)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Marketing Channel' }))
    await waitFor(() => expect(anomalyRowText('Email Marketing')).toContain('9,88%'))
    expect(anomalyRowText('TikTok')).toContain('8,92%')
    expect(anomalyRowText('YouTube')).toContain('385')
    openHint('Sebaran anomali lintas dimensi')
    expect(await screen.findByText(/8,92% hingga 9,88%/)).toBeDefined()
    // Pesan inti: sebaran merata, bukan masalah satu channel/wilayah.
    expect(await screen.findByText(/bukan masalah satu channel\/wilayah/)).toBeDefined()
  })

  it('mengganti satuan grafik antara jumlah anomali dan tingkat anomali', async () => {
    renderPage()
    await kpiRegion()

    expect(screen.getByRole('img', { name: /tingkat anomali per kategori/i })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Jumlah anomali' }))
    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: /jumlah transaksi anomali per kategori/i }),
      ).toBeDefined(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tingkat anomali' }))
    await waitFor(() =>
      expect(screen.getByRole('img', { name: /tingkat anomali per kategori/i })).toBeDefined(),
    )
  })

  it('mengurutkan tabel dimensi saat judul kolom diklik', async () => {
    renderPage()
    await kpiRegion()

    const orderHeader = within(anomalyPanel()).getByRole('button', {
      name: 'Urutkan berdasarkan Order',
    })
    fireEvent.click(orderHeader)
    await waitFor(() => expect(firstAnomalyRow()).toContain('Mobile App'))
    fireEvent.click(orderHeader)
    await waitFor(() => expect(firstAnomalyRow()).toContain('Social Media'))

    fireEvent.click(
      within(anomalyPanel()).getByRole('button', { name: 'Urutkan berdasarkan Kategori' }),
    )
    await waitFor(() => expect(firstAnomalyRow()).toContain('Marketplace'))
  })
})

describe('Transaction Explorer - status pesanan & konsistensi filter', () => {
  it('menampilkan status per cakupan kubus gabungan tanpa filter', async () => {
    renderPage()
    await kpiRegion()

    const completed = statusRowText('Completed')
    expect(completed).toContain('113,56 ribu')
    expect(completed).toContain('35,96%')
    expect(statusRowText('Returned')).toContain('48,37%')
    expect(statusRowText('Cancelled')).toContain('48,44%')

    openHint('Status pesanan & margin realisasi')
    expect(await screen.findByText(/Catatan D6/)).toBeDefined()
    expect(screen.getByText(/tidak memuat pembalikan dana \(refund\)/)).toBeDefined()
  })

  it('mengikuti rentang periode global (2024) pada tabel status', async () => {
    filterState.current = { ...DEFAULT_FILTER, from: '2024-01', to: '2024-12' }
    renderPage()
    await kpiRegion()

    // 22.670 = order Completed pada kubus gabungan 2024.
    expect(statusRowText('Completed')).toContain('22,67 ribu')
    expect(
      within(card('Status pesanan & margin realisasi')).getByText('Mengikuti filter'),
    ).toBeDefined()
    // KPI anomali tetap seluruh periode meski filter aktif (ambang global).
    expect(kpiValue('Pesanan anomali')).toBe('12,86 ribu')
  })

  it('menyaring satu status pada tabel dan menyembunyikan panel pengiriman saat filter dimensi aktif', async () => {
    filterState.current = { ...DEFAULT_FILTER, orderStatus: 'Cancelled' }
    renderPage()
    await kpiRegion()

    const panel = card('Status pesanan & margin realisasi')
    const tableRows = within(within(panel).getByRole('table')).getAllByRole('row')
    expect(tableRows).toHaveLength(2) // header + satu status
    expect(tableRows[1]?.textContent).toContain('Cancelled')
    expect(tableRows[1]?.textContent).toContain('8,40 ribu')
    openHint('Status pesanan & margin realisasi')
    expect(await screen.findByText(/hanya Cancelled yang tampil/)).toBeDefined()

    const delivery = card('Rincian status pengiriman')
    expect(delivery.textContent).toContain('Panel tidak mengikuti filter dimensi')
    expect(within(delivery).getByText('Tidak tersedia')).toBeDefined()
  })

  it('menampilkan keadaan kosong saat kombinasi filter tanpa baris', async () => {
    // Kombinasi ini tidak ada di kubus gabungan (diverifikasi dari payload, 0 baris).
    filterState.current = {
      ...DEFAULT_FILTER,
      from: '2021-01',
      to: '2021-01',
      segment: 'Business',
      salesChannel: 'Marketplace',
      orderStatus: 'Pending',
    }
    renderPage()

    expect(await screen.findByText(/Tidak ada data untuk kombinasi filter ini/)).toBeDefined()
    expect(
      within(card('Status pesanan & margin realisasi')).getByText(
        'Tidak ada order pada cakupan ini',
      ),
    ).toBeDefined()
  })
})

describe('Transaction Explorer - status pengiriman & kerugian', () => {
  it('menampilkan komposisi pengiriman seluruh periode dengan label Tidak Dikirim', async () => {
    renderPage()
    await kpiRegion()

    const panel = card('Rincian status pengiriman')
    expect(within(panel).getByText(/62,93% · 86,92 ribu order/)).toBeDefined()
    expect(within(panel).getByText(/17,78% · 24,56 ribu order/)).toBeDefined()
    expect(within(panel).getByText('Tidak Dikirim')).toBeDefined()
    // Terminology: delivery Cancelled = gabungan order_status Cancelled, Pending, Returned.
    openHint('Rincian status pengiriman')
    const description = await screen.findByText(/Gabungan 24\.557 order/)
    expect(description.textContent).toContain('8.398')
    expect(description.textContent).toContain('6.697')
    expect(description.textContent).toContain('9.462')
  })

  it('mengikuti rentang periode pada komposisi pengiriman (2024)', async () => {
    filterState.current = { ...DEFAULT_FILTER, from: '2024-01', to: '2024-12' }
    renderPage()
    await kpiRegion()

    const panel = card('Rincian status pengiriman')
    expect(within(panel).getByText(/62,59% · 17,38 ribu order/)).toBeDefined()
    expect(within(panel).getByText(/18,36% · 5,10 ribu order/)).toBeDefined()
  })

  it('menampilkan kerugian absolut dan tingkat masalah operasional', async () => {
    renderPage()
    await kpiRegion()

    const panel = card('Kerugian & keandalan operasional')
    expect(within(panel).getByText('$426,31 ribu')).toBeDefined()
    openHint('Kerugian (nilai absolut)')
    const description = await screen.findByText(/order profit < 0/)
    expect(description.textContent).toContain('2.530')
    expect(description.textContent).toContain('1,83%')
    expect(within(panel).getByText('6,08%')).toBeDefined()
    expect(within(panel).getByText('6,85%')).toBeDefined()
    expect(within(panel).getByText('17,78%')).toBeDefined()
  })

  it('menyatakan batas cakupan: tanpa pencarian Order ID, paginasi baris, dan data pribadi', async () => {
    renderPage()
    await kpiRegion()

    // Catatan cakupan pindah ke popover ikon pada header halaman.
    fireEvent.click(screen.getByRole('button', { name: 'Penjelasan cakupan halaman' }))
    const note = await screen.findByText(/Pencarian Order ID/)
    expect(note.textContent).toMatch(/paginasi baris tidak tersedia/)
    expect(note.textContent).toMatch(/Tidak ada catatan transaksi yang dibuat-buat/)
    expect(note.textContent).toMatch(/tidak menampilkan data pribadi pelanggan/)
    expect(note.textContent).toMatch(/umpan aktivitas/)
  })
})
