import { type LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import { HintContent, HintPopover, type MetricHintContent } from '@/components/metrics/HintPopover'

/**
 * Compact stat tile for secondary reference numbers inside a panel (same visual language as the
 * KPI cards, smaller footprint). Follows the panel it lives in: use only where the panel's scope
 * note makes the coverage explicit. `hintMode="popover"` moves the hint behind the tile's icon:
 * hovering (desktop) or tapping (touch) opens the short description.
 */
export function StatTile({
  label,
  value,
  hint,
  hintMode = 'note',
  icon: Icon,
  className,
}: {
  label: string
  value: string
  hint?: string | MetricHintContent
  hintMode?: 'note' | 'popover'
  /** Required when `hintMode` is 'popover': the tile's representational icon becomes the trigger. */
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5 transition-colors duration-200 hover:border-primary/25 hover:bg-accent dark:bg-surface-container-low/60 dark:hover:border-primary/30 dark:hover:bg-surface-container-high',
        className,
      )}
    >
      <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
        {label}
        {hint && hintMode === 'popover' && Icon ? (
          <HintPopover
            label={`Penjelasan ${label}`}
            description={<HintContent hint={hint} />}
            align="start"
            className="inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Icon aria-hidden="true" className="size-3.5" />
          </HintPopover>
        ) : null}
      </span>
      <span className="font-heading text-lg leading-tight font-semibold text-foreground tabular-nums">
        {value}
      </span>
      {hint && hintMode === 'note' ? (
        <div className="text-[11px] text-muted-foreground">
          <HintContent hint={hint} />
        </div>
      ) : null}
    </div>
  )
}
