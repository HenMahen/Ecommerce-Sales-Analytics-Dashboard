import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgePercent,
  ChartPie,
  ClipboardList,
  Percent,
  Repeat,
  Scale,
  ShoppingCart,
  Star,
  Table2,
  Users,
  Wallet,
} from 'lucide-react'
import { useDashboardData } from '@/app/DataProvider'
import { useFilter } from '@/app/FilterProvider'
import { useRouter } from '@/app/router'
import { cn } from 'cn'
import { ChartCard } from '@/components/charts/ChartCard'
import { GroupedBarChart, type GroupedBarPoint } from '@/components/charts/GroupedBarChart'
import { EmptyState } from '@/components/feedback/AsyncStates'
import { PageHeader } from '@/components/layout/PageHeader'
import { KpiCard } from '@/components/metrics/KpiCard'
import { ShareBar } from '@/components/metrics/ShareBar'
import { StatusPill } from '@/components/metrics/StatusPill'
import { DataTable, type DataTableColumn } from '@/components/table/DataTable'
import { Button } from '@/components/ui/button'
import type { SegmentRow } from '@/data/types'
import {
  aggregateFinancials,
  describeScope,
  isFilterActive,
  selectScopedRows,
  sharePct,
} from '@/lib/filter'
import {
  formatCount,
  formatCountScaled,
  formatDecimal,
  formatPercent,
  formatUsdScaled,
} from '@/lib/format'
import { reveal } from '@/lib/reveal'
import { monthOverMonthChange, monthOverMonthTrend } from '@/lib/trend'
import {
  buildMonthlyCustomerPoints,
  buildSegmentDistribution,
  customerRates,
  nextSort,
  resolveCustomerDenominator,
  sortSegmentRows,
  type SegmentSort,
  type SegmentSortKey,
} from './customerMetrics'

interface BehaviorRow {
  metric: string
  grain: 'Pelanggan' | 'Transaksi'
  value: string
  basis: string
}

/** Accent dot per segment; the reference palette leads, the dataset's extra segments follow. */
const SEGMENT_DOT_COLOR: Record<string, string> = {
  Consumer: 'bg-primary',
  Corporate: 'bg-secondary',
  'Home Office': 'bg-tertiary',
  Premium: 'bg-secondary',
  Business: 'bg-tertiary',
  VIP: 'bg-brand-pink',
}

/**
 * Customer Intelligence page.
 *
 * Scope rules (definitions_version mvp-6):
 * - Additive measures (`orders`, `net_sales`, `profit`) always come from `selectScopedRows`
 *   (combined cube + all four global filters), so the distribution panel reacts to every filter.
 * - The customer denominator (`customers`) is NON-additive. `resolveCustomerDenominator` only
 *   returns a value for the whole dataset, one segment over the whole period, or a single month;
 *   any other scope shows "—" with the reason instead of a summed number.
 * - The two per-customer ratios are ONE division between a summed measure and that validated
 *   count (the same operation the pipeline uses), never an average of monthly ratios.
 * - Repeat rate, high-margin transaction share, rating, the profile table, the basis comparison,
 *   and the discount comparison are whole-period, non-additive values and are labelled as such.
 * - Unvalidated metrics (CLV, ROMI/CAC, `customer_order_count`, `is_repeat_customer`, first-time
 *   vs repeat) are never presented as KPIs.
 */
