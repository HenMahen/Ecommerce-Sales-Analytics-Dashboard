import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPercent } from '@/lib/format'

export interface GroupedBarSeries {
  name: string
  /** CSS color value, so both themes keep working (e.g. "var(--chart-1)"). */
  color: string
}

export interface GroupedBarPoint {
  label: string
  /** One value per series, same order as `series`; null renders as a gap. */
  values: Array<number | null>
}

interface TooltipEntry {
  payload?: unknown
}

const seriesKey = (index: number) => `series-${index}`

function GroupedBarTooltip({
  active,
  payload,
  series,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
  series: GroupedBarSeries[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0]?.payload as Record<string, string | number | null> | undefined
  if (!row) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-[var(--shadow-card-hover)] dark:backdrop-blur-xl">
      <p className="mb-2 font-medium text-foreground">{String(row.label)}</p>
      <ul className="flex flex-col gap-1.5">
        {series.map((entry, index) => {
          const value = row[seriesKey(index)]
          return (
            <li key={entry.name} className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {typeof value === 'number' ? formatPercent(value) : 'Tidak tersedia'}
              </span>
            </li>
          )
        })}
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
 * Two labelled percentage series per category, grouped side by side. The value axis starts at
 * zero so bar lengths stay proportional; exact values live in the tooltip, and the legend names
 * both series so color is never the only carrier of meaning.
 */
export function GroupedBarChart({
  points,
  series,
}: {
  points: GroupedBarPoint[]
  series: GroupedBarSeries[]
}) {
  const data = points.map((point) => {
    const row: Record<string, string | number | null> = { label: point.label }
    series.forEach((_, index) => {
      row[seriesKey(index)] = point.values[index] ?? null
    })
    return row
  })
  const values = points.flatMap((point) =>
    point.values.filter((value): value is number => value !== null),
  )
  const max = values.length > 0 ? Math.max(...values) : 0
  const domainMax = Math.max(5, Math.ceil(max / 5) * 5)

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={0}
            />
            <YAxis
              domain={[0, domainMax]}
              tickFormatter={(value: number) => formatPercent(value, 0)}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              content={<GroupedBarTooltip series={series} />}
            />
            {series.map((entry, index) => (
              <Bar
                key={entry.name}
                dataKey={seriesKey(index)}
                name={entry.name}
                fill={entry.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {series.map((entry) => (
          <li key={entry.name} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
