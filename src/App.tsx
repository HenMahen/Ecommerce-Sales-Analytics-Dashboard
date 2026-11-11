import { lazy, Suspense } from 'react'
import { DataProvider } from '@/app/DataProvider'
import { FilterProvider } from '@/app/FilterProvider'
import { ThemeProvider } from '@/app/ThemeProvider'
import { RouterProvider, useRouter } from '@/app/router'
import { PanelSkeleton } from '@/components/feedback/AsyncStates'
import { AppShell } from '@/components/layout/AppShell'

const CaseStudyPage = lazy(() =>
  import('@/features/case-study/CaseStudyPage').then((module) => ({
    default: module.CaseStudyPage,
  })),
)
const CustomerIntelligencePage = lazy(() =>
  import('@/features/customer-intelligence/CustomerIntelligencePage').then((module) => ({
    default: module.CustomerIntelligencePage,
  })),
)
const ExecutiveOverviewPage = lazy(() =>
  import('@/features/executive-overview/ExecutiveOverviewPage').then((module) => ({
    default: module.ExecutiveOverviewPage,
  })),
)
const PlaceholderPage = lazy(() =>
  import('@/features/placeholder/PlaceholderPage').then((module) => ({
    default: module.PlaceholderPage,
  })),
)
const SalesProfitabilityPage = lazy(() =>
  import('@/features/sales-profitability/SalesProfitabilityPage').then((module) => ({
    default: module.SalesProfitabilityPage,
  })),
)
const TransactionExplorerPage = lazy(() =>
  import('@/features/transaction-explorer/TransactionExplorerPage').then((module) => ({
    default: module.TransactionExplorerPage,
  })),
)

function RouteOutlet() {
  const { route } = useRouter()
  if (route.id === 'case-study') return <CaseStudyPage />
  if (route.id === 'transactions') return <TransactionExplorerPage />
  if (route.id === 'customers') return <CustomerIntelligencePage />
  if (route.id === 'sales') return <SalesProfitabilityPage />
  if (route.status === 'ready') return <ExecutiveOverviewPage />
  return <PlaceholderPage title={route.label} description={route.description} />
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <RouterProvider>
          <FilterProvider>
            <AppShell>
              <Suspense
                fallback={
                  <div className="p-6">
                    <PanelSkeleton lines={6} />
                  </div>
                }
              >
                <RouteOutlet />
              </Suspense>
            </AppShell>
          </FilterProvider>
        </RouterProvider>
      </DataProvider>
    </ThemeProvider>
  )
}
