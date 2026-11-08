import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_FILTER,
  activeFilterCount,
  isFilterActive,
  type DimensionKey,
  type FilterState,
} from '@/lib/filter'

interface FilterContextValue {
  filter: FilterState
  /** Sets the month range. `from`/`to` clamp each other in the filter bar before calling this. */
  setPeriod: (from: string | null, to: string | null) => void
  /** Sets one dimension filter to a value, or clears it with null. */
  setDimension: (dimension: DimensionKey, value: string | null) => void
  /** Sets the range to one full calendar year, or clears the range with null. */
  setYear: (year: string | null) => void
  /** Clears every filter at once (default = the whole validated dataset). */
  reset: () => void
  isActive: boolean
  activeCount: number
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)

  const setPeriod = useCallback((from: string | null, to: string | null) => {
    setFilter((current) => ({ ...current, from, to }))
  }, [])

  const setDimension = useCallback((dimension: DimensionKey, value: string | null) => {
    setFilter((current) => ({ ...current, [dimension]: value }) as FilterState)
  }, [])

  const setYear = useCallback((year: string | null) => {
    setFilter((current) =>
      year === null
        ? { ...current, from: null, to: null }
        : { ...current, from: `${year}-01`, to: `${year}-12` },
    )
  }, [])

  const reset = useCallback(() => setFilter(DEFAULT_FILTER), [])

  const value = useMemo<FilterContextValue>(
    () => ({
      filter,
      setPeriod,
      setDimension,
      setYear,
      reset,
      isActive: isFilterActive(filter),
      activeCount: activeFilterCount(filter),
    }),
    [filter, setPeriod, setDimension, setYear, reset],
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useFilter(): FilterContextValue {
  const value = useContext(FilterContext)
  if (!value) throw new Error('useFilter harus dipakai di dalam <FilterProvider>.')
  return value
}
