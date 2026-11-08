import { cn } from 'cn'

export interface LegendItem {
  label: string
  color: string
  /** Marker shape: solid bar swatch (default), thin line, or dashed line for line series. */
  marker?: 'bar' | 'line' | 'dashed'
}

const MARKERS = {
  bar: 'h-2 w-4 rounded-sm',
  line: 'h-0.5 w-4 rounded-full',
  dashed: 'w-4 border-t-2 border-dashed',
} as const

/**
 * Legend row shared by every chart: the marker shape carries the meaning, colour is only a second
 * cue. Rendered above the plot, using the same type scale as the axis ticks.
 */
export function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ul
      className={cn(
        'mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase',
        className,
      )}
    >
      {items.map((item) => {
        const marker = item.marker ?? 'bar'
        return (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn('block', MARKERS[marker])}
              style={marker === 'dashed' ? { borderColor: item.color } : { background: item.color }}
            />
            {item.label}
          </li>
        )
      })}
    </ul>
  )
}
