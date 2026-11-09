import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  ClipboardList,
  Coins,
  Info,
  Percent,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  TrendingUp,
  TriangleAlert,
  Truck,
  Wallet,
} from 'lucide-react'
import { useDashboardData } from '@/app/DataProvider'
import { useFilter } from '@/app/FilterProvider'
import { useRouter } from '@/app/router'
import { AnomalyRateChart, type AnomalyChartUnit } from '@/components/charts/AnomalyRateChart'
import { ChartCard } from '@/components/charts/ChartCard'
import { EmptyState } from '@/components/feedback/AsyncStates'
import { PageHeader } from '@/components/layout/PageHeader'
import { KpiCard } from '@/components/metrics/KpiCard'
import { HintPopover } from '@/components/metrics/HintPopover'
import { CHIP, CHIP_TRIGGER, ICON_TONES } from '@/components/metrics/iconTones'
import { ShareBar } from '@/components/metrics/ShareBar'
import { StatTile } from '@/components/metrics/StatTile'
import { StatusPill, orderStatusTone } from '@/components/metrics/StatusPill'
import { DataTable, type DataTableColumn } from '@/components/table/DataTable'
import { Button } from '@/components/ui/button'
import {
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
import {
  ANOMALY_DIMENSIONS,
  anomalyRateRange,
  buildAnomalyRows,
  buildDeliveryRows,
  buildStatusRows,
  nextSort,
  sortAnomalyRows,
  sortStatusRows,
  type AnomalyDimensionKey,
  type AnomalyDisplayRow,
  type AnomalySortKey,
  type SortState,
  type StatusDisplayRow,
  type StatusSortKey,
} from './transactionMetrics'

/** Page-level scope note; lives behind the info chip in the header instead of a visible block. */
const COVERAGE_NOTE =
  'Halaman ini berisi agregat, bukan baris pesanan. Pencarian Order ID dan paginasi baris tidak tersedia karena tidak ada data tingkat order. Tidak ada catatan transaksi yang dibuat-buat. Halaman ini tidak menampilkan data pribadi pelanggan maupun umpan aktivitas.'

/**
 * Transaction Explorer (agregat).
 *
 * Scope rules (definitions_version mvp-6):
 * - Every anomaly number comes from `anomaly-by-dimension.json`, computed with GLOBAL quartile
 *   thresholds that are never recomputed per subset (PRD §5.4 acceptance criterion). The panel is
 *   therefore whole-period and labelled as such.
 * - The status table reads the combined cube (`selectScopedRows`), so its plain sums and weighted
 *   margin follow every global filter like the other pages.
 * - The delivery mix reads the period-only panel cube; when a dimension filter is active the panel
 *   is hidden with an explanation instead of showing unfiltered numbers.
 * - Loss figures and the return/cancellation/undelivered rates are row-level, non-additive,
 *   whole-period payload values; they are labelled and never presented as filter-following.
 * - No order-level payload exists: order-ID lookup, raw order tables, and row pagination are out
 *   of scope (PRD §7), so the page never fabricates transaction records.
 */
export function TransactionExplorerPage() {
  const data = useDashboardData()
  const { filter, reset } = useFilter()
  const { route } = useRouter()
  const [dimension, setDimension] = useState<AnomalyDimensionKey>('sales_channel')
  const [unit, setUnit] = useState<AnomalyChartUnit>('rate')
  const [anomalySort, setAnomalySort] = useState<SortState<AnomalySortKey> | null>(null)
  const [statusSort, setStatusSort] = useState<SortState<StatusSortKey> | null>(null)

  const { summary, anomaly, metadata } = data
  const rows = selectScopedRows(data, filter)

  const filterActive = isFilterActive(filter)
  const dimensionFiltered = isDimensionFiltered(filter)
  const scopeLabel = describeScope(data, filter)
  const fullPeriod = `Seluruh periode ${metadata.date_range.min.slice(0, 4)}-${metadata.date_range.max.slice(0, 4)}`
  const scope = filterActive ? 'Mengikuti filter' : fullPeriod
  const emptyScope = rows.length === 0

  // Anomali: ambang global -> payload seluruh periode, tidak mengikuti filter.
  const dimensionOption =
    ANOMALY_DIMENSIONS.find((option) => option.key === dimension) ?? ANOMALY_DIMENSIONS[0]
  const anomalyRows = buildAnomalyRows(anomaly.dimensions[dimension], anomaly.summary.orders)
  const sortedAnomalyRows = sortAnomalyRows(anomalyRows, anomalySort)
  const rateRange = anomalyRateRange(anomalyRows)
  const rangeText = rateRange
    ? `${formatPercent(rateRange.min)} hingga ${formatPercent(rateRange.max)}`
    : 'Tidak tersedia'

  // Status pesanan: kubus gabungan -> mengikuti seluruh filter global.
  const statusRows = sortStatusRows(
    buildStatusRows(groupCubeRows(rows, 'order_status')),
    statusSort,
  )

  // Pengiriman: kubus panel periode; disembunyikan saat filter dimensi aktif.
  const deliveryRows = dimensionFiltered
    ? []
    : buildDeliveryRows(
        groupCubeRows(selectCubeRows(data, 'delivery_status', filter), 'delivery_status'),
      )

  const lossOrders = summary.derived.loss_orders
  const lossTotal = Math.abs(summary.derived.total_loss)
  const lossShare = sharePct(lossOrders, summary.totals.orders)
  const undeliveredOrders =
    summary.status_mix.cancelled + summary.status_mix.pending + summary.status_mix.returned

  const anomalySortHeader = (label: string, key: AnomalySortKey) => {
    const active = anomalySort?.key === key
    const Icon = active ? (anomalySort.direction === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown
    return (
      <button
        type="button"
        onClick={() =>
          setAnomalySort((current) => nextSort(current, key, key === 'value' ? 'asc' : 'desc'))
        }
        aria-label={`Urutkan berdasarkan ${label}`}
        className="inline-flex cursor-pointer items-center gap-1 rounded-sm uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {label}
        <Icon aria-hidden="true" className={active ? 'size-3.5' : 'size-3.5 opacity-40'} />
      </button>
    )
  }

  const statusSortHeader = (label: string, key: StatusSortKey) => {
    const active = statusSort?.key === key
    const Icon = active ? (statusSort.direction === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown
    return (
      <button
        type="button"
        onClick={() =>
          setStatusSort((current) => nextSort(current, key, key === 'status' ? 'asc' : 'desc'))
        }
        aria-label={`Urutkan berdasarkan ${label}`}
        className="inline-flex cursor-pointer items-center gap-1 rounded-sm uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {label}
        <Icon aria-hidden="true" className={active ? 'size-3.5' : 'size-3.5 opacity-40'} />
      </button>
    )
  }

  const anomalyColumns: Array<DataTableColumn<AnomalyDisplayRow>> = [
    {
      key: 'value',
      header: anomalySortHeader('Kategori', 'value'),
      render: (row) => <span className="font-medium text-foreground">{row.value}</span>,
    },
    {
      key: 'orders',
      header: anomalySortHeader('Order', 'orders'),
      align: 'right',
      render: (row) => formatCountScaled(row.orders),
    },
    {
      key: 'anomalies',
      header: anomalySortHeader('Transaksi anomali', 'anomalies'),
      align: 'right',
      render: (row) => formatCount(row.anomalies),
    },
    {
      key: 'rate',
      header: anomalySortHeader('Tingkat anomali', 'anomaly_rate_pct'),
      align: 'right',
      render: (row) => <span className="font-medium">{formatPercent(row.anomaly_rate_pct)}</span>,
    },
    {
      key: 'share',
      header: 'Porsi dari total anomali',
      align: 'right',
      render: (row) => formatPercent(row.sharePct),
    },
  ]

  const statusColumns: Array<DataTableColumn<StatusDisplayRow>> = [
    {
      key: 'status',
      header: statusSortHeader('Status', 'status'),
      render: (row) => <StatusPill label={row.status} tone={orderStatusTone(row.status)} />,
    },
    {
      key: 'orders',
      header: statusSortHeader('Order', 'orders'),
      align: 'right',
      render: (row) => formatCountScaled(row.orders),
    },
    {
      key: 'share',
      header: statusSortHeader('Porsi order', 'sharePct'),
      align: 'right',
      render: (row) => formatPercent(row.sharePct),
    },
    {
      key: 'net_sales',
      header: statusSortHeader('Net sales', 'netSales'),
      align: 'right',
      render: (row) => formatUsdScaled(row.netSales),
    },
    {
      key: 'profit',
      header: statusSortHeader('Profit', 'profit'),
      align: 'right',
      render: (row) => formatUsdScaled(row.profit),
    },
    {
      key: 'margin',
      header: statusSortHeader('Margin keseluruhan', 'marginPct'),
      align: 'right',
      render: (row) =>
        row.marginPct === null ? (
          'Tidak tersedia'
        ) : (
          <span className="font-medium">{formatPercent(row.marginPct)}</span>
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
            <HintPopover
              label="Penjelasan cakupan halaman"
              description={COVERAGE_NOTE}
              align="start"
              className={`inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full ${ICON_TONES.violet} ${CHIP_TRIGGER}`}
            >
              <Info aria-hidden="true" className="size-3.5" />
            </HintPopover>
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
        aria-label="Indikator anomali dan operasional"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          {...reveal(0)}
          label="Pesanan anomali"
          value={formatCountScaled(anomaly.summary.orders)}
          hint={{
            concept:
              'Pesanan bernilai besar tetapi labanya tipis. Ditandai untuk ditinjau lebih lanjut karena berpotensi menggerus keuntungan.',
            current: `${formatPercent(anomaly.summary.order_share_pct)} dari ${formatCount(summary.totals.orders)} pesanan masuk kriteria: net sales ≥ ${formatUsd(anomaly.rule.revenue_threshold, 2)} dan margin ≤ ${formatPercent(anomaly.rule.margin_threshold_pct)}. Seluruh periode.`,
          }}
          hintMode="popover"
          icon={ShieldAlert}
          iconTone="violet"
          footer={<StatusPill label={fullPeriod} tone="neutral" />}
        />
        <KpiCard
          {...reveal(60)}
          label="Omzet anomali"
          value={formatUsdScaled(anomaly.summary.net_sales)}
          hint={{
            concept:
              'Total penjualan bersih dari pesanan yang ditandai anomali. Menunjukkan besarnya nilai yang perlu ditinjau.',
            current: 'Dijumlahkan dari semua pesanan anomali, seluruh periode.',
          }}
          hintMode="popover"
          icon={Coins}
          iconTone="blue"
          footer={<StatusPill label={fullPeriod} tone="neutral" />}
        />
        <KpiCard
          {...reveal(120)}
          label="Laba anomali"
          value={formatUsdScaled(anomaly.summary.profit)}
          hint={{
            concept:
              'Laba dari pesanan anomali. Jauh di bawah margin portofolio, jadi berpotensi menggerus hasil.',
            current: `Marginnya ${formatPercent(anomaly.summary.aggregate_margin_pct)} vs ${formatPercent(summary.margins.aggregate_margin_pct)} margin portofolio, seluruh periode.`,
          }}
          hintMode="popover"
          icon={Wallet}
          iconTone="positive"
          footer={<StatusPill label={fullPeriod} tone="neutral" />}
        />
        <KpiCard
          {...reveal(180)}
          label="Margin keseluruhan anomali"
          value={formatPercent(anomaly.summary.aggregate_margin_pct)}
          hint={{
            concept:
              'Persentase laba dari total nilai pesanan anomali. Berbobot nilai, bukan rata-rata transaksi.',
            current: 'Dihitung dari laba anomali dibagi omzet anomali, seluruh periode.',
          }}
          hintMode="popover"
          icon={Percent}
          iconTone="pink"
          footer={<StatusPill label={fullPeriod} tone="neutral" />}
        />
        <KpiCard
          {...reveal(240)}
          label="Opportunity gap (agregat)"
          value={formatUsdScaled(anomaly.summary.counterfactual_gap_aggregate_margin)}
          hint={{
            concept:
              'Perkiraan keuntungan yang terbuang karena toko memberi diskon terlalu dalam pada pesanan borongan bernilai besar.',
            current:
              'Potensi uang keuntungan tambahan bila margin pesanan anomali disetarakan dengan margin portofolio. Simulasi ilustratif, bukan target maupun prakiraan. Dihitung dengan basis margin keseluruhan dan ambang global.',
          }}
          hintMode="popover"
          icon={TrendingUp}
          iconTone="violet"
          footer={<StatusPill label="Simulasi potensi" tone="warning" />}
        />
        <KpiCard
          {...reveal(300)}
          label="Order rugi"
          value={formatCountScaled(lossOrders)}
          hint={{
            concept:
              'Pesanan yang labanya minus, artinya harga jual tidak menutup modal dan diskon.',
            current: `Menandai kebocoran margin yang nyata: ${formatPercent(lossShare)} dari seluruh pesanan; kerugian ${formatUsdScaled(lossTotal)} (nilai absolut), seluruh periode.`,
          }}
          hintMode="popover"
          icon={TriangleAlert}
          iconTone="pink"
          footer={<StatusPill label={fullPeriod} tone="neutral" />}
        />
        <KpiCard
          {...reveal(360)}
          label="Tingkat retur"
          value={formatPercent(summary.return_rate_pct)}
          hint={{
            concept:
              'Porsi pesanan yang dikembalikan pelanggan, penanda masalah kualitas atau ketidaksesuaian barang.',
            current: `Dihitung dari ${formatCount(summary.status_mix.returned)} pesanan Returned, seluruh periode.`,
          }}
          hintMode="popover"
          icon={RotateCcw}
          iconTone="blue"
          footer={<StatusPill label={fullPeriod} tone="neutral" />}
        />
        <KpiCard
          {...reveal(420)}
          label="Tidak dikirim"
          value={formatPercent(summary.undelivered_rate_pct)}
          hint={{
            concept:
              'Porsi pesanan yang tidak pernah dikirim, penanda masalah operasional pengiriman.',
            current: `Dihitung dari ${formatCount(undeliveredOrders)} pesanan berstatus pengiriman Cancelled, seluruh periode.`,
          }}
          hintMode="popover"
          icon={Truck}
          iconTone="violet"
          footer={<StatusPill label={fullPeriod} tone="neutral" />}
        />
      </section>

      <ChartCard
        {...reveal(480)}
        title="Aturan anomali & potensi laba"
        info="Ringkasan cara pesanan anomali ditandai dan dua perkiraan potensi labanya. Semua nilai di panel ini ilustratif, bukan target."
        icon={ShieldAlert}
        iconTone="violet"
        scope={fullPeriod}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 p-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Aturan anomali
              </span>
              <p className="text-sm leading-relaxed text-foreground">
                Pesanan dianggap anomali jika penjualan bersihnya minimal{' '}
                <span className="font-medium">{formatUsd(anomaly.rule.revenue_threshold, 2)}</span>{' '}
                dan marginnya tidak lebih dari{' '}
                <span className="font-medium">
                  {formatPercent(anomaly.rule.margin_threshold_pct)}
                </span>
                .
              </p>
              <p className="text-xs text-muted-foreground">
                Batas ini ditetapkan sekali dari seluruh data, jadi tidak berubah saat filter
                diganti.
              </p>
            </div>
            <HintPopover
              label="Penjelasan aturan anomali"
              description={`Pesanan anomali adalah pesanan dengan penjualan bersih minimal ${formatUsd(anomaly.rule.revenue_threshold, 2)} dan margin tidak lebih dari ${formatPercent(anomaly.rule.margin_threshold_pct)}. Batas ini menyaring pesanan bernilai besar yang labanya tipis. Ambang ditetapkan sekali dari seluruh data dan tidak berubah saat filter diganti.`}
              align="end"
              className={`${CHIP} ${CHIP_TRIGGER} ${ICON_TONES.violet}`}
            >
              <ShieldAlert aria-hidden="true" className="size-4" />
            </HintPopover>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-lg border border-brand-violet/25 bg-brand-violet/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <StatusPill label="Simulasi potensi" tone="warning" />
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Potensi laba: basis margin keseluruhan
                  </span>
                </div>
                <HintPopover
                  label="Penjelasan potensi laba basis margin keseluruhan"
                  description={`Angka ini memperkirakan tambahan laba jika margin pesanan anomali dinaikkan sampai margin keseluruhan portofolio (${formatPercent(summary.margins.aggregate_margin_pct)}). Angka ini menunjukkan peluang yang belum terealisasi, bukan uang yang sudah hilang. Perhitungannya memakai omzet pesanan anomali dan selisih margin, dengan asumsi jumlah pesanan tidak berubah.`}
                  align="end"
                  className={`${CHIP} ${CHIP_TRIGGER} ${ICON_TONES.violet}`}
                >
                  <TrendingUp aria-hidden="true" className="size-4" />
                </HintPopover>
              </div>
              <span className="font-heading text-2xl leading-tight font-semibold text-foreground tabular-nums">
                {formatUsdScaled(anomaly.summary.counterfactual_gap_aggregate_margin)}
              </span>
              <span className="text-xs text-muted-foreground">
                Angka acuan, bukan uang yang sudah hilang.
              </span>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <StatusPill label="Simulasi potensi" tone="warning" />
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Potensi laba: basis rata-rata transaksi
                  </span>
                </div>
                <HintPopover
                  label="Penjelasan potensi laba basis rata-rata transaksi"
                  description="Angka ini memakai rata-rata margin tiap transaksi, bukan margin keseluruhan. Fungsinya sebagai pembanding agar terlihat bahwa hasil bisa berbeda saat cara menghitung margin diubah. Angka ini bukan acuan."
                  align="end"
                  className={`${CHIP} ${CHIP_TRIGGER} ${ICON_TONES.blue}`}
                >
                  <Percent aria-hidden="true" className="size-4" />
                </HintPopover>
              </div>
              <span className="font-heading text-xl leading-tight font-semibold text-foreground tabular-nums">
                {formatUsdScaled(anomaly.summary.counterfactual_gap_avg_txn_margin)}
              </span>
              <span className="text-xs text-muted-foreground">Pembanding, bukan angka acuan.</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-border/70 p-4">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Asumsi simulasi
            </span>
            <p className="text-xs text-muted-foreground">
              Angka potensi di atas hanya berlaku jika hal-hal berikut dianggap benar.
            </p>
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-xs text-muted-foreground">
              {anomaly.summary.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </div>
        </div>
      </ChartCard>

      <ChartCard
        {...reveal(540)}
        title="Sebaran anomali lintas dimensi"
        info={`Order, transaksi anomali, dan tingkat anomali per kategori dimensi yang dipilih; tabel bisa diurutkan, grafik bisa menampilkan jumlah anomali atau tingkat anomali. Rentang tingkat anomali ${dimensionOption.label}: ${rangeText}. Sebarannya merata, bukan masalah satu channel/wilayah. Angka seluruh periode.`}
        icon={ScanSearch}
        iconTone="blue"
        scope={fullPeriod}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              role="group"
              aria-label="Pilih dimensi anomali"
              className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5"
            >
              {ANOMALY_DIMENSIONS.map((option) => (
                <Button
                  key={option.key}
                  variant={dimension === option.key ? 'secondary' : 'ghost'}
                  size="xs"
                  aria-pressed={dimension === option.key}
                  onClick={() => setDimension(option.key)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div
              role="group"
              aria-label="Pilih satuan grafik"
              className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5"
            >
              <Button
                variant={unit === 'count' ? 'secondary' : 'ghost'}
                size="xs"
                aria-pressed={unit === 'count'}
                onClick={() => setUnit('count')}
              >
                Jumlah anomali
              </Button>
              <Button
                variant={unit === 'rate' ? 'secondary' : 'ghost'}
                size="xs"
                aria-pressed={unit === 'rate'}
                onClick={() => setUnit('rate')}
              >
                Tingkat anomali
              </Button>
            </div>
          </div>
        }
      >
        {sortedAnomalyRows.length > 0 ? (
          <div className="flex flex-col gap-4">
            <AnomalyRateChart
              points={sortedAnomalyRows}
              unit={unit}
              averageRatePct={anomaly.summary.order_share_pct}
            />
            <DataTable
              caption={`Sebaran anomali per ${dimensionOption.label}: order, transaksi anomali, tingkat anomali, dan porsi dari total anomali`}
              columns={anomalyColumns}
              rows={sortedAnomalyRows}
              getRowKey={(row) => row.value}
            />
          </div>
        ) : (
          <EmptyState
            title="Tidak ada data anomali untuk dimensi ini"
            message="Payload anomaly-by-dimension.json tidak memuat baris dimensi."
          />
        )}
      </ChartCard>

      <section aria-label="Status pesanan dan pengiriman" className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          {...reveal(600, 'xl:col-span-2')}
          title="Status pesanan & margin realisasi"
          info={`Order, nilai, dan margin keseluruhan per status; klik judul kolom untuk mengurutkan. Margin mengikuti total per status, bukan rata-rata transaksi. Catatan D6: tabel fakta tidak memuat pembalikan dana (refund), sehingga margin Returned (${formatPercent(
            summary.status_margins.Returned.aggregate_margin_pct,
          )}) dan Cancelled (${formatPercent(
            summary.status_margins.Cancelled.aggregate_margin_pct,
          )}) lebih tinggi dari Completed (${formatPercent(
            summary.status_margins.Completed.aggregate_margin_pct,
          )}). Ini bukan profitabilitas riil.${
            filter.orderStatus
              ? ` Filter status order aktif; hanya ${filter.orderStatus} yang tampil.`
              : ''
          }`}
          icon={ClipboardList}
          iconTone="violet"
          scope={scope}
        >
          {statusRows.length > 0 ? (
            <DataTable
              caption="Status pesanan pada cakupan filter: order, porsi order, net sales, profit, dan margin keseluruhan"
              columns={statusColumns}
              rows={statusRows}
              getRowKey={(row) => row.status}
            />
          ) : (
            <EmptyState
              title="Tidak ada order pada cakupan ini"
              message="Hapus filter segmen/channel/status order atau perlebar rentang bulan."
            />
          )}
        </ChartCard>

        <ChartCard
          {...reveal(660)}
          title="Rincian status pengiriman"
          info={
            dimensionFiltered
              ? 'Panel ini hanya mengikuti rentang bulan, bukan filter dimensi. Angka tanpa filter sengaja tidak ditampilkan. Hapus filter segmen/channel/status order untuk melihat panel.'
              : `Porsi pesanan menurut status pengiriman pada rentang periode aktif. “Cancelled” berarti tidak pernah dikirim, bukan pembatalan biasa. Gabungan ${formatCount(undeliveredOrders)} order: ${formatCount(summary.status_mix.cancelled)} dibatalkan + ${formatCount(summary.status_mix.pending)} pending + ${formatCount(summary.status_mix.returned)} retur.`
          }
          icon={Truck}
          iconTone="pink"
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
                    label={row.label}
                    caption={`${formatPercent(row.sharePct)} · ${formatCountScaled(row.orders)} order`}
                    valuePct={row.sharePct}
                    tone={row.value === 'Cancelled' ? 'pink' : 'violet'}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Tidak ada data pengiriman pada rentang ini"
              message="Perlebar rentang bulan pada filter global."
            />
          )}
        </ChartCard>
      </section>

      <ChartCard
        {...reveal(720)}
        title="Kerugian & keandalan operasional"
        info="Kerugian dihitung sebagai nilai absolut, bukan pendapatan negatif. Retur dan pembatalan memakai status order; “tidak dikirim” memakai status pengiriman. Semua angka di panel ini berlaku seluruh periode."
        icon={TriangleAlert}
        iconTone="pink"
        scope={fullPeriod}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Kerugian (nilai absolut)"
            value={formatUsdScaled(lossTotal)}
            hint={{
              concept:
                'Kerugian berjalan dari pesanan yang labanya minus, dihitung sebagai nilai absolut, bukan pendapatan negatif.',
              current: `Angka seluruh periode dan tidak mengikuti filter. Berasal dari ${formatCount(lossOrders)} order profit < 0 (${formatPercent(lossShare)} dari seluruh order).`,
            }}
            hintMode="popover"
            icon={TriangleAlert}
          />
          <StatTile
            label="Tingkat pembatalan"
            value={formatPercent(summary.cancellation_rate_pct)}
            hint={{
              concept: 'Porsi pesanan yang dibatalkan, baik oleh pelanggan maupun sistem.',
              current: `Dihitung dari ${formatCount(summary.status_mix.cancelled)} order Cancelled, seluruh periode.`,
            }}
            hintMode="popover"
            icon={Ban}
          />
          <StatTile
            label="Tingkat retur"
            value={formatPercent(summary.return_rate_pct)}
            hint={{
              concept:
                'Porsi pesanan yang dikembalikan pelanggan, penanda masalah kualitas atau ketidaksesuaian produk.',
              current: `Dihitung dari ${formatCount(summary.status_mix.returned)} order Returned, seluruh periode.`,
            }}
            hintMode="popover"
            icon={RotateCcw}
          />
          <StatTile
            label="Tidak dikirim"
            value={formatPercent(summary.undelivered_rate_pct)}
            hint={{
              concept:
                'Porsi pesanan berstatus pengiriman Cancelled, penanda pengiriman yang gagal berjalan.',
              current: `Dihitung dari ${formatCount(undeliveredOrders)} order, seluruh periode.`,
            }}
            hintMode="popover"
            icon={Truck}
          />
        </div>
      </ChartCard>
    </div>
  )
}
