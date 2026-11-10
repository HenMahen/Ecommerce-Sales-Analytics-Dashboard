/**
 * Presentation-level comparison helpers for the KPI trend indicator.
 *
 * Business formulas stay in the data pipeline; these helpers only turn two already-computed
 * values into a signed percentage and the prop shape used by `KpiCard`.
 */

export type TrendDirection = 'higher-is-better' | 'lower-is-better'

export interface TrendComparison {
  /** Percentage change, e.g. +3.2 or -1.8. */
  changePct: number
  /** Comparison period label, e.g. "vs bulan sebelumnya". */
  periodLabel: string
  /** 'higher-is-better' makes an increase green; 'lower-is-better' reverses it. */
  direction?: TrendDirection
}

/**
 * Percentage change against a positive baseline. Returns null when a previous value is zero,
 * negative, or not finite, so a misleading percentage is never rendered.
 */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null
  return ((current - previous) / previous) * 100
}

/**
 * Change between the last two points of an ascending monthly series. The selector may return null
 * for non-additive measures that are unavailable in a given month; the indicator is then hidden.
 */
export function monthOverMonthChange<T>(
  points: T[],
  value: (point: T) => number | null,
): number | null {
  if (points.length < 2) return null
  const previous = value(points[points.length - 2])
  const current = value(points[points.length - 1])
  if (previous === null || current === null) return null
  return percentChange(current, previous)
}

/** Builds the optional `KpiCard` prop; null change means the indicator is not rendered. */
export function monthOverMonthTrend(
  changePct: number | null,
  direction: TrendDirection = 'higher-is-better',
): TrendComparison | undefined {
  if (changePct === null) return undefined
  return {
    changePct,
    periodLabel: 'vs bulan sebelumnya',
    direction,
  }
}
