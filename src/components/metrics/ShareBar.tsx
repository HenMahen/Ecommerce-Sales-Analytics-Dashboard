import { cn } from 'cn'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const BAR_TONES = {
  violet: 'bg-primary dark:bg-brand-gradient',
  blue: 'bg-brand-blue',
  pink: 'bg-brand-pink',
} as const

/**
 * Progress-style bar for "share of total" values. Width is data, not decoration.
 * When `tooltip` is provided, the bar becomes a hover/focus target that reveals the detail while
 * the caption stays limited to the one number that matters most.
 */
export function ShareBar({
  valuePct,
  tone = 'violet',
  label,
  caption,
  tooltip,
  className,
}: {
  valuePct: number
  tone?: keyof typeof BAR_TONES
  label?: string
  caption?: string
  /** Extra detail shown on hover/focus over the bar, e.g. absolute value and margin. */
  tooltip?: string
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, valuePct))
  const bar = (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted dark:bg-surface-container-highest/80"
      role="img"
      aria-label={`${label ?? 'Porsi'}: ${caption ?? `${clamped}%`}`}
    >
      <div
        className={cn('h-full rounded-full', BAR_TONES[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label || caption ? (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium text-foreground">{label}</span>
          <span className="font-mono tabular-nums text-muted-foreground">{caption}</span>
        </div>
      ) : null}
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger
            type="button"
            delay={150}
            aria-label={`${label ?? 'Porsi'}: ${tooltip}`}
            className="block w-full cursor-help rounded-full border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {bar}
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="max-w-xs leading-relaxed">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : (
        bar
      )}
    </div>
  )
}
