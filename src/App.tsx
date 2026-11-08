import { DataProvider } from '@/app/DataProvider'
import { FilterProvider } from '@/app/FilterProvider'
import { ThemeProvider } from '@/app/ThemeProvider'
import { RouterProvider, useRouter } from '@/app/router'
import { AppShell } from '@/components/layout/AppShell'
import { CustomerIntelligencePage } from '@/features/customer-intelligence/CustomerIntelligencePage'
import { ExecutiveOverviewPage } from '@/features/executive-overview/ExecutiveOverviewPage'
import { PlaceholderPage } from '@/features/placeholder/PlaceholderPage'
import { SalesProfitabilityPage } from '@/features/sales-profitability/SalesProfitabilityPage'
import { TransactionExplorerPage } from '@/features/transaction-explorer/TransactionExplorerPage'

function RouteOutlet() {
  const { route } = useRouter()
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
              <RouteOutlet />
            </AppShell>
          </FilterProvider>
        </RouterProvider>
      </DataProvider>
    </ThemeProvider>
  )
}
