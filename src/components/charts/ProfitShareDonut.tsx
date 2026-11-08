import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { SegmentShare } from '@/lib/filter'
import { formatPercent, formatUsdScaled } from '@/lib/format'

const SEGMENT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

interface TooltipEntry {
  payload?: unknown
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0]?.payload as SegmentShare | undefined
  if (!row) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-[var(--shadow-card-hover)] dark:backdrop-blur-xl">
      <p className="mb-2 font-medium text-foreground">{row.segment}</p>
      <ul className="flex flex-col gap-1.5">
        <li className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Porsi profit</span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {formatPercent(row.sharePct)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Profit</span>
          <span className="font-mono tabular-nums text-foreground">
            {formatUsdScaled(row.profit)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Margin keseluruhan</span>
          <span className="font-mono tabular-nums text-foreground">
            {row.marginPct === null ? 'Tidak tersedia' : formatPercent(row.marginPct)}
          </span>
        </li>
      </ul>
    </div>
  )
}

/** Profit composition per customer segment inside the active filter scope. */
export function ProfitShareDonut({ segments }: { segments: SegmentShare[] }) {
  // Stacked on purpose: this panel sits in a one-third column, and a side-by-side chart and legend
  // would squeeze the plot into a sliver (found while verifying the Executive Overview page).
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="h-[220px] w-full max-w-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="profit"
              nameKey="segment"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {segments.map((row, index) => (
                <Cell key={row.segment} fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex w-full flex-col gap-2">
        {segments.map((row, index) => (
          <li key={row.segment} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-sm"
                style={{ background: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
              />
              {row.segment}
            </span>
            <span className="font-mono font-medium tabular-nums text-foreground">
              {formatPercent(row.sharePct)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
