import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * Standardized 2-part educational metric explanation for laypeople.
 */
export interface MetricHintContent {
  concept: React.ReactNode
  current: React.ReactNode
}
export function HintContent({ hint }: { hint: MetricHintContent | string }) {
  return typeof hint === 'string' ? (
    <>{hint}</>
  ) : (
    <MetricHint concept={hint.concept} current={hint.current} />
  )
}

export function MetricHint({
  concept,
  current,
}: {
  concept: React.ReactNode
  current: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5 text-left text-xs leading-relaxed">
      <div>
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <span>Apa maksudnya?</span>
        </div>
        <div className="mt-1 text-muted-foreground">{concept}</div>
      </div>
      <div className="border-t border-border/60 pt-2">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <span>Arti angka ini</span>
        </div>
        <div className="mt-1 text-muted-foreground">{current}</div>
      </div>
    </div>
  )
}

/**
 * The card's own icon, hoverable and clickable to open an explanation.
 *
 * Behavior:
 * - Desktop: Opens smoothly on hover with a ~150ms delay to avoid flickering.
 * - Mobile / Touch: Opens immediately on tap.
 * - Closes on outside click, mouse leave, or Escape.
 */
export function HintPopover({
  label,
  description,
  children,
  className,
  side = 'bottom',
  align = 'center',
}: {
  /** Accessible name of the trigger, e.g. "Penjelasan Net sales". */
  label: string
  /** Description shown inside the popup (string or structured MetricHint). */
  description: React.ReactNode
  children: React.ReactNode
  className?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className={className}
        openOnHover
        delay={150}
        closeDelay={150}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className="w-80 max-w-xs sm:max-w-sm p-3.5">
        {description}
      </PopoverContent>
    </Popover>
  )
}
