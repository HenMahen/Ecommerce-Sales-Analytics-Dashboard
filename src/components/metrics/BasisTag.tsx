import { cn } from 'cn'

const TONES = {
  aggregate: 'border-brand-violet/30 bg-brand-violet/10 text-brand-violet',
  transaction: 'border-brand-blue/30 bg-brand-blue/10 text-brand-blue',
  reconciled: 'border-positive/30 bg-positive/10 text-positive',
  neutral: 'border-border bg-muted/70 text-muted-foreground',
} as const

export type BasisTagKind = keyof typeof TONES

const LABELS: Record<BasisTagKind, string> = {
  aggregate: 'Margin keseluruhan (utama)',
  transaction: 'Rata-rata transaksi (sekunder)',
  reconciled: 'Terekonsiliasi',
  neutral: 'Catatan',
}

/**
 * Every margin value on screen must say which basis it uses
 * (docs/METRIC_DICTIONARY.md §0, decision D1).
 */
export function BasisTag({
  kind,
  label,
  className,
}: {
  kind: BasisTagKind
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] leading-4 font-medium tracking-[0.04em] whitespace-nowrap uppercase',
        TONES[kind],
        className,
      )}
    >
      {label ?? LABELS[kind]}
    </span>
  )
}
