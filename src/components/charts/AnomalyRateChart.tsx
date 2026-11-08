import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCount, formatCountScaled, formatPercent } from '@/lib/format'

/** Row shape consumed by the chart; structurally satisfied by the page's display rows. */
export interface AnomalyChartRow {
  value: string
  orders: number
  anomalies: number
  anomaly_rate_pct: number
}

export type AnomalyChartUnit = 'count' | 'rate'

interface TooltipEntry {
  payload?: unknown
}

function AnomalyTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0]?.payload as AnomalyChartRow | undefined
  if (!row) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-[var(--shadow-card-hover)] dark:backdrop-blur-xl">
      <p className="mb-2 font-medium text-foreground">{row.value}</p>
      <ul className="flex flex-col gap-1.5">
        <li className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Order</span>
          <span className="font-mono tabular-nums text-foreground">
            {formatCountScaled(row.orders)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Transaksi anomali</span>
          <span className="font-mono tabular-nums text-foreground">
            {formatCountScaled(row.anomalies)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-6 border-t border-border/70 pt-1.5">
          <span className="text-muted-foreground">Tingkat anomali</span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {formatPercent(row.anomaly_rate_pct)}
          </span>
        </li>
      </ul>
    </div>
  )
}

const AXIS_TICK = {
  fontSize: 11,
  fontFamily: 'JetBrains Mono Variable, monospace',
  fill: 'var(--muted-foreground)',
} as const

/** Explicit rate ticks keep the percentage axis readable; rate values always stay below 12%. */
const RATE_TICKS = [0, 3, 6, 9, 12]

const CHART_LABELS: Record<AnomalyChartUnit, string> = {
  count: 'jumlah transaksi anomali per kategori',
  rate: 'tingkat anomali per kategori (persen dari order)',
}

/**
 * Horizontal single-series bars for the anomaly distribution. Categories keep their order (the
 * table sort state is shared with the page); every bar starts at zero and carries a direct value
 * label, and the full data table below is the accessible alternative to the graphic.
 */
export function AnomalyRateChart({
  points,
  unit,
  averageRatePct,
}: {
  points: AnomalyChartRow[]
  unit: AnomalyChartUnit
  /** Payload anomaly order share (9,31%); reference line drawn only in rate mode. */
  averageRatePct: number | null
}) {
  const valueKey = unit === 'count' ? 'anomalies' : 'anomaly_rate_pct'
  const max = Math.max(...points.map((point) => point[valueKey]))
  const domainMax = unit === 'count' ? Math.ceil((max * 1.2) / 1000) * 1000 : 12
  const height = Math.max(220, points.length * 38)
  return (
    <div
      className="w-full"
      style={{ height }}
      role="img"
      aria-label={`Grafik ${CHART_LABELS[unit]}. Tabel di bawah memuat nilai lengkap setiap kategori.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={points}
          layout="vertical"
          margin={{ top: 4, right: 64, bottom: 4, left: 8 }}
        >
          <defs>
            <linearGradient id="anomaly-bar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.75} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, domainMax]}
            ticks={unit === 'rate' ? RATE_TICKS : undefined}
            tickFormatter={
              unit === 'count' ? formatCount : (value: number) => formatPercent(value, 0)
            }
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            type="category"
            dataKey="value"
            width={132}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          {unit === 'rate' && averageRatePct !== null ? (
            <ReferenceLine
              x={averageRatePct}
              stroke="var(--chart-3)"
              strokeDasharray="4 4"
              label={{
                value: `Rata-rata ${formatPercent(averageRatePct)}`,
                position: 'insideTopRight',
                fontSize: 11,
                fill: 'var(--muted-foreground)',
              }}
            />
          ) : null}
          <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<AnomalyTooltip />} />
          <Bar dataKey={valueKey} radius={[0, 6, 6, 0]} maxBarSize={18} fill="url(#anomaly-bar)">
            <LabelList
              dataKey={valueKey}
              position="right"
              valueAccessor={(entry) => {
                const value = Number(entry.value)
                return unit === 'count' ? formatCount(value) : formatPercent(value)
              }}
              fill="var(--muted-foreground)"
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
