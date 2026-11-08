import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartLegend } from './ChartLegend'
import { formatCountScaled, formatPercent, formatUsdCompact, formatUsdScaled } from '@/lib/format'

export interface ChannelPoint {
  value: string
  orders: number
  netSales: number
  profit: number
  marginPct: number | null
  /** Display share of the channel inside the scoped net sales: sum(part) / sum(total). */
  sharePct: number
}

interface TooltipEntry {
  payload?: unknown
}

function ChannelTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0]?.payload as ChannelPoint | undefined
  if (!row) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-[var(--shadow-card-hover)] dark:backdrop-blur-xl">
      <p className="mb-2 font-medium text-foreground">{row.value}</p>
      <ul className="flex flex-col gap-1.5">
        <li className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Net sales</span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {formatUsdScaled(row.netSales)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Profit</span>
          <span className="font-mono tabular-nums text-foreground">
            {formatUsdScaled(row.profit)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-6 border-t border-border/70 pt-1.5">
          <span className="text-muted-foreground">Margin keseluruhan</span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {row.marginPct === null ? 'Tidak tersedia' : formatPercent(row.marginPct)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Porsi net sales</span>
          <span className="font-mono tabular-nums text-foreground">
            {formatPercent(row.sharePct)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Order</span>
          <span className="font-mono tabular-nums text-foreground">
            {formatCountScaled(row.orders)}
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

/**
 * Net sales per sales channel (bars, left axis) with the aggregate margin (dashed line, right
 * axis). All values are sums of the same scoped rows as the KPI cards; the order is by net sales.
 */
export function ChannelComparisonChart({ points }: { points: ChannelPoint[] }) {
  const margins = points
    .map((point) => point.marginPct)
    .filter((value): value is number => value !== null)
  const minMargin =
    margins.length > 0 ? Math.max(0, Math.floor(Math.min(...margins) / 5) * 5 - 5) : 0
  const maxMargin = margins.length > 0 ? Math.ceil(Math.max(...margins) / 5) * 5 + 5 : 100

  return (
    <div>
      <ChartLegend
        items={[
          { label: 'Net sales', color: 'var(--chart-1)' },
          { label: 'Margin keseluruhan', color: 'var(--chart-3)', marker: 'dashed' },
        ]}
      />
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="channel-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="value"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={0}
            />
            <YAxis
              yAxisId="money"
              tickFormatter={formatUsdCompact}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={68}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[minMargin, maxMargin]}
              tickFormatter={(value: number) => formatPercent(value, 0)}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChannelTooltip />} />
            <Bar
              yAxisId="money"
              dataKey="netSales"
              name="Net sales"
              fill="url(#channel-bar)"
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
            />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="marginPct"
              name="Margin keseluruhan"
              stroke="var(--chart-3)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
