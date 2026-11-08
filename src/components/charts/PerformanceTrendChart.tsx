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
import type { GranularityPoint, TrendGranularity } from '@/lib/filter'
import { ChartLegend } from './ChartLegend'
import {
  formatCountScaled,
  formatPercent,
  formatPeriodAxis,
  formatPeriodLabel,
  formatUsdCompact,
  formatUsdScaled,
} from '@/lib/format'

const NET_SALES = { key: 'netSales', label: 'Net sales', color: 'var(--chart-1)' } as const
const PROFIT = { key: 'profit', label: 'Profit', color: 'var(--chart-2)' } as const
const MARGIN = { key: 'marginPct', label: 'Margin keseluruhan', color: 'var(--chart-3)' } as const

/** "2024-Q1" -> "Q1 24" (axis) or "Q1 2024" (tooltip); years pass through untouched. */
function axisLabel(key: string, granularity: TrendGranularity): string {
  if (granularity === 'month') return formatPeriodAxis(key)
  if (granularity === 'quarter') return `${key.slice(5)} ${key.slice(2, 4)}`
  return key
}

function tooltipLabel(key: string, granularity: TrendGranularity): string {
  if (granularity === 'month') return formatPeriodLabel(key)
  if (granularity === 'quarter') return `${key.slice(5)} ${key.slice(0, 4)}`
  return key
}

interface TooltipEntry {
  dataKey?: string | number
  value?: number | string
  payload?: unknown
}

function TrendTooltip({
  active,
  payload,
  label,
  granularity,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
  label?: string | number
  granularity: TrendGranularity
}) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload as GranularityPoint | undefined
  if (!point) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-[var(--shadow-card-hover)] dark:backdrop-blur-xl">
      <p className="mb-2 font-medium text-foreground">{tooltipLabel(String(label), granularity)}</p>
      <ul className="flex flex-col gap-1.5">
        <li className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              aria-hidden="true"
              className="block h-2 w-4 rounded-sm"
              style={{ background: NET_SALES.color }}
            />
            {NET_SALES.label}
          </span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {formatUsdScaled(point.netSales)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              aria-hidden="true"
              className="block h-0.5 w-4 rounded-full"
              style={{ background: PROFIT.color }}
            />
            {PROFIT.label}
          </span>
          <span className="font-mono tabular-nums text-foreground">
            {formatUsdScaled(point.profit)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-6 border-t border-border/70 pt-1.5">
          <span className="text-muted-foreground">Margin keseluruhan</span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {point.marginPct === null ? 'Tidak tersedia' : formatPercent(point.marginPct)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Order</span>
          <span className="font-mono tabular-nums text-foreground">
            {formatCountScaled(point.orders)}
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
 * Sales & profitability trend with a Bulanan / Kuartalan / Tahunan switch. All three views sum
 * the exact same scoped rows, so switching only regroups; no number changes formula.
 */
export function PerformanceTrendChart({
  points,
  granularity,
}: {
  points: GranularityPoint[]
  granularity: TrendGranularity
}) {
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
          { label: NET_SALES.label, color: NET_SALES.color },
          { label: PROFIT.label, color: PROFIT.color, marker: 'line' },
          { label: MARGIN.label, color: MARGIN.color, marker: 'dashed' },
        ]}
      />
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="trend-net-sales-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="key"
              tickFormatter={(value: string) => axisLabel(value, granularity)}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              minTickGap={24}
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
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              content={<TrendTooltip granularity={granularity} />}
            />
            <Bar
              yAxisId="money"
              dataKey={NET_SALES.key}
              name={NET_SALES.label}
              fill="url(#trend-net-sales-bar)"
              radius={[6, 6, 0, 0]}
              maxBarSize={26}
            />
            <Line
              yAxisId="money"
              type="monotone"
              dataKey={PROFIT.key}
              name={PROFIT.label}
              stroke={PROFIT.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
