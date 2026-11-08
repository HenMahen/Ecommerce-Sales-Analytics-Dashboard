/**
 * Shared colour chips for card icons. KPI cards and chart panels use the same palette so every
 * card icon that opens an explanation looks like the same kind of affordance.
 */
export const ICON_TONES = {
  violet:
    'bg-brand-violet/10 text-brand-violet dark:bg-primary-container/20 dark:text-primary-container dark:shadow-[0_0_14px_rgba(255,58,194,0.18)]',
  blue: 'bg-brand-blue/10 text-brand-blue dark:bg-tertiary/15 dark:text-tertiary dark:shadow-[0_0_14px_rgba(188,194,255,0.16)]',
  pink: 'bg-brand-pink/10 text-brand-pink dark:bg-secondary/15 dark:text-secondary dark:shadow-[0_0_14px_rgba(229,180,255,0.16)]',
  positive:
    'bg-positive/10 text-positive dark:bg-positive/15 dark:shadow-[0_0_14px_rgba(0,255,163,0.14)]',
} as const

export type IconTone = keyof typeof ICON_TONES

/** Base circle for card icon chips shared by KPI cards and chart panels. */
export const CHIP = 'flex size-9 shrink-0 items-center justify-center rounded-full'

/** Extra affordances for chips that open a description on click. */
export const CHIP_TRIGGER =
  'cursor-pointer transition-shadow hover:ring-2 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
