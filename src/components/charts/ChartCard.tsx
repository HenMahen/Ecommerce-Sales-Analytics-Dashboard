import { Info, type LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import { HintPopover } from '@/components/metrics/HintPopover'
import { CHIP, CHIP_TRIGGER, ICON_TONES, type IconTone } from '@/components/metrics/iconTones'
import { Card } from '@/components/ui/card'

/**
 * Shared frame for every chart panel: title, optional icon chip that opens a short description on
 * click, scope badge, and an optional footnote. Keeps typography and spacing identical across
 * panels (no duplicated markup per page). Panels that must stay text-light pass `info` alongside
 * `icon` instead of `description`/`footnote`.
 */
export function ChartCard({
  title,
  description,
  info,
  icon: Icon,
  iconTone = 'violet',
  scope,
  action,
  footnote,
  children,
  className,
  style,
  bodyClassName,
}: {
  title: string
  description?: string
  /** Short description (apa / kenapa / bagaimana) opened from the icon chip on click. */
  info?: string
  /** The panel's representational icon; when `info` is set this chip becomes the click trigger. */
  icon?: LucideIcon
  iconTone?: IconTone
  /** Where the panel's numbers come from, e.g. "Seluruh periode 2021-2025". */
  scope?: string
  action?: React.ReactNode
  footnote?: React.ReactNode
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  bodyClassName?: string
}) {
  return (
    <Card
      className={cn(
        'gap-0 p-5 transition-all duration-200 ease-out hover:border-primary/35 hover:shadow-[var(--shadow-card-hover)] dark:bg-card/85 dark:hover:border-primary-container/35',
        className,
      )}
      style={style}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {info ? (
            <HintPopover
              label={`Penjelasan ${title}`}
              description={info}
              align="start"
              className={cn(CHIP, CHIP_TRIGGER, ICON_TONES[iconTone])}
            >
              {Icon ? (
                <Icon aria-hidden="true" className="size-4" />
              ) : (
                <Info aria-hidden="true" className="size-4" />
              )}
            </HintPopover>
          ) : null}
          <div className="flex flex-col gap-1">
            <h3 className="font-heading text-lg leading-tight font-semibold text-foreground">
              {title}
            </h3>
            {description ? (
              <p className="max-w-prose text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {scope ? <ChartScopeBadge scope={scope} /> : null}
          {action}
        </div>
      </div>
      <div className={cn('mt-4', bodyClassName)}>{children}</div>
      {footnote ? (
        <div className="mt-4 flex items-start gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <div className="flex flex-col gap-1">{footnote}</div>
        </div>
      ) : null}
    </Card>
  )
}

export function ChartScopeBadge({ scope }: { scope: string }) {
  const followsFilter = scope.toLowerCase().startsWith('mengikuti')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.04em] uppercase',
        followsFilter
          ? 'border-brand-blue/30 bg-brand-blue/10 text-brand-blue dark:border-tertiary/30 dark:bg-tertiary/10 dark:text-tertiary'
          : 'border-border bg-muted/70 text-muted-foreground dark:bg-surface-container-high/70',
      )}
    >
      {scope}
    </span>
  )
}
