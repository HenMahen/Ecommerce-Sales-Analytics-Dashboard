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
import type { BracketPoint } from '@/lib/filter'
import { formatCountScaled, formatPercent, formatUsdCompact, formatUsdScaled } from '@/lib/format'

interface TooltipEntry {
  payload?: unknown
}

function BracketTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0]?.payload as BracketPoint | undefined
  if (!row) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-[var(--shadow-card-hover)] dark:backdrop-blur-xl">
      <p className="mb-2 font-medium text-foreground">Diskon {row.bracket}</p>
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
          <span className="text-muted-foreground">Profit/order</span>
          <span className="font-mono tabular-nums text-foreground">
            {row.profitPerOrder === null ? 'Tidak tersedia' : formatUsdScaled(row.profitPerOrder)}
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

/** "0% (No Discount)" is too wide for an axis; the full label stays in the table and tooltip. */
function bracketTick(value: string): string {
  return value.replace(' (No Discount)', '')
}

/**
 * Net sales per discount bracket inside the active month range. The 30%+ bracket (the only one
 * with loss-making orders in the whole dataset) is tinted as an accent; order is documented.
 */
export function DiscountBracketChart({ points }: { points: BracketPoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="bracket-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="bracket"
            tickFormatter={bracketTick}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval={0}
          />
          <YAxis
            tickFormatter={formatUsdCompact}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={68}
          />
          <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<BracketTooltip />} />
          <Bar dataKey="netSales" name="Net sales" radius={[6, 6, 0, 0]} maxBarSize={64}>
            {points.map((row) => (
              <Cell
                key={row.bracket}
                fill={row.bracket === '30%+' ? 'var(--chart-3)' : 'url(#bracket-bar)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
