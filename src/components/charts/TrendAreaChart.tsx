import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TrendPoint } from '@/lib/filter'
import { ChartLegend } from './ChartLegend'
import {
  formatCountScaled,
  formatPercent,
  formatPeriodAxis,
  formatPeriodLabel,
  formatUsdCompact,
  formatUsdScaled,
} from '@/lib/format'

export type TrendMetric = 'netSales' | 'profit'

const SERIES: Record<
  TrendMetric,
  { key: TrendMetric; label: string; color: string; gradientId: string }
> = {
  netSales: {
    key: 'netSales',
    label: 'Net sales',
    color: 'var(--chart-1)',
    gradientId: 'trend-net-sales',
  },
  profit: {
    key: 'profit',
    label: 'Profit',
    color: 'var(--chart-2)',
    gradientId: 'trend-profit',
  },
}

const MARGIN = {
  key: 'marginPct',
  label: 'Margin keseluruhan',
  color: 'var(--chart-3)',
} as const

interface TooltipEntry {
  dataKey?: string | number
  value?: number | string
  payload?: unknown
}

function TrendTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
  label?: string | number
  metric: TrendMetric
}) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload as TrendPoint | undefined
  const series = SERIES[metric]
  const entry = payload.find((item) => item.dataKey === series.key)

  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-[var(--shadow-card-hover)] dark:backdrop-blur-xl">
      <p className="mb-2 font-medium text-foreground">{formatPeriodLabel(String(label))}</p>
      <ul className="flex flex-col gap-1.5">
        <li className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ background: series.color }}
            />
            {series.label}
          </span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {formatUsdScaled(Number(entry?.value ?? 0))}
          </span>
        </li>
        {point ? (
          <>
            <li className="flex items-center justify-between gap-6 border-t border-border/70 pt-1.5">
              <span className="text-muted-foreground">Margin keseluruhan</span>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {point.marginPct === null ? 'Tidak tersedia' : formatPercent(point.marginPct)}
              </span>
            </li>
            {point.avgTxnMarginPct === null ? null : (
              <li className="flex items-center justify-between gap-6">
                <span className="text-muted-foreground">Rata-rata transaksi</span>
                <span className="font-mono tabular-nums text-foreground">
                  {formatPercent(point.avgTxnMarginPct)}
                </span>
              </li>
            )}
            <li className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">Order</span>
              <span className="font-mono tabular-nums text-foreground">
                {formatCountScaled(point.orders)}
              </span>
            </li>
          </>
        ) : null}
      </ul>
    </div>
  )
}

const AXIS_TICK = {
  fontSize: 11,
  fontFamily: 'JetBrains Mono Variable, monospace',
  fill: 'var(--muted-foreground)',
} as const

/**
 * Monthly trend for one measure (left axis, USD), plus the aggregate margin line on the right axis
 * for the net sales view. Semantics: every value is summed profit / summed net sales - never an
 * average of percentages. The secondary per-row average only exists when the scope allows it.
 */
export function TrendAreaChart({ points, metric }: { points: TrendPoint[]; metric: TrendMetric }) {
  const series = SERIES[metric]
  const showMargin = metric === 'netSales'
  const margins = points
    .map((point) => point.marginPct)
    .filter((value): value is number => value !== null)
  const minMargin = margins.length > 0 ? Math.floor(Math.min(...margins) / 5) * 5 - 5 : 0
  const maxMargin = margins.length > 0 ? Math.ceil(Math.max(...margins) / 5) * 5 + 5 : 100

  return (
    <div>
      <ChartLegend
        items={
          showMargin
            ? [
                { label: series.label, color: series.color },
                { label: MARGIN.label, color: MARGIN.color, marker: 'dashed' },
              ]
            : [{ label: series.label, color: series.color }]
        }
      />
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={series.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={series.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="period"
              tickFormatter={formatPeriodAxis}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              minTickGap={28}
            />
            <YAxis
              yAxisId="money"
              tickFormatter={formatUsdCompact}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={68}
            />
            {showMargin ? (
              <YAxis
                yAxisId="pct"
                orientation="right"
                domain={[minMargin, maxMargin]}
                tickFormatter={(value: number) => formatPercent(value, 0)}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={48}
              />
            ) : null}
            <Tooltip content={<TrendTooltip metric={metric} />} />
            <Area
              yAxisId="money"
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={series.color}
              strokeWidth={2}
              fill={`url(#${series.gradientId})`}
              activeDot={{ r: 4 }}
            />
            {showMargin ? (
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey={MARGIN.key}
                name={MARGIN.label}
                stroke={MARGIN.color}
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
