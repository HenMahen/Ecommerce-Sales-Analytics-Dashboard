import { RotateCcw, X } from 'lucide-react'
import { useDashboardData } from '@/app/DataProvider'
import { useFilter } from '@/app/FilterProvider'
import { Button } from '@/components/ui/button'
import {
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  buildDimensionOptions,
  buildPeriodOptions,
  buildYearOptions,
  describeScope,
  periodRange,
  rangeYear,
  type DimensionKey,
  type Option,
} from '@/lib/filter'
import { formatPeriodLabel } from '@/lib/format'
import { SelectField } from './SelectField'

/** Sentinel values for "no filter" and "custom range" in the select controls. */
const ALL = 'all'
const CUSTOM = 'custom'

interface ActiveChip {
  id: string
  label: string
  clear: () => void
}

/**
 * Global filter bar. Every filter reads the same combined cube (definitions_version mvp-5), so
 * all combinations are valid: year, month range, customer segment, sales channel, order status.
 * Active filters are repeated as removable chips, and one button clears everything.
 */
export function GlobalFilterBar() {
  const data = useDashboardData()
  const { filter, setPeriod, setDimension, setYear, reset, isActive, activeCount } = useFilter()

  const periods = buildPeriodOptions(data)
  const range = periodRange(data)
  const from = filter.from ?? range.min
  const to = filter.to ?? range.max
  const fullPeriod = `Seluruh periode ${data.metadata.date_range.min.slice(0, 4)}-${data.metadata.date_range.max.slice(0, 4)}`

  // The year selector is derived from the month range, so the two controls cannot contradict.
  const year = rangeYear(filter)
  const yearValue = year ?? (filter.from || filter.to ? CUSTOM : ALL)
  // "Rentang kustom" must stay mounted even when it is not the current value: base-ui resets the
  // selection when the selected item unmounts while the popup is open. It is always disabled (the
  // custom range is created by the month selects) and hidden outside the custom state.
  const yearOptions: Option[] = [
    { value: ALL, label: 'Semua tahun' },
    ...buildYearOptions(data),
    { value: CUSTOM, label: 'Rentang kustom', disabled: true, hidden: yearValue !== CUSTOM },
  ]

  const withAll = (dimension: DimensionKey, allLabel: string): Option[] => [
    { value: ALL, label: allLabel },
    ...buildDimensionOptions(data, dimension),
  ]

  const dimensionValue = (dimension: DimensionKey): string => filter[dimension] ?? ALL

  const onDimensionChange = (dimension: DimensionKey, value: string) => {
    setDimension(dimension, value === ALL ? null : value)
  }

  const chips: ActiveChip[] = []
  if (filter.from || filter.to) {
    chips.push({
      id: 'period',
      label: year ? `Tahun ${year}` : `${formatPeriodLabel(from)} – ${formatPeriodLabel(to)}`,
      clear: () => setYear(null),
    })
  }
  for (const dimension of DIMENSION_KEYS) {
    const value = filter[dimension]
    if (value) {
      chips.push({
        id: dimension,
        label: `${DIMENSION_LABELS[dimension]}: ${value}`,
        clear: () => setDimension(dimension, null),
      })
    }
  }

  return (
    <section
      aria-label="Filter global"
      className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] dark:bg-card/60 dark:backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          id="filter-year"
          label="Tahun"
          value={yearValue}
          options={yearOptions}
          onValueChange={(value) => {
            if (value === ALL) setYear(null)
            else if (value !== CUSTOM) setYear(value)
          }}
          className="w-[9.5rem]"
        />
        <SelectField
          id="filter-from"
          label="Dari bulan"
          value={from}
          options={periods}
          onValueChange={(value) => setPeriod(value, value > to ? value : to)}
          className="w-[10.5rem]"
        />
        <SelectField
          id="filter-to"
          label="Sampai bulan"
          value={to}
          options={periods}
          onValueChange={(value) => setPeriod(value < from ? value : from, value)}
          className="w-[10.5rem]"
        />

        <div aria-hidden="true" className="hidden h-9 w-px self-end bg-border sm:block" />

        <SelectField
          id="filter-segment"
          label={DIMENSION_LABELS.segment}
          value={dimensionValue('segment')}
          options={withAll('segment', 'Semua segmen')}
          onValueChange={(value) => onDimensionChange('segment', value)}
        />
        <SelectField
          id="filter-channel"
          label={DIMENSION_LABELS.salesChannel}
          value={dimensionValue('salesChannel')}
          options={withAll('salesChannel', 'Semua channel')}
          onValueChange={(value) => onDimensionChange('salesChannel', value)}
        />
        <SelectField
          id="filter-status"
          label={DIMENSION_LABELS.orderStatus}
          value={dimensionValue('orderStatus')}
          options={withAll('orderStatus', 'Semua status')}
          onValueChange={(value) => onDimensionChange('orderStatus', value)}
        />

        <div className="ml-auto flex items-center gap-2 self-end">
          <Button variant="outline" size="sm" onClick={reset} disabled={!isActive}>
            <RotateCcw aria-hidden="true" />
            Hapus semua filter
          </Button>
        </div>
      </div>

      {chips.length > 0 ? (
        <ul aria-label="Filter aktif" className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <li key={chip.id}>
              <button
                type="button"
                onClick={chip.clear}
                aria-label={`Hapus filter ${chip.label}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/70 px-2.5 py-1 font-mono text-[11px] tracking-wide text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-surface-container-high/80"
              >
                <span>{chip.label}</span>
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p
        role="status"
        className="mt-3 flex flex-wrap items-center gap-x-2 font-mono text-[11px] tracking-wide text-muted-foreground"
      >
        <span className="font-medium text-foreground">
          {isActive ? `${activeCount} filter aktif` : 'Tanpa filter'}
        </span>
        <span aria-hidden="true">·</span>
        <span>{isActive ? describeScope(data, filter) : fullPeriod}</span>
      </p>
    </section>
  )
}
