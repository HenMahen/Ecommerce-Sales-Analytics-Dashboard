import { cn } from 'cn'

export type PillTone = 'positive' | 'warning' | 'danger' | 'info' | 'violet' | 'neutral'

const TONES: Record<PillTone, string> = {
  positive: 'border-positive/30 bg-positive/10 text-positive',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-negative/30 bg-negative/10 text-negative',
  info: 'border-brand-blue/30 bg-brand-blue/10 text-brand-blue',
  violet: 'border-brand-violet/30 bg-brand-violet/10 text-brand-violet',
  neutral: 'border-border bg-muted/70 text-muted-foreground',
}

const ORDER_STATUS_TONES: Record<string, PillTone> = {
  Completed: 'positive',
  Pending: 'warning',
  Returned: 'violet',
  Cancelled: 'danger',
}

export function orderStatusTone(status: string): PillTone {
  return ORDER_STATUS_TONES[status] ?? 'neutral'
}

export function StatusPill({
  label,
  tone = 'neutral',
  className,
}: {
  label: string
  tone?: PillTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}
