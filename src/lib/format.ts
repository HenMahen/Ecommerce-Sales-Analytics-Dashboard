/**
 * Presentation-only formatting helpers. No business formulas live here: every function turns an
 * already-computed number into text.
 */

const idrGrouping = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const idrTwoDecimals = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCount(value: number): string {
  return idrGrouping.format(value)
}

export function formatUsd(value: number, decimals: 0 | 2 = 0): string {
  const formatter = decimals === 2 ? idrTwoDecimals : idrGrouping
  const sign = value < 0 ? '-' : ''
  return `${sign}$${formatter.format(Math.abs(value))}`
}

/** Axis/label helper: 157143214 -> "$157 jt". Keeps chart axes readable. */
export function formatUsdCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}$${idrTwoDecimals.format(abs / 1_000_000_000)} m`
  if (abs >= 1_000_000) return `${sign}$${idrGrouping.format(abs / 1_000_000)} jt`
  if (abs >= 1_000) return `${sign}$${idrGrouping.format(abs / 1_000)} rb`
  return `${sign}$${idrGrouping.format(abs)}`
}

/**
 * Business-friendly money with a scale note: 157143214 -> "$157,14 juta", 426306.8 ->
 * "$426,31 ribu". Turns long figures into short ones with two decimals.
 */
export function formatUsdScaled(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000_000)
    return `${sign}$${idrTwoDecimals.format(abs / 1_000_000_000_000)} triliun`
  if (abs >= 1_000_000_000) return `${sign}$${idrTwoDecimals.format(abs / 1_000_000_000)} miliar`
  if (abs >= 1_000_000) return `${sign}$${idrTwoDecimals.format(abs / 1_000_000)} juta`
  if (abs >= 10_000) return `${sign}$${idrTwoDecimals.format(abs / 1_000)} ribu`
  return formatUsd(value, 2)
}

/** Business-friendly counts: 138116 -> "138,12 ribu", 194 -> "194". Two decimals when scaled. */
export function formatCountScaled(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}${idrTwoDecimals.format(abs / 1_000_000_000)} miliar`
  if (abs >= 1_000_000) return `${sign}${idrTwoDecimals.format(abs / 1_000_000)} juta`
  if (abs >= 1_000) return `${sign}${idrTwoDecimals.format(abs / 1_000)} ribu`
  return formatCount(value)
}

export function formatPercent(value: number, decimals: 0 | 2 = 2): string {
  const formatter = decimals === 0 ? idrGrouping : idrTwoDecimals
  return `${formatter.format(value)}%`
}

export function formatDecimal(value: number, decimals = 2): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** "2024-07" -> "Jul 2024". Falls back to the raw value when the period is malformed. */
export function formatPeriodLabel(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match) return period
  const [, year, month] = match
  const date = new Date(Number(year), Number(month) - 1, 1)
  const monthLabel = date.toLocaleDateString('id-ID', { month: 'short' })
  return `${monthLabel} ${year}`
}

/** Short axis label for 60-point series: "Jul 24". */
export function formatPeriodAxis(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match) return period
  const [, year, month] = match
  const date = new Date(Number(year), Number(month) - 1, 1)
  const monthLabel = date.toLocaleDateString('id-ID', { month: 'short' })
  return `${monthLabel} ${year.slice(2)}`
}
