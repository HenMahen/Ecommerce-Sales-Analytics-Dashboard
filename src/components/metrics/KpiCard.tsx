import { type LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import { HintContent, HintPopover, type MetricHintContent } from '@/components/metrics/HintPopover'
import { CHIP, CHIP_TRIGGER, ICON_TONES, type IconTone } from '@/components/metrics/iconTones'
import { Card } from '@/components/ui/card'

export function KpiCard({
  label,
  value,
  hint,
  hintMode = 'note',
  icon: Icon,
  iconTone = 'violet',
  footer,
  loading = false,
  className,
  style,
}: {
  label: string
  value: string
  hint?: string | MetricHintContent
  /**
   * 'note' keeps the hint visible under the value (default). 'popover' hides it behind the card
   * icon: hovering (desktop) or tapping (touch) opens the short description.
   */
  hintMode?: 'note' | 'popover'
  icon?: LucideIcon
  iconTone?: IconTone
  footer?: React.ReactNode
  loading?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <Card
      className={cn(
        'relative gap-0 p-5 transition-all duration-200 ease-out before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary before:content-[""] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card-hover)] dark:bg-card/85 dark:before:bg-gradient-to-r dark:before:from-primary dark:before:via-secondary dark:before:to-tertiary dark:hover:border-primary-container/40',
        className,
      )}
      style={style}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            {label}
          </span>
          {loading ? (
            <span className="block h-8 w-32 animate-pulse rounded-md bg-muted" aria-hidden="true" />
          ) : (
            <span className="font-heading text-display text-foreground tabular-nums">{value}</span>
          )}
        </div>
        {Icon ? (
          hint && hintMode === 'popover' ? (
            <HintPopover
              label={`Penjelasan ${label}`}
              description={<HintContent hint={hint} />}
              align="end"
              className={cn(CHIP, CHIP_TRIGGER, ICON_TONES[iconTone])}
            >
              <Icon aria-hidden="true" className="size-4" />
            </HintPopover>
          ) : (
            <span aria-hidden="true" className={cn(CHIP, ICON_TONES[iconTone])}>
              <Icon className="size-4" />
            </span>
          )
        ) : null}
      </div>
      {hintMode === 'note' || footer ? (
        <div className="mt-3 flex flex-col gap-2">
          {hintMode === 'note' && hint ? (
            <div className="text-xs text-muted-foreground">
              <HintContent hint={hint} />
            </div>
          ) : null}
          {footer}
        </div>
      ) : null}
    </Card>
  )
}
