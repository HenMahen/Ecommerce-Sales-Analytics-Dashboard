import { useState, type ReactNode } from 'react'
import { useDataState } from '@/app/DataProvider'
import { useRouter } from '@/app/router'
import { ErrorState, PanelSkeleton } from '@/components/feedback/AsyncStates'
import { GlobalFilterBar } from './GlobalFilterBar'
import { SidebarNav } from './SidebarNav'
import { TopHeader } from './TopHeader'

/**
 * Application shell: themed navigation rail + sticky top bar + work area.
 * The global filter bar is only rendered on pages whose numbers actually follow the filter.
 */
const SIDEBAR_STORAGE_KEY = 'dashboard.sidebarCollapsed'

/** Remember the collapsed preference so the rail keeps its width between visits. */
function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
}

/** Application shell: themed navigation rail + sticky top bar + work area. */
export function AppShell({ children }: { children: ReactNode }) {
  const state = useDataState()
  const { route } = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <PanelSkeleton className="w-full max-w-md" />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <ErrorState
          title={state.title}
          message={state.message}
          details={state.details}
          className="w-full max-w-2xl"
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopHeader onOpenMenu={() => setMobileOpen(true)} />

        {route.status === 'ready' && route.id !== 'case-study' ? (
          <div className="px-4 pt-5 lg:px-6">
            <GlobalFilterBar />
          </div>
        ) : null}

        <main className="flex-1 px-4 py-5 lg:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  )
}