export function CustomerIntelligencePage() {
  const data = useDashboardData()
  const { filter, reset } = useFilter()
  const { route } = useRouter()
  const [sort, setSort] = useState<SegmentSort>({
    key: 'profit_per_customer',
    direction: 'desc',
  })

  const { summary, metadata, segments } = data
  const rows = useMemo(() => selectScopedRows(data, filter), [data, filter])
  const metrics = useMemo(() => aggregateFinancials(rows), [rows])

  const filterActive = isFilterActive(filter)
  const scopeLabel = describeScope(data, filter)
  const fullPeriod = `Seluruh periode ${metadata.date_range.min.slice(0, 4)}-${metadata.date_range.max.slice(0, 4)}`
  const scope = filterActive ? 'Mengikuti filter' : fullPeriod
  const emptyScope = rows.length === 0

  const denominator = resolveCustomerDenominator(data, filter)
  const customers = denominator.value
  const rates = customerRates(metrics, denominator)

  // Monthly points only exist for validated customer scopes; otherwise the indicator stays hidden.
  const monthlyCustomers = buildMonthlyCustomerPoints(data, filter, denominator)
  const customersChange = monthOverMonthChange(monthlyCustomers, (point) => point.customers)
  const ordersPerCustomerChange = monthOverMonthChange(
    monthlyCustomers,
    (point) => point.ordersPerCustomer,
  )
  const profitPerCustomerChange = monthOverMonthChange(
    monthlyCustomers,
    (point) => point.profitPerCustomer,
  )

  const distribution = useMemo(() => buildSegmentDistribution(rows), [rows])
  const segmentRows = sortSegmentRows(segments.segments, sort.key, sort.direction)

  const marginPoints: GroupedBarPoint[] = segments.segments.map((row) => ({
    label: row.segment,
    values: [row.aggregate_margin_pct, row.avg_transaction_margin_pct],
  }))
  const marginBasisGaps = segments.segments.map(
    (row) => row.avg_transaction_margin_pct - row.aggregate_margin_pct,
  )
  const marginGapRange = `${formatDecimal(Math.min(...marginBasisGaps), 2)}-${formatDecimal(
    Math.max(...marginBasisGaps),
    2,
  )} poin persentase`

  const discountPoints: GroupedBarPoint[] = segments.segments.map((row) => ({
    label: row.segment,
    values: [row.avg_discount_rate_row_mean_pct, row.avg_discount_rate_weighted_pct],
  }))
  const discountRanked = [...segments.segments].sort(
    (left, right) => right.avg_discount_rate_row_mean_pct - left.avg_discount_rate_row_mean_pct,
  )
  const deepestDiscount = discountRanked[0]
  const shallowestDiscount = discountRanked[discountRanked.length - 1]

  const bestProfitPerCustomer = [...segments.segments].sort(
    (left, right) => right.profit_per_customer - left.profit_per_customer,
  )[0]
  const bestMarginSegment = [...segments.segments].sort(
    (left, right) => right.aggregate_margin_pct - left.aggregate_margin_pct,
  )[0]

  const deliveredOrders = summary.status_mix.completed
  const undeliveredOrders = summary.totals.orders - deliveredOrders

  const behaviorRows: BehaviorRow[] = [
    {
      metric: 'Pelanggan aktif',
      grain: 'Pelanggan',
      value: formatCountScaled(summary.totals.customers_active),
      basis: 'Pelanggan unik yang pernah memesan.',
    },
    {
      metric: 'Pelanggan berulang',
      grain: 'Pelanggan',
      value: formatPercent(summary.kpis.repeat_customer_rate_customer_level_pct),
      basis: 'Pelanggan aktif dengan dua pesanan atau lebih.',
    },
    {
      metric: 'Order per pelanggan',
      grain: 'Pelanggan',
      value: formatDecimal(summary.derived.orders_per_customer, 3),
      basis: 'Total pesanan dibagi pelanggan aktif.',
    },
    {
      metric: 'Profit per pelanggan',
      grain: 'Pelanggan',
      value: formatUsdScaled(summary.derived.profit_per_customer),
      basis: 'Total profit dibagi pelanggan aktif.',
    },
    {
      metric: 'Transaksi',
      grain: 'Transaksi',
      value: formatCountScaled(summary.totals.orders),
      basis: 'Satu pesanan dihitung satu transaksi.',
    },
    {
      metric: 'Rata-rata nilai transaksi',
      grain: 'Transaksi',
      value: formatUsdScaled(summary.kpis.avg_order_value),
      basis: 'Rata-rata net sales per pesanan.',
    },
    {
      metric: 'Pangsa transaksi margin >20%',
      grain: 'Transaksi',
      value: formatPercent(summary.kpis.high_margin_transaction_share_pct),
      basis: 'Pesanan dengan margin di atas 20%.',
    },
    {
      metric: 'Rating pelanggan',
      grain: 'Transaksi',
      value: formatDecimal(summary.kpis.mean_rating, 3),
      basis: 'Rata-rata nilai 1-5 dari pesanan terkirim.',
    },
  ]

  const sortHeader = (label: string, key: SegmentSortKey) => {
    const active = sort.key === key
    const Icon = active ? (sort.direction === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown
    return (
      <button
        type="button"
        onClick={() => setSort((current) => nextSort(current, key))}
        aria-label={`Urutkan berdasarkan ${label}`}
        className="inline-flex cursor-pointer items-center gap-1 rounded-sm uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {label}
        <Icon aria-hidden="true" className={active ? 'size-3.5' : 'size-3.5 opacity-40'} />
      </button>
    )
  }

  const segmentColumns: Array<DataTableColumn<SegmentRow>> = [
    {
      key: 'segment',
      header: sortHeader('Segmen', 'segment'),
      render: (row) => (
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <span
            className={cn(
              'size-2 rounded-full',
              SEGMENT_DOT_COLOR[row.segment] ?? 'bg-muted-foreground',
            )}
          />
          <span>{row.segment}</span>
        </div>
      ),
    },
    {
      key: 'customers',
      header: sortHeader('Pelanggan', 'customers'),
      align: 'right',
      render: (row) => formatCountScaled(row.customers),
    },
    {
      key: 'customer_share',
      header: 'Porsi pelanggan',
      align: 'right',
      render: (row) => formatPercent(sharePct(row.customers, summary.totals.customers_active)),
    },
    {
      key: 'orders',
      header: sortHeader('Order', 'orders'),
      align: 'right',
      render: (row) => formatCountScaled(row.orders),
    },
    {
      key: 'net_sales',
      header: sortHeader('Net sales', 'net_sales'),
      align: 'right',
      render: (row) => formatUsdScaled(row.net_sales),
    },
    {
      key: 'profit',
      header: sortHeader('Profit', 'profit'),
      align: 'right',
      width: '7rem',
      render: (row) => formatUsdScaled(row.profit),
    },
    {
      key: 'margin',
      header: sortHeader('Margin keseluruhan', 'aggregate_margin_pct'),
      align: 'right',
      render: (row) => (
        <span
          className={cn(
            row.segment === bestMarginSegment?.segment
              ? 'font-bold text-positive'
              : 'font-medium text-foreground',
          )}
        >
          {formatPercent(row.aggregate_margin_pct)}
        </span>
      ),
    },
    {
      key: 'profit_per_customer',
      header: sortHeader('Profit/pelanggan', 'profit_per_customer'),
      align: 'right',
      render: (row) =>
        row.segment === bestProfitPerCustomer?.segment ? (
          <span className="rounded bg-secondary/15 px-1.5 py-0.5 font-mono font-bold text-secondary">
            {formatUsdScaled(row.profit_per_customer)}
          </span>
        ) : (
          formatUsdScaled(row.profit_per_customer)
        ),
    },
    {
      key: 'orders_per_customer',
      header: sortHeader('Order/pelanggan', 'orders_per_customer'),
      align: 'right',
      render: (row) => formatDecimal(row.orders_per_customer, 2),
    },
    {
      key: 'discount',
      header: sortHeader('Diskon rerata baris', 'avg_discount_rate_row_mean_pct'),
      align: 'right',
      render: (row) => formatPercent(row.avg_discount_rate_row_mean_pct),
    },
  ]

  const behaviorColumns: Array<DataTableColumn<BehaviorRow>> = [
    {
      key: 'metric',
      header: 'Metrik',
      render: (row) => <span className="font-medium text-foreground">{row.metric}</span>,
    },
    {
      key: 'grain',
      header: 'Tingkat',
      render: (row) => (
        <StatusPill label={row.grain} tone={row.grain === 'Pelanggan' ? 'violet' : 'info'} />
      ),
    },
    {
      key: 'value',
      header: 'Nilai',
      align: 'right',
      render: (row) => (
        <span
          className={cn(
            row.metric === 'Pelanggan berulang' || row.metric === 'Pangsa transaksi margin >20%'
              ? 'font-bold text-positive'
              : 'font-medium',
          )}
        >
          {row.value}
        </span>
      ),
    },
    {
      key: 'basis',
      header: 'Definisi singkat',
      render: (row) => <span className="text-xs text-muted-foreground">{row.basis}</span>,
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
        aria-label="Indikator pelanggan"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <KpiCard
          {...reveal(0)}
          label="Pelanggan aktif"
          value={customers === null ? '—' : formatCountScaled(customers)}
          trend={monthOverMonthTrend(customersChange)}
          hint={{
            concept:
              'Jumlah orang unik yang pernah berbelanja pada cakupan aktif. Satu orang dihitung sekali walau belanja berkali-kali.',
            current: `Menjadi penyebut nilai per pelanggan di halaman ini. ${denominator.note}`,
          }}
          hintMode="popover"
          icon={Users}
          iconTone="violet"
        />
        <KpiCard
          {...reveal(60)}
          label="Pesanan per pelanggan aktif"
          value={rates.ordersPerCustomer === null ? '—' : formatDecimal(rates.ordersPerCustomer, 3)}
          trend={monthOverMonthTrend(ordersPerCustomerChange)}
          hint={{
            concept:
              'Rata-rata jumlah pesanan tiap pelanggan aktif, untuk melihat seberapa sering pelanggan kembali membeli.',
            current:
              rates.ordersPerCustomer === null
                ? `Belum tersedia untuk cakupan filter ini. Dihitung dari total pesanan dibagi jumlah pelanggan aktif. ${denominator.note}`
                : `Dari ${formatCount(metrics.orders)} pesanan dibagi ${formatCount(customers ?? 0)} pelanggan aktif.`,
          }}
          hintMode="popover"
          icon={ShoppingCart}
          iconTone="blue"
        />
        <KpiCard
          {...reveal(120)}
          label="Profit per pelanggan aktif"
          value={rates.profitPerCustomer === null ? '—' : formatUsdScaled(rates.profitPerCustomer)}
          trend={monthOverMonthTrend(profitPerCustomerChange)}
          hint={{
            concept:
              'Laba yang dihasilkan tiap pelanggan aktif, untuk membandingkan nilai pelanggan antar cakupan.',
            current:
              rates.profitPerCustomer === null
                ? `Belum tersedia untuk cakupan filter ini. Dihitung dari total laba dibagi jumlah pelanggan aktif. ${denominator.note}`
                : `Profit ${formatUsdScaled(metrics.profit)} dibagi ${formatCount(customers ?? 0)} pelanggan aktif.`,
          }}
          hintMode="popover"
          icon={Wallet}
          iconTone="pink"
        />
        <KpiCard
          {...reveal(180)}
          label="Tingkat pelanggan berulang"
          value={formatPercent(summary.kpis.repeat_customer_rate_customer_level_pct)}
          hint={{
            concept:
              'Porsi pelanggan yang datang dan belanja dua kali atau lebih. Menunjukkan loyalitas pembelian ulang.',
            current: `Dihitung per pelanggan dari ${formatCount(summary.totals.customers_active)} pelanggan aktif, seluruh periode.`,
          }}
          hintMode="popover"
          icon={Repeat}
          iconTone="positive"
          footer={<StatusPill label={fullPeriod} tone="neutral" />}
        />
        <KpiCard
          {...reveal(240)}
          label="Pangsa transaksi margin >20%"
          value={formatPercent(summary.kpis.high_margin_transaction_share_pct)}
          hint={{
            concept:
              'Porsi nota belanja yang menyisakan laba di atas 20% dari nilai penjualannya. Menunjukkan transaksi paling sehat.',
            current: `Dihitung dari ${formatCount(summary.totals.orders)} transaksi, seluruh periode.`,
          }}
          hintMode="popover"
          icon={Percent}
          iconTone="violet"
          footer={<StatusPill label={fullPeriod} tone="neutral" />}
        />
        <KpiCard
          {...reveal(300)}
          label="Rating pelanggan"
          value={formatDecimal(summary.kpis.mean_rating, 3)}
          hint={{
            concept:
              'Rata-rata penilaian pelanggan pada skala 1-5, seperti ulasan bintang di toko online.',
            current: `Hanya dari pesanan yang benar-benar terkirim: rata-rata ${formatCount(deliveredOrders)} order terkirim; ${formatCount(undeliveredOrders)} order tidak dikirim bernilai kosong.`,
          }}
          hintMode="popover"
          icon={Star}
          iconTone="blue"
          footer={<StatusPill label={fullPeriod} tone="neutral" />}
        />
      </section>

      <section aria-label="Distribusi dan margin segmen" className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          {...reveal(360)}
          title="Distribusi segmen pelanggan"
          info={`Porsi penjualan bersih tiap segmen, dengan margin keseluruhan sebagai konteks. Membantu melihat segmen penyumbang nilai terbesar. ${filter.segment ? `Hanya ${filter.segment} yang tampil. ` : ''}Angka dari cakupan filter aktif.`}
          icon={ChartPie}
          iconTone="violet"
          scope={scope}
        >
          {distribution.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {distribution.map((point) => (
                <li key={point.segment}>
                  <ShareBar
                    label={point.segment}
                    caption={`${formatPercent(point.netSalesSharePct)} net sales`}
                    tooltip={`Net sales ${formatUsdScaled(point.netSales)} · ${formatCountScaled(
                      point.orders,
                    )} pesanan · margin keseluruhan ${
                      point.marginPct === null ? '—' : formatPercent(point.marginPct)
                    }`}
                    valuePct={point.netSalesSharePct}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Tidak ada segmen pada cakupan ini"
              message="Perlebar rentang bulan atau hapus filter dimensi pada filter global."
            />
          )}
        </ChartCard>

        <ChartCard
          {...reveal(420, 'xl:col-span-2')}
          title="Margin keseluruhan vs rata-rata transaksi per segmen"
          info={`Dua cara membaca margin berdampingan: margin keseluruhan (berbobot nilai) dan rata-rata per transaksi. Selisih margin keseluruhan vs rata-rata transaksi per segmen: ${marginGapRange}. Seluruh periode, tidak mengikuti filter.`}
          icon={Scale}
          iconTone="blue"
          scope={fullPeriod}
        >
          {segments.segments.length > 0 ? (
            <GroupedBarChart
              points={marginPoints}
              series={[
                { name: 'Margin keseluruhan (utama)', color: 'var(--chart-1)' },
                { name: 'Rata-rata transaksi (sekunder)', color: 'var(--chart-2)' },
              ]}
            />
          ) : (
            <EmptyState
              title="Tidak ada segmen pada profil"
              message="Payload segment-performance.json kosong."
            />
          )}
        </ChartCard>
      </section>

      <ChartCard
        {...reveal(480)}
        title="Profil komparatif segmen pelanggan"
        info={`Volume, nilai, dan metrik per pelanggan tiap segmen; klik judul kolom untuk mengurutkan. Data seluruh periode: pelanggan unik per segmen, dan nilai per pelanggan memakai penyebut pelanggan segmen. ${
          bestProfitPerCustomer
            ? `Profit per pelanggan tertinggi: ${bestProfitPerCustomer.segment} (${formatUsdScaled(bestProfitPerCustomer.profit_per_customer)}).`
            : ''
        }`}
        icon={Table2}
        iconTone="violet"
        scope={fullPeriod}
      >
        {segmentRows.length > 0 ? (
          <DataTable
            caption="Profil segmen pelanggan: pelanggan, porsi pelanggan, order, net sales, profit, margin keseluruhan, profit per pelanggan, order per pelanggan, dan diskon rerata baris"
            columns={segmentColumns}
            rows={segmentRows}
            getRowKey={(row) => row.segment}
          />
        ) : (
          <EmptyState
            title="Tidak ada profil segmen"
            message="Payload segment-performance.json kosong."
          />
        )}
      </ChartCard>

      <section aria-label="Diskon dan perilaku pelanggan" className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          {...reveal(540)}
          title="Tingkat diskon per segmen (baris vs terbobot)"
          info={`Rata-rata diskon per pesanan berdampingan dengan diskon terbobot nilai penjualan. Beda keduanya menunjukkan pengaruh pesanan besar. Rentang diskon baris antar-segmen: ${formatPercent(shallowestDiscount.avg_discount_rate_row_mean_pct)} (${shallowestDiscount.segment}) hingga ${formatPercent(deepestDiscount.avg_discount_rate_row_mean_pct)} (${deepestDiscount.segment}), seluruh periode.`}
          icon={BadgePercent}
          iconTone="pink"
          scope={fullPeriod}
        >
          {segments.segments.length > 0 ? (
            <GroupedBarChart
              points={discountPoints}
              series={[
                { name: 'Diskon baris (per order)', color: 'var(--chart-3)' },
                { name: 'Terbobot (nilai penjualan)', color: 'var(--chart-2)' },
              ]}
            />
          ) : (
            <EmptyState
              title="Tidak ada segmen pada profil"
              message="Payload segment-performance.json kosong."
            />
          )}
        </ChartCard>

        <ChartCard
          {...reveal(600, 'xl:col-span-2')}
          title="Ringkasan perilaku pelanggan"
          info="Pemisahan metrik tingkat pelanggan dan tingkat transaksi, lengkap dengan penyebut tiap angka. Angka per pelanggan hanya valid pada cakupan tertentu, jadi tidak dijumlahkan sembarangan. Panel ini seluruh periode; angka yang mengikuti filter ada di kartu KPI dan panel distribusi."
          icon={ClipboardList}
          iconTone="violet"
          scope={fullPeriod}
        >
          <DataTable
            caption="Ringkasan perilaku pelanggan per tingkat: metrik, tingkat, nilai, dan penyebut"
            columns={behaviorColumns}
            rows={behaviorRows}
            getRowKey={(row) => row.metric}
          />
        </ChartCard>
      </section>
    </div>
  )
}
