import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DataLoadError, ReconciliationError, loadDashboardData } from '@/data/loadDashboardData'
import type { DashboardData } from '@/data/types'

export type DataState =
  | { status: 'loading' }
  | { status: 'ready'; data: DashboardData }
  | { status: 'error'; title: string; message: string; details: string[] }

const DataContext = createContext<DataState | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    loadDashboardData(controller.signal)
      .then((data) => {
        if (active) setState({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ReconciliationError) {
          setState({
            status: 'error',
            title: 'Rekonsiliasi data gagal',
            message:
              'Angka tidak lolos pemeriksaan integritas, jadi tidak ada hasil yang ditampilkan.',
            details: error.failures,
          })
        } else if (error instanceof DataLoadError) {
          setState({
            status: 'error',
            title: 'Data tidak dapat dimuat',
            message: error.message,
            details: [],
          })
        } else {
          setState({
            status: 'error',
            title: 'Galat tidak terduga',
            message: error instanceof Error ? error.message : String(error),
            details: [],
          })
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>
}

export function useDataState(): DataState {
  const state = useContext(DataContext)
  if (!state) throw new Error('useDataState harus dipakai di dalam <DataProvider>.')
  return state
}

export function useDashboardData(): DashboardData {
  const state = useDataState()
  if (state.status !== 'ready') throw new Error('Data dashboard belum siap.')
  return state.data
}
