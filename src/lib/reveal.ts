import type { CSSProperties } from 'react'

/**
 * Entrance animation for dashboard cards: one short fade/slide per card on first paint (open or
 * refresh), staggered in reading order so the page assembles instead of popping at once.
 * Classes come from the `card-enter` utility in `src/index.css`; reduced-motion turns it off.
 */
export function reveal(
  delayMs: number,
  extraClass = '',
): { className: string; style: CSSProperties } {
  return {
    className: extraClass ? `card-enter ${extraClass}` : 'card-enter',
    style: { animationDelay: `${delayMs}ms` },
  }
}
