import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * The card's own icon, clickable to open a short explanation. Behaviour note: the description
 * opens on CLICK (not hover), so touch users get the same access, and it closes on outside click
 * or Escape. Each card keeps its representational icon instead of a generic info glyph.
 *
 * Copy rule for `description`: 2-3 short sentences covering apa / kenapa / bagaimana in plain
 * business language, without printing those three labels.
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
  /** Short description shown inside the popup. */
  description: string
  children: React.ReactNode
  className?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
}) {
  return (
    <Popover>
      <PopoverTrigger aria-label={label} className={className}>
        {children}
      </PopoverTrigger>
      <PopoverContent side={side} align={align}>
        {description}
      </PopoverContent>
    </Popover>
  )
}
