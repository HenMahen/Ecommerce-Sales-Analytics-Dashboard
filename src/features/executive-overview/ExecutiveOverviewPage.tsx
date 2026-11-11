import {
  BadgePercent,
  CalendarDays,
  ChartArea,
  ChartLine,
  ChartPie,
  ClipboardList,
  Coins,
  Layers,
  Lightbulb,
  Percent,
  ReceiptText,
  Repeat2,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react'
import { useMemo } from 'react'
import { useDashboardData } from '@/app/DataProvider'
import { useFilter } from '@/app/FilterProvider'
import { useRouter } from '@/app/router'
import { cn } from 'cn'
import { ChartCard } from '@/components/charts/ChartCard'
import { ProfitShareDonut } from '@/components/charts/ProfitShareDonut'
import { SeasonalityBarChart } from '@/components/charts/SeasonalityBarChart'
import { TrendAreaChart } from '@/components/charts/TrendAreaChart'
import { EmptyState } from '@/components/feedback/AsyncStates'
import { PageHeader } from '@/components/layout/PageHeader'
import { KpiCard } from '@/components/metrics/KpiCard'
import { ShareBar } from '@/components/metrics/ShareBar'
import { StatTile } from '@/components/metrics/StatTile'
import { StatusPill, orderStatusTone } from '@/components/metrics/StatusPill'
import { DataTable, type DataTableColumn } from '@/components/table/DataTable'
import { Button } from '@/components/ui/button'
import {
  aggregate,
  buildSeasonMonths,
  buildSegmentShares,
  buildTrendPoints,
  describeScope,
  groupCubeRows,
  isDimensionFiltered,
  isFilterActive,
  selectCubeRows,
  selectScopedRows,
  sharePct,
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
import { BusinessInsights } from './BusinessInsights'
import { buildInsights } from './insights'

interface StatusRow {
  status: string
  orders: number
  net_sales: number
  profit: number
  aggregate_margin_pct: number
}

const DELIVERY_TONES: Record<string, 'blue' | 'violet' | 'pink'> = {
  'On Time': 'blue',
  Early: 'violet',
  Delayed: 'pink',
  Cancelled: 'pink',
}

/**
 * Executive Overview.
 *
 * Scope rules (definitions_version mvp-5):
 * - KPI cards, both trends, the segment donut, the calendar-month seasonality, the status table,
 *   and the insights panel all read ONE source: `selectScopedRows` (the combined cube filtered by
 *   month range + segment + sales channel + order status). No panel uses a second formula path.
 * - "Ringkasan seluruh periode" holds non-additive/customer-level reference values that cannot be
 *   filtered; it is labelled as a whole-period reference and never pretends to follow the filter.
 * - "Status pengiriman" uses a period-only panel cube. When a dimension filter is active the panel
 *   is hidden with an explanation instead of showing unfiltered numbers next to filtered KPIs.
 * - Panels stay text-light: explanations open from each card's own icon on click (HintPopover),
 *   and long figures print with a short scale note ("$157,14 juta", "138,12 ribu").
 */
export function ExecutiveOverviewPage() {
  const data = useDashboardData()
  const { filter, reset } = useFilter()
  const { route } = useRouter()

  const { summary, metadata } = data
  const rows = useMemo(() => selectScopedRows(data, filter), [data, filter])
  const metrics = useMemo(() => aggregate(rows), [rows])
  // The secondary per-row average margin is non-additive: only valid without dimension filters.
  const dimensionFiltered = isDimensionFiltered(filter)
  const trendMonths = dimensionFiltered ? null : data.monthly.months_by_year
  const points = useMemo(() => buildTrendPoints(rows, trendMonths), [rows, trendMonths])
  const segmentShares = useMemo(() => buildSegmentShares(rows), [rows])
  const seasonMonths = useMemo(
    () => buildSeasonMonths(rows, data.monthly.months),
    [data.monthly.months, rows],
  )

  // Latest available month vs the month before it in the active scope.
  const netSalesChange = monthOverMonthChange(points, (point) => point.netSales)
  const profitChange = monthOverMonthChange(points, (point) => point.profit)
  const marginChange = monthOverMonthChange(points, (point) => point.marginPct)
  const ordersChange = monthOverMonthChange(points, (point) => point.orders)

  const filterActive = isFilterActive(filter)
  const scopeLabel = describeScope(data, filter)
  const scope = filterActive
    ? 'Mengikuti filter'
    : `Seluruh periode ${metadata.date_range.min.slice(0, 4)}-${metadata.date_range.max.slice(0, 4)}`
  const fullPeriod = `Seluruh periode ${metadata.date_range.min.slice(0, 4)}-${metadata.date_range.max.slice(0, 4)}`
  const emptyScope = rows.length === 0

  const statusRows: StatusRow[] = groupCubeRows(rows, 'order_status')
    .map((group) => ({
      status: group.value,
      orders: group.orders,
      net_sales: group.netSales,
      profit: group.profit,
      aggregate_margin_pct: group.marginPct ?? 0,
    }))
    .sort((a, b) => b.orders - a.orders)

  const deliveryGroups = dimensionFiltered
    ? []
    : groupCubeRows(selectCubeRows(data, 'delivery_status', filter), 'delivery_status')
  const deliveryTotal = deliveryGroups.reduce((total, group) => total + group.orders, 0)
  const deliveryRows = deliveryGroups
    .map((group) => ({
      value: group.value,
      orders: group.orders,
      share_pct: sharePct(group.orders, deliveryTotal),
    }))
    .sort((a, b) => b.orders - a.orders)

  const insights = buildInsights({
    points,
    statusRows: statusRows.map((row) => ({ status: row.status, orders: row.orders })),
    segments: segmentShares,
    scope,
  })

  const statusColumns: Array<DataTableColumn<StatusRow>> = [
    {
      key: 'status',
      header: 'Status order',
      render: (row) => <StatusPill label={row.status} tone={orderStatusTone(row.status)} />,
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
      render: (row) => formatUsdScaled(row.net_sales),
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
      render: (row) => (
        <span
          className={cn(
            row.aggregate_margin_pct >= 35
              ? 'font-semibold text-positive'
              : 'font-medium text-foreground',
          )}
        >
          {formatPercent(row.aggregate_margin_pct)}
        </span>
      ),
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

      <section aria-label="Indikator utama" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          {...reveal(0)}
          label="Net sales"
          value={formatUsdScaled(metrics.netSales)}
          trend={monthOverMonthTrend(netSalesChange)}
          hint={{
            concept:
              'Total uang bersih yang diterima toko dari penjualan barang setelah dipotong semua diskon promosi',
            current:
              'Menunjukkan total transaksi barang belanjaan yang berhasil terjual pada periode aktif.',
          }}
          hintMode="popover"
          icon={TrendingUp}
          iconTone="violet"
        />
        <KpiCard
          {...reveal(60)}
          label="Profit"
          value={formatUsdScaled(metrics.profit)}
          trend={monthOverMonthTrend(profitChange)}
          hint={{
            concept:
              'Sisa keuntungan kotor barang setelah uang penjualan dikurangi dengan harga modal beli barang',
            current:
              'Total uang keuntungan riil yang didapatkan bisnis sebelum dikurangi biaya operasional kantor.',
          }}
          hintMode="popover"
          icon={Coins}
          iconTone="blue"
        />
        <KpiCard
          {...reveal(120)}
          label="Margin keseluruhan"
          value={metrics.marginPct === null ? '—' : formatPercent(metrics.marginPct)}
          trend={monthOverMonthTrend(marginChange)}
          hint={{
            concept:
              'Persentase laba dari total penjualan. Berbobot nilai, jadi beda dengan rata-rata margin per pesanan: pesanan bernilai besar lebih berpengaruh.',
            current:
              metrics.marginPct === null
                ? 'Margin belum tersedia pada cakupan filter ini.'
                : `Setiap $100 barang yang terjual menghasilkan sekitar ${formatUsd(metrics.marginPct, 2)} keuntungan kotor bagi toko.`,
          }}
          hintMode="popover"
          icon={Percent}
          iconTone="pink"
        />
        <KpiCard
          {...reveal(180)}
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
      </section>

      <ChartCard
        {...reveal(240)}
        title="Ringkasan seluruh periode"
        info={`Angka acuan seluruh dataset; tidak ikut filter. Dipakai untuk angka level pelanggan yang tidak bisa disaring. Termasuk kerugian ${formatUsdScaled(
          Math.abs(summary.derived.total_loss),
        )} pada ${formatCountScaled(summary.derived.loss_orders)} pesanan berdiskon besar.`}
        icon={Layers}
        iconTone="violet"
        scope={fullPeriod}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="AOV"
            value={formatUsdScaled(summary.kpis.avg_order_value)}
            hint={{
              concept:
                'Rata-rata nominal uang yang dihabiskan pelanggan dalam satu kali transaksi belanja / keranjang pesanan.',
              current: `Rata-rata setiap satu nota pesanan menghasilkan transaksi sekitar ${formatUsdScaled(summary.kpis.avg_order_value)}. Angka seluruh periode 2021-2025, tidak ikut filter.`,
            }}
            hintMode="popover"
            icon={ReceiptText}
          />
          <StatTile
            label="Pelanggan aktif"
            value={formatCountScaled(summary.totals.customers_active)}
            hint={{
              concept:
                'Jumlah orang unik yang pernah berbelanja sepanjang periode. Satu orang dihitung sekali, walau belanja berkali-kali.',
              current: `Dihitung per pelanggan, jadi tidak ikut filter dimensi. Total pelanggan terdaftar: ${formatCount(
                summary.totals.customers_master,
              )}.`,
            }}
            hintMode="popover"
            icon={Users}
          />
          <StatTile
            label="Pelanggan berulang"
            value={formatPercent(summary.kpis.repeat_customer_rate_customer_level_pct)}
            hint={{
              concept:
                'Porsi pelanggan yang datang dan belanja lebih dari sekali. Menunjukkan loyalitas pembelian ulang, bukan jumlah kunjungan.',
              current:
                'Dihitung per pelanggan pada seluruh periode 2021-2025, tidak ikut filter dimensi.',
            }}
            hintMode="popover"
            icon={Repeat2}
          />
          <StatTile
            label="Transaksi margin > 20%"
            value={formatPercent(summary.kpis.high_margin_transaction_share_pct)}
            hint={{
              concept:
                'Porsi nota belanja yang menyisakan keuntungan di atas 20% dari nilai penjualannya.',
              current:
                'Menunjukkan seberapa besar transaksi yang dianggap sehat secara margin, dihitung per baris pesanan pada seluruh periode.',
            }}
            hintMode="popover"
            icon={BadgePercent}
          />
        </div>
      </ChartCard>

      <section aria-label="Tren bulanan" className="flex flex-col gap-4">
        <ChartCard
          {...reveal(300)}
          title="Tren penjualan bersih bulanan"
          info="Grafik penjualan bersih per bulan. Garis putus-putus adalah margin keseluruhan di sumbu kanan. Mengikuti filter; hanya bulan pada rentang yang tampil."
          icon={ChartArea}
          iconTone="violet"
          scope={scope}
        >
          {points.length > 0 ? (
            <TrendAreaChart points={points} metric="netSales" />
          ) : (
            <EmptyState
              title="Tidak ada bulan pada rentang ini"
              message="Perlebar rentang bulan atau hapus filter dimensi."
            />
          )}
        </ChartCard>

        <ChartCard
          {...reveal(360)}
          title="Tren laba bulanan"
          info="Grafik laba per bulan, cakupan sama dengan kartu KPI. Tiap titik adalah jumlah laba semua pesanan di bulan itu. Berguna melihat bulan mana yang paling untung."
          icon={ChartLine}
          iconTone="blue"
          scope={scope}
        >
          {points.length > 0 ? (
            <TrendAreaChart points={points} metric="profit" />
          ) : (
            <EmptyState
              title="Tidak ada bulan pada rentang ini"
              message="Perlebar rentang bulan atau hapus filter dimensi."
            />
          )}
        </ChartCard>
      </section>

      <section aria-label="Komposisi dan musiman" className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          {...reveal(420)}
          title="Komposisi profit per segmen"
          info="Porsi laba tiap segmen pelanggan. Segmen dengan potongan terbesar adalah penyumbang laba utama. Dihitung dari total laba per segmen pada cakupan filter."
          icon={ChartPie}
          iconTone="pink"
          scope={scope}
        >
          {segmentShares.length > 0 ? (
            <ProfitShareDonut segments={segmentShares} />
          ) : (
            <EmptyState
              title="Tidak ada data segmen pada cakupan ini"
              message="Perlebar rentang bulan atau hapus filter dimensi."
            />
          )}
        </ChartCard>

        <ChartCard
          {...reveal(480, 'xl:col-span-2')}
          bodyClassName="flex flex-1 flex-col"
          title="Musiman per bulan kalender"
          info="Total penjualan tiap bulan kalender, digabung dari semua tahun. Bulan terbaik disorot warna aksen. Puncak November-Desember sejalan dengan diskon akhir tahun."
          icon={CalendarDays}
          iconTone="positive"
          scope={scope}
        >
          {seasonMonths.length > 0 ? (
            <SeasonalityBarChart points={seasonMonths} />
          ) : (
            <EmptyState
              title="Tidak ada bulan kalender pada cakupan ini"
              message="Perlebar rentang bulan atau hapus filter dimensi."
            />
          )}
        </ChartCard>
      </section>

      <section aria-label="Pesanan dan pengiriman" className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          {...reveal(540)}
          title="Status pengiriman"
          info={
            dimensionFiltered
              ? 'Panel ini hanya mengikuti rentang bulan, bukan filter dimensi. Angka tanpa filter sengaja tidak ditampilkan. Hapus filter segmen/channel/status untuk melihat panel.'
              : 'Porsi pesanan menurut status pengiriman. "Cancelled" berarti tidak dikirim, berbeda dari pesanan dibatalkan. Angka dihitung dari rentang bulan aktif.'
          }
          icon={Truck}
          iconTone="blue"
          scope={dimensionFiltered ? 'Tidak tersedia' : scope}
        >
          {dimensionFiltered ? (
            <EmptyState
              title="Panel tidak mengikuti filter dimensi"
              message="Hapus filter segmen/channel/status order untuk melihat panel ini."
            />
          ) : deliveryRows.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {deliveryRows.map((row) => (
                <li key={row.value}>
                  <ShareBar
                    label={row.value}
                    caption={`${formatPercent(row.share_pct)} · ${formatCountScaled(row.orders)} order`}
                    valuePct={row.share_pct}
                    tone={DELIVERY_TONES[row.value] ?? 'violet'}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Tidak ada data pengiriman pada rentang ini"
              message="Perlebar rentang bulan."
            />
          )}
        </ChartCard>

        <ChartCard
          {...reveal(600, 'xl:col-span-2')}
          title="Status order: volume, penjualan, dan margin"
          info="Rekap pesanan, penjualan, laba, dan margin tiap status. Margin Completed paling kecil karena diskon hanya ada di Completed dan Pending. Angka dihitung dari total per status, bukan rata-rata."
          icon={ClipboardList}
          iconTone="violet"
          scope={scope}
        >
          {statusRows.length > 0 ? (
            <DataTable
              caption="Status order dengan jumlah order, net sales, profit, dan margin keseluruhan"
              columns={statusColumns}
              rows={statusRows}
              getRowKey={(row) => row.status}
            />
          ) : (
            <EmptyState
              title="Tidak ada status order pada cakupan ini"
              message="Perlebar rentang bulan atau hapus filter dimensi."
            />
          )}
        </ChartCard>
      </section>

      <ChartCard
        {...reveal(660)}
        className="relative overflow-hidden"
        title="Wawasan bisnis"
        info="Angka terbaik dari data yang sedang tampil. Berupa pemeringkatan, bukan pembanding antar periode. Semua kartu memakai cakupan filter yang sama."
        icon={Lightbulb}
        iconTone="positive"
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-brand-gradient" />
        <BusinessInsights insights={insights} />
      </ChartCard>
    </div>
  )
}
