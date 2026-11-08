import { sharePct, type SegmentShare, type TrendPoint } from '@/lib/filter'
import { formatCountScaled, formatPercent, formatPeriodLabel, formatUsdScaled } from '@/lib/format'

/**
 * Business insights for the Executive Overview.
 *
 * The panel only ranks numbers that are already displayed and shows display shares
 * (sum(part) / sum(total)). Every input comes from the same scoped source as the KPI cards and the
 * charts, so all tiles share one scope. It never compares periods, never projects values, and
 * never invents growth percentages.
 */
export interface Insight {
  id: string
  label: string
  value: string
  /** Where the tile's numbers come from, printed on the tile itself. */
  scope: string
  /** Apa / kenapa / bagaimana explanation, opened from the tile's icon on click. */
  info: string
}

export interface InsightInput {
  /** Monthly points inside the active scope (month range plus every dimension filter). */
  points: TrendPoint[]
  /** Aggregated order-status rows inside the same scope. */
  statusRows: Array<{ status: string; orders: number }>
  /** Segment profit shares inside the same scope. */
  segments: SegmentShare[]
  /** Scope text printed on every tile. */
  scope: string
}

function topBy<T>(rows: T[], value: (row: T) => number): T {
  return rows.reduce((best, row) => (value(row) > value(best) ? row : best))
}

export function buildInsights({ points, statusRows, segments, scope }: InsightInput): Insight[] {
  if (points.length === 0) return []

  const insights: Insight[] = []
  const netSalesTotal = points.reduce((total, row) => total + row.netSales, 0)
  const profitTotal = points.reduce((total, row) => total + row.profit, 0)

  const bestNetSalesMonth = topBy(points, (row) => row.netSales)
  insights.push({
    id: 'month-net-sales',
    label: 'Bulan penjualan bersih tertinggi',
    value: formatPeriodLabel(bestNetSalesMonth.period),
    scope,
    info: `Bulan dengan penjualan bersih terbesar di antara bulan yang sedang tampil: ${formatUsdScaled(
      bestNetSalesMonth.netSales,
    )} · ${formatPercent(
      sharePct(bestNetSalesMonth.netSales, netSalesTotal),
    )} dari net sales cakupan. Berguna melihat kapan penjualan paling terkumpul pada cakupan aktif. Dipilih dari total net sales tiap bulan, yang terbesar ditampilkan apa adanya.`,
  })

  const bestProfitMonth = topBy(points, (row) => row.profit)
  insights.push({
    id: 'month-profit',
    label: 'Bulan laba tertinggi',
    value: formatPeriodLabel(bestProfitMonth.period),
    scope,
    info: `Bulan dengan laba terbesar di antara bulan yang sedang tampil: ${formatUsdScaled(
      bestProfitMonth.profit,
    )} · ${formatPercent(
      sharePct(bestProfitMonth.profit, profitTotal),
    )} dari laba cakupan. Berguna melihat kapan laba paling terkumpul pada cakupan aktif. Dipilih dari total laba tiap bulan, yang terbesar ditampilkan apa adanya.`,
  })

  if (statusRows.length > 0) {
    const statusOrders = statusRows.reduce((total, row) => total + row.orders, 0)
    const topStatus = topBy(statusRows, (row) => row.orders)
    insights.push({
      id: 'top-status',
      label: 'Status order dominan',
      value: topStatus.status,
      scope,
      info: `Status pengiriman dengan jumlah order terbanyak pada cakupan aktif: ${formatCountScaled(
        topStatus.orders,
      )} order · ${formatPercent(
        sharePct(topStatus.orders, statusOrders),
      )} dari order tercatat. Berguna sebagai gambaran umum kondisi pesanan. Dihitung dari jumlah order per status, bukan nilai uang.`,
    })
  }

  if (segments.length > 0) {
    const topSegment = topBy(segments, (row) => row.profit)
    insights.push({
      id: 'top-segment',
      label: 'Segmen penyumbang laba terbesar',
      value: topSegment.segment,
      scope,
      info: `Segmen pelanggan dengan laba terbesar pada cakupan aktif: ${formatUsdScaled(
        topSegment.profit,
      )} · ${formatPercent(topSegment.sharePct)} dari laba cakupan. Berguna melihat segmen penyumbang laba utama. Dihitung dari total laba tiap segmen (berbobot nilai, bukan rata-rata per pelanggan).`,
    })
  }

  return insights
}
