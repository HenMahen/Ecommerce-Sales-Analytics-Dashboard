import { useMemo, useState } from 'react'
import {
  ArrowUpNarrowWide,
  BadgePercent,
  CalendarClock,
  CalendarRange,
  ChartArea,
  ChartColumn,
  ChartLine,
  Coins,
  Equal,
  Percent,
  Scale,
  ShoppingCart,
  Sigma,
  Tag,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { useDashboardData } from '@/app/DataProvider'
import { useFilter } from '@/app/FilterProvider'
import { useRouter } from '@/app/router'
import { ChartCard } from '@/components/charts/ChartCard'
import {
  ChannelComparisonChart,
  type ChannelPoint,
} from '@/components/charts/ChannelComparisonChart'
import { DiscountBracketChart } from '@/components/charts/DiscountBracketChart'
import { PerformanceTrendChart } from '@/components/charts/PerformanceTrendChart'
import { EmptyState } from '@/components/feedback/AsyncStates'
import { PageHeader } from '@/components/layout/PageHeader'
import { KpiCard } from '@/components/metrics/KpiCard'
import { ShareBar } from '@/components/metrics/ShareBar'
import { StatTile } from '@/components/metrics/StatTile'
import { StatusPill } from '@/components/metrics/StatusPill'
import { DataTable, type DataTableColumn } from '@/components/table/DataTable'
import { Button } from '@/components/ui/button'
import type { DiscountBracketCubeRow } from '@/data/types'
import {
  aggregateFinancials,
  buildAnnualScopeRows,
  buildBracketPoints,
  buildGranularityPoints,
  buildQuarterPoints,
  describeScope,
  groupCubeRows,
  isDimensionFiltered,
  isFilterActive,
  selectCubeRows,
  selectScopedRows,
  sharePct,
  type AnnualScopeRow,
  type BracketPoint,
  type TrendGranularity,
} from '@/lib/filter'
import {
  formatCount,
  formatCountScaled,
  formatPercent,
  formatUsd,
  formatUsdScaled,
} from '@/lib/format'
import { reveal } from '@/lib/reveal'
import { monthOverMonthChange, monthOverMonthTrend } from '@/lib/trend'

const GRANULARITY_OPTIONS: Array<{ value: TrendGranularity; label: string }> = [
  { value: 'month', label: 'Bulanan' },
  { value: 'quarter', label: 'Kuartalan' },
  { value: 'year', label: 'Tahunan' },
]

const DAY_TYPE_ORDER = ['Weekday', 'Weekend']

/**
 * Sales & Profitability page.
 *
 * Scope rules (definitions_version mvp-6):
 * - KPI cards, the trend panel (Bulanan/Kuartalan/Tahunan), the channel comparison, the quarterly
 *   tiles, the bracket panel, and the annual panel all read ONE source: `selectScopedRows` (the
 *   combined cube filtered by month range + segment + sales channel + order status). Gross sales
 *   and discount amount are additive measures on the same cube, so the discount analysis follows
 *   every global filter without a second formula path.
 * - Every discount metric is labelled with its real denominator: weighted rate = sum(discount) /
 *   sum(gross sales), profit per order = sum(profit) / sum(orders), row statistics = per order.
 * - "Hari kerja vs akhir pekan" uses a period-only panel cube; when a dimension filter is active
 *   the panel is hidden with an explanation instead of showing unfiltered numbers.
 * - Loss figures and per-row discount statistics are non-additive whole-period values; they are
 *   labelled as such and never presented as filter-following numbers.
 */
export function SalesProfitabilityPage() {
  const data = useDashboardData()
  const { filter, reset } = useFilter()
  const { route } = useRouter()
  const [granularity, setGranularity] = useState<TrendGranularity>('month')

  const { summary, metadata } = data
  const rows = useMemo(() => selectScopedRows(data, filter), [data, filter])
  const metrics = useMemo(() => aggregateFinancials(rows), [rows])
  const monthlyPoints = useMemo(() => buildGranularityPoints(rows, 'month'), [rows])
  const trendPoints = useMemo(
    () => (granularity === 'month' ? monthlyPoints : buildGranularityPoints(rows, granularity)),
    [granularity, monthlyPoints, rows],
  )
  const yearPoints = useMemo(() => buildGranularityPoints(rows, 'year'), [rows])
  const quarterPoints = useMemo(() => buildQuarterPoints(rows), [rows])
  const annualRows = useMemo(() => buildAnnualScopeRows(rows), [rows])

  // Latest two months inside the active scope; null hides the indicator when data is insufficient.
  const grossSalesChange = monthOverMonthChange(monthlyPoints, (point) => point.grossSales)
  const discountChange = monthOverMonthChange(monthlyPoints, (point) => point.discountAmount)
  const discountRateChange = monthOverMonthChange(
    monthlyPoints,
    (point) => point.weightedDiscountPct,
  )
  const netSalesChange = monthOverMonthChange(monthlyPoints, (point) => point.netSales)
  const profitChange = monthOverMonthChange(monthlyPoints, (point) => point.profit)
  const marginChange = monthOverMonthChange(monthlyPoints, (point) => point.marginPct)
  const ordersChange = monthOverMonthChange(monthlyPoints, (point) => point.orders)

  const channelGroups = useMemo(() => groupCubeRows(rows, 'sales_channel'), [rows])
  const channelNetSales = channelGroups.reduce((total, group) => total + group.netSales, 0)
  const channelPoints: ChannelPoint[] = channelGroups
    .map((group) => ({
      value: group.value,
      orders: group.orders,
      netSales: group.netSales,
      profit: group.profit,
      marginPct: group.marginPct,
      sharePct: sharePct(group.netSales, channelNetSales),
    }))
    .sort((a, b) => b.netSales - a.netSales)

  const filterActive = isFilterActive(filter)
  const dimensionFiltered = isDimensionFiltered(filter)
  const scopeLabel = describeScope(data, filter)
  const fullPeriod = `Seluruh periode ${metadata.date_range.min.slice(0, 4)}-${metadata.date_range.max.slice(0, 4)}`
  const scope = filterActive ? 'Mengikuti filter' : fullPeriod
  const emptyScope = rows.length === 0

  const dayTypeGroups = dimensionFiltered
    ? []
    : groupCubeRows(selectCubeRows(data, 'day_type', filter), 'day_type')
  const dayTypeOrders = dayTypeGroups.reduce((total, group) => total + group.orders, 0)
  const dayTypeRows = dayTypeGroups
    .map((group) => ({
      dayType: group.value,
      orders: group.orders,
      marginPct: group.marginPct,
      sharePct: sharePct(group.orders, dayTypeOrders),
    }))
    .sort((a, b) => DAY_TYPE_ORDER.indexOf(a.dayType) - DAY_TYPE_ORDER.indexOf(b.dayType))

  const bracketPoints = useMemo(
    () =>
      dimensionFiltered
        ? []
        : buildBracketPoints(
            selectCubeRows(data, 'discount_bracket', filter) as unknown as DiscountBracketCubeRow[],
          ),
    [data, dimensionFiltered, filter],
  )

  // Sharpest descriptive drop between two adjacent brackets inside the active range.
  let bracketDropPp: number | null = null
  let bracketDropLabel: string | null = null
  for (let index = 1; index < bracketPoints.length; index += 1) {
    const previous = bracketPoints[index - 1]
    const current = bracketPoints[index]
    if (previous.marginPct === null || current.marginPct === null) continue
    const drop = current.marginPct - previous.marginPct
    if (bracketDropPp === null || drop < bracketDropPp) {
      bracketDropPp = drop
      bracketDropLabel = `${previous.bracket} → ${current.bracket}`
    }
  }

  const lossOrders = summary.derived.loss_orders
  const lossTotal = Math.abs(summary.derived.total_loss)
  const lossShare = sharePct(lossOrders, summary.totals.orders)

  const discountStats = [
    {
      label: 'Diskon keseluruhan',
      value: formatPercent(summary.derived.discount_rate_weighted_pct),
      hint: {
        concept:
          'Berapa bagian penjualan bruto yang menjadi diskon di seluruh pesanan. Cocok jadi angka acuan karena dihitung dari total, bukan rata-rata tiap pesanan.',
        current: 'Dihitung dari total diskon dibagi total penjualan bruto, seluruh periode.',
      },
      icon: Percent,
    },
    {
      label: 'Rerata diskon',
      value: formatPercent(summary.derived.discount_rate_row_mean_pct),
      hint: {
        concept: 'Rata-rata diskon tiap pesanan, setiap pesanan dihitung sama rata.',
        current:
          'Menggambarkan diskon yang biasa terjadi pada pesanan tipikal, dihitung dari rata-rata tingkat diskon seluruh pesanan, seluruh periode.',
      },
      icon: Sigma,
    },
    {
      label: 'Median diskon',
      value: formatPercent(summary.derived.discount_rate_row_median_pct),
      hint: {
        concept:
          'Nilai tengah diskon seluruh pesanan. Tidak terpengaruh pesanan berdiskon ekstrem.',
        current: 'Separuh pesanan berdiskon di bawah angka ini, seluruh periode.',
      },
      icon: Equal,
    },
    {
      label: 'Maksimum diskon',
      value: formatPercent(summary.derived.discount_rate_row_max_pct),
      hint: {
        concept: 'Diskon terbesar pada satu pesanan, penanda batas atas diskon pada dataset.',
        current: 'Diambil dari tingkat diskon pesanan tertinggi, seluruh periode.',
      },
      icon: ArrowUpNarrowWide,
    },
  ]

  const yoyValues = annualRows
    .map((row) => row.revenueYoyPct)
    .filter((value): value is number => value !== null)
  const yoyRange =
    yoyValues.length > 0
      ? `${formatPercent(Math.min(...yoyValues))} s/d ${formatPercent(Math.max(...yoyValues))}`
      : null

  const bracketInfo = dimensionFiltered
    ? 'Panel ini hanya mengikuti rentang bulan, bukan filter dimensi. Angka tanpa filter sengaja tidak ditampilkan. Hapus filter segmen/channel/status untuk melihat panel.'
    : [
        'Penjualan bersih per bracket diskon, urut dari tanpa diskon sampai 30%+. Bracket 30%+ memuat seluruh pesanan rugi dan disorot warna aksen.',
        'Bracket mengikuti tingkat diskon tiap baris; basket 30%+ lebih besar (7,94 vs 4,98 unit), jadi antar-bracket tidak setara — tidak ada ambang diskon yang diklaim optimal.',
        bracketDropPp !== null
          ? `Selisih margin terbesar antar bracket berturut-turut: ${formatPercent(bracketDropPp)} poin (${bracketDropLabel}).`
          : null,
        `Nilai Kerugian seluruh periode: ${formatUsdScaled(lossTotal)} pada ${formatCount(lossOrders)} pesanan, semuanya di bracket 30%+.`,
      ]
        .filter((part): part is string => part !== null)
        .join(' ')

  const annualInfo = `Penjualan bersih dan laba per tahun; tabel di bawahnya memuat YoY net sales dan profit. ${
    yoyRange
      ? `YoY net sales ${yoyRange}: pola Stabilitas/Datar, bukan pertumbuhan ekspansif.`
      : 'Pola Stabilitas/Datar, bukan pertumbuhan ekspansif.'
  } Tahun dasar dan tahun parsial ditandai “—” karena tidak punya pembanding penuh.`

  const bracketColumns: Array<DataTableColumn<BracketPoint>> = [
    {
      key: 'bracket',
      header: 'Bracket diskon',
      render: (row) =>
        row.bracket === '30%+' ? (
          <span className="flex items-center gap-1.5 font-medium">
            <span>{row.bracket}</span>
            <span className="rounded border border-brand-pink/40 bg-brand-pink/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-pink">
              Rentan Rugi
            </span>
          </span>
        ) : (
          row.bracket
        ),
    },
    {
      key: 'orders',
      header: 'Order',
      align: 'right',
      render: (row) => formatCountScaled(row.orders),
    },
    {
      key: 'net_sales',
      header: 'Net sales',
      align: 'right',
      render: (row) => formatUsdScaled(row.netSales),
    },
    {
      key: 'profit',
      header: 'Profit',
      align: 'right',
      render: (row) => formatUsdScaled(row.profit),
    },
    {
      key: 'profit_per_order',
      header: 'Profit/order',
      align: 'right',
      render: (row) => (row.profitPerOrder === null ? '—' : formatUsdScaled(row.profitPerOrder)),
    },
    {
      key: 'margin',
      header: 'Margin keseluruhan',
      align: 'right',
      render: (row) => {
        if (row.marginPct === null) {
          return <span className="font-mono text-muted-foreground">—</span>
        }
        if (row.bracket === '30%+') {
          return <span className="font-bold text-brand-pink">{formatPercent(row.marginPct)}</span>
        }
        if (row.marginPct >= 40) {
          return <span className="font-semibold text-positive">{formatPercent(row.marginPct)}</span>
        }
        return <span className="font-medium text-foreground">{formatPercent(row.marginPct)}</span>
      },
    },
  ]

  const yoyCell = (value: number | null) => {
    if (value === null) return <span className="text-muted-foreground">—</span>
    if (value === 0) return <span className="text-muted-foreground">{formatPercent(value)}</span>
    if (value > 0) {
      return <span className="font-semibold text-positive">+{formatPercent(value)}</span>
    }
    return <span className="font-medium text-negative">{formatPercent(value)}</span>
  }

  const annualColumns: Array<DataTableColumn<AnnualScopeRow>> = [
    {
      key: 'year',
      header: 'Tahun',
      render: (row) => row.year,
    },
    {
      key: 'orders',
      header: 'Order',
      align: 'right',
      render: (row) => formatCountScaled(row.orders),
    },
    {
      key: 'net_sales',
      header: 'Net sales',
      align: 'right',
      render: (row) => formatUsdScaled(row.netSales),
    },
    {
      key: 'profit',
      header: 'Profit',
      align: 'right',
      render: (row) => formatUsdScaled(row.profit),
    },
    {
      key: 'margin',
      header: 'Margin keseluruhan',
      align: 'right',
      render: (row) =>
        row.marginPct === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-semibold text-foreground">{formatPercent(row.marginPct)}</span>
        ),
    },
    {
      key: 'yoy_revenue',
      header: 'YoY net sales',
      align: 'right',
      render: (row) => yoyCell(row.revenueYoyPct),
    },
    {
      key: 'yoy_profit',
      header: 'YoY profit',
      align: 'right',
      render: (row) => yoyCell(row.profitYoyPct),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={route.label}
        description={route.description}
        icon={route.icon}
        badges={
          <>
            <StatusPill
              label={filterActive ? 'Mengikuti filter' : 'Tanpa filter'}
              tone={filterActive ? 'info' : 'neutral'}
            />
            <span className="text-xs text-muted-foreground">{scopeLabel}</span>
          </>
        }
      />

      {emptyScope ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3"
        >
          <p className="text-sm text-muted-foreground">
            Tidak ada data untuk kombinasi filter ini. Hapus semua filter untuk kembali ke seluruh
            dataset.
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            Hapus semua filter
          </Button>
        </div>
      ) : null}

      <section
        aria-label="Indikator finansial"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          {...reveal(0)}
          label="Gross sales"
          value={formatUsdScaled(metrics.grossSales)}
          trend={monthOverMonthTrend(grossSalesChange)}
          hint={{
            concept:
              'Total harga jual barang sebelum dipotong diskon, seperti harga yang tertulis di label rak.',
            current:
              'Menjadi titik awal hitungan diskon dan penjualan bersih, dijumlahkan dari semua baris pesanan pada cakupan filter.',
          }}
          hintMode="popover"
          icon={TrendingUp}
          iconTone="violet"
        />
        <KpiCard
          {...reveal(60)}
          label="Total diskon diberikan"
          value={formatUsdScaled(metrics.discountAmount)}
          trend={monthOverMonthTrend(discountChange, 'lower-is-better')}
          hint={{
            concept:
              'Total potongan harga yang diberikan ke pelanggan, seperti voucher atau diskon toko.',
            current:
              'Mengurangi penjualan bruto menjadi penjualan bersih, dijumlahkan dari kolom diskon tiap baris pesanan pada cakupan filter.',
          }}
          hintMode="popover"
          icon={Tag}
          iconTone="pink"
        />
        <KpiCard
          {...reveal(120)}
          label="Tingkat diskon terbobot"
          value={
            metrics.weightedDiscountPct === null ? '—' : formatPercent(metrics.weightedDiscountPct)
          }
          trend={monthOverMonthTrend(discountRateChange, 'lower-is-better')}
          hint={{
            concept:
              'Persentase diskon terhadap penjualan bruto. Berbobot nilai, jadi beda dengan rata-rata per pesanan: pesanan besar lebih berpengaruh.',
            current: 'Dihitung dari total diskon dibagi total penjualan bruto pada cakupan filter.',
          }}
          hintMode="popover"
          icon={BadgePercent}
          iconTone="blue"
        />
        <KpiCard
          {...reveal(180)}
          label="Net sales"
          value={formatUsdScaled(metrics.netSales)}
          trend={monthOverMonthTrend(netSalesChange)}
          hint={{
            concept:
              'Total uang bersih yang diterima toko dari penjualan barang setelah dipotong semua diskon promosi (belum dikurangi modal produk).',
            current:
              'Menjadi dasar laba dan margin di halaman ini, dihitung dari penjualan bruto dikurangi total diskon.',
          }}
          hintMode="popover"
          icon={Coins}
          iconTone="violet"
        />
        <KpiCard
          {...reveal(240)}
          label="Profit"
          value={formatUsdScaled(metrics.profit)}
          trend={monthOverMonthTrend(profitChange)}
          hint={{
            concept:
              'Sisa keuntungan kotor barang setelah uang penjualan dikurangi dengan harga modal beli barang (COGS).',
            current:
              'Total uang keuntungan riil sebelum biaya operasional kantor, dihitung dari penjualan bersih dikurangi biaya produk.',
          }}
          hintMode="popover"
          icon={Wallet}
          iconTone="blue"
        />
        <KpiCard
          {...reveal(300)}
          label="Margin keseluruhan"
          value={metrics.marginPct === null ? '—' : formatPercent(metrics.marginPct)}
          trend={monthOverMonthTrend(marginChange)}
          hint={{
            concept:
              'Persentase laba dari penjualan bersih. Berbobot nilai, bukan rata-rata per transaksi, sehingga pesanan besar lebih berpengaruh.',
            current:
              metrics.marginPct === null
                ? 'Margin belum tersedia pada cakupan filter ini.'
                : `Setiap $100 penjualan bersih menyisakan sekitar ${formatUsd(metrics.marginPct, 2)} laba kotor.`,
          }}
          hintMode="popover"
          icon={Percent}
          iconTone="pink"
        />
        <KpiCard
          {...reveal(360)}
          label="Order"
          value={formatCountScaled(metrics.orders)}
          trend={monthOverMonthTrend(ordersChange)}
          hint={{
            concept:
              'Total banyaknya transaksi atau nota belanja yang tercatat di kasir pada sistem. Satu Order ID dihitung satu pesanan.',
            current:
              'Mengukur keramaian atau volume transaksi pelanggan, bukan besar-kecilnya nominal uang belanja.',
          }}
          hintMode="popover"
          icon={ShoppingCart}
          iconTone="positive"
        />
        <KpiCard
          {...reveal(420)}
          label="Nilai Kerugian"
          value={formatUsdScaled(lossTotal)}
          hint={{
            concept:
              'Total kebocoran dari pesanan yang sebenarnya merugi, karena harga jual tidak menutup modal dan diskon.',
            current: `Angka seluruh periode, tidak mengikuti filter. Berasal dari ${formatCount(lossOrders)} pesanan rugi (${formatPercent(lossShare)} dari seluruh pesanan).`,
          }}
          hintMode="popover"
          icon={TriangleAlert}
          iconTone="pink"
          footer={<StatusPill label={fullPeriod} tone="neutral" />}
        />
      </section>

      <ChartCard
        {...reveal(480)}
        title="Tren penjualan bersih & profit"
        info="Grafik penjualan bersih (batang) dan laba (garis) per periode, dengan margin keseluruhan sebagai garis putus-putus di sumbu kanan. Tombol Bulanan/Kuartalan/Tahunan hanya mengubah cara mengelompokkan, bukan rumusnya. Mengikuti filter; hanya periode pada rentang aktif yang tampil."
        icon={ChartArea}
        iconTone="violet"
        scope={scope}
        action={
          <div
            role="group"
            aria-label="Pilihan periode tren"
            className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5"
          >
            {GRANULARITY_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={granularity === option.value ? 'secondary' : 'ghost'}
                size="xs"
                aria-pressed={granularity === option.value}
                onClick={() => setGranularity(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        }
      >
        {trendPoints.length > 0 ? (
          <PerformanceTrendChart points={trendPoints} granularity={granularity} />
        ) : (
          <EmptyState
            title="Tidak ada periode pada cakupan ini"
            message="Perlebar rentang bulan atau hapus filter dimensi."
          />
        )}
      </ChartCard>

      <section aria-label="Saluran dan tipe hari" className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          {...reveal(540, 'xl:col-span-2')}
          title="Perbandingan saluran penjualan"
          info={`Penjualan bersih per saluran penjualan (batang) dan margin keseluruhan (garis putus-putus), urut dari yang terbesar. Berguna melihat saluran penyumbang nilai terbesar. ${filter.salesChannel ? `Hanya ${filter.salesChannel} yang tampil. ` : ''}Angka dari cakupan filter aktif.`}
          icon={ChartColumn}
          iconTone="blue"
          scope={scope}
        >
          {channelPoints.length > 0 ? (
            <ChannelComparisonChart points={channelPoints} />
          ) : (
            <EmptyState
              title="Tidak ada channel pada cakupan ini"
              message="Perlebar rentang bulan atau hapus filter dimensi."
            />
          )}
        </ChartCard>

        <ChartCard
          {...reveal(600)}
          bodyClassName="flex flex-1 flex-col justify-center"
          title="Hari kerja vs akhir pekan"
          info={
            dimensionFiltered
              ? 'Panel ini hanya mengikuti rentang bulan, bukan filter dimensi. Angka tanpa filter sengaja tidak ditampilkan. Hapus filter segmen/channel/status untuk melihat panel.'
              : 'Porsi pesanan menurut hari pemesanan, dengan margin keseluruhan tiap tipe hari. Membantu melihat kapan pelanggan berbelanja. Angka mengikuti rentang bulan aktif.'
          }
          icon={CalendarClock}
          iconTone="positive"
          scope={dimensionFiltered ? 'Tidak tersedia' : scope}
        >
          {dimensionFiltered ? (
            <EmptyState
              title="Panel tidak mengikuti filter dimensi"
              message="Hapus filter segmen/channel/status order untuk melihat panel ini."
            />
          ) : dayTypeRows.length > 0 ? (
            <ul className="flex flex-col gap-6">
              {dayTypeRows.map((row) => (
                <li key={row.dayType}>
                  <ShareBar
                    label={row.dayType}
                    caption={
                      row.marginPct === null
                        ? `${formatCountScaled(row.orders)} order`
                        : `${formatPercent(row.marginPct)} margin keseluruhan · ${formatCountScaled(row.orders)} order`
                    }
                    valuePct={row.sharePct}
                    tone={row.dayType === 'Weekend' ? 'blue' : 'violet'}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Tidak ada data hari pada rentang ini"
              message="Perlebar rentang bulan."
            />
          )}
        </ChartCard>
      </section>

      <ChartCard
        {...reveal(660)}
        title="Margin keseluruhan per kuartal (lintas tahun)"
        info="Margin keseluruhan tiap kuartal, digabung dari seluruh tahun pada cakupan filter. Tiap kotak memuat jumlah pesanan dan penjualan bersih kuartal tersebut. Angka dari cakupan filter aktif."
        icon={CalendarRange}
        iconTone="violet"
        scope={scope}
      >
        {quarterPoints.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quarterPoints.map((point) => (
              <StatTile
                key={point.quarter}
                label={point.quarter}
                value={point.marginPct === null ? '—' : formatPercent(point.marginPct)}
                hint={{
                  concept: `Margin keseluruhan ${point.quarter}: laba dibagi penjualan bersih kuartal tersebut.`,
                  current: `${formatCountScaled(point.orders)} order dengan net sales ${formatUsdScaled(point.netSales)}. Gabungan seluruh tahun cakupan.`,
                }}
                hintMode="popover"
                icon={CalendarRange}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Tidak ada kuartal pada cakupan ini"
            message="Perlebar rentang bulan atau hapus filter dimensi."
          />
        )}
      </ChartCard>

      <ChartCard
        {...reveal(720)}
        title="Analisis bracket diskon"
        info={bracketInfo}
        icon={Scale}
        iconTone="pink"
        scope={dimensionFiltered ? 'Tidak tersedia' : scope}
      >
        {dimensionFiltered ? (
          <EmptyState
            title="Panel tidak mengikuti filter dimensi"
            message="Hapus filter segmen/channel/status order untuk melihat panel ini."
          />
        ) : bracketPoints.length > 0 ? (
          <div className="flex flex-col gap-4">
            <DiscountBracketChart points={bracketPoints} />
            <DataTable
              caption="Bracket diskon dengan jumlah order, net sales, profit, profit per order, dan margin keseluruhan"
              columns={bracketColumns}
              rows={bracketPoints}
              getRowKey={(row) => row.bracket}
              rowClassName={(row) =>
                row.bracket === '30%+' ? 'bg-brand-pink/5 hover:bg-brand-pink/10' : undefined
              }
            />
            <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Empat ukuran tingkat diskon — seluruh periode 2021-2025
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {discountStats.map((stat) => (
                  <StatTile
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                    hint={stat.hint}
                    hintMode="popover"
                    icon={stat.icon}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Tidak ada data bracket pada rentang ini"
            message="Perlebar rentang bulan pada filter global."
          />
        )}
      </ChartCard>

      <ChartCard
        {...reveal(780)}
        title="Kinerja tahunan & YoY"
        info={annualInfo}
        icon={ChartLine}
        iconTone="positive"
        scope={scope}
      >
        {annualRows.length > 0 ? (
          <div className="flex flex-col gap-4">
            <PerformanceTrendChart points={yearPoints} granularity="year" />
            <DataTable
              caption="Kinerja tahunan: order, net sales, profit, margin keseluruhan, dan YoY"
              columns={annualColumns}
              rows={annualRows}
              getRowKey={(row) => row.year}
            />
          </div>
        ) : (
          <EmptyState
            title="Tidak ada tahun pada cakupan ini"
            message="Perlebar rentang bulan atau hapus filter dimensi."
          />
        )}
      </ChartCard>
    </div>
  )
}
