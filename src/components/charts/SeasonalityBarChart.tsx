import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SeasonPoint } from '@/lib/filter'
import { ChartLegend } from './ChartLegend'
import { formatCountScaled, formatPercent, formatUsdCompact, formatUsdScaled } from '@/lib/format'

interface TooltipEntry {
  payload?: unknown
}

/**
 * Display-only month labels. The payload ships English abbreviations ("May", "Aug", "Dec"), so
 * the axis and the tooltip print Indonesian names instead. Numbers are never touched.
 */
const MONTH_SHORT = new Intl.DateTimeFormat('id-ID', { month: 'short' })
const MONTH_LONG = new Intl.DateTimeFormat('id-ID', { month: 'long' })

/** "01".."12" to a month name; anything else falls back to the raw key. */
function monthLabel(key: string, style: 'short' | 'long'): string {
  const index = Number(key) - 1
  if (!Number.isInteger(index) || index < 0 || index > 11) return key
  return (style === 'short' ? MONTH_SHORT : MONTH_LONG).format(new Date(Date.UTC(2000, index, 1)))
}

function SeasonalityTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0]?.payload as SeasonPoint | undefined
  if (!row) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-[var(--shadow-card-hover)] dark:backdrop-blur-xl">
      <p className="mb-2 font-medium text-foreground">{monthLabel(row.key, 'long')}</p>
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
 * Seasonality across the 12 calendar months inside the active scope, summed over every year the
 * scope covers. Numbers come from the processed monthly payload; month labels are display-only.
 */
export function SeasonalityBarChart({ points }: { points: SeasonPoint[] }) {
  const peak = points.reduce<SeasonPoint | null>(
    (best, row) => (best === null || row.netSales > best.netSales ? row : best),
    null,
  )
  const shortByMonthName = new Map(
    points.map((row) => [row.monthName, monthLabel(row.key, 'short')]),
  )

  return (
    <div className="flex min-h-[320px] w-full flex-1 flex-col">
      <ChartLegend
        items={[
          { label: 'Net sales', color: 'var(--chart-1)' },
          { label: 'Bulan net sales tertinggi', color: 'var(--chart-3)' },
        ]}
      />
      <div className="min-h-[280px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="season-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="monthName"
              tickFormatter={(value: string) => shortByMonthName.get(value) ?? value}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              tickFormatter={formatUsdCompact}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={68}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              content={<SeasonalityTooltip />}
            />
            <Bar dataKey="netSales" radius={[6, 6, 0, 0]} maxBarSize={38}>
              {points.map((row) => (
                <Cell
                  key={row.key}
                  fill={peak && row.key === peak.key ? 'var(--chart-3)' : 'url(#season-bar)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
