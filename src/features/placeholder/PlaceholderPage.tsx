import { EmptyState } from '@/components/feedback/AsyncStates'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusPill } from '@/components/metrics/StatusPill'

/**
 * Honest placeholder for routes that are still planned. It must not invent metrics:
 * it only states that the page is not built yet and which milestone will build it.
 */
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={description}
        badges={<StatusPill label="Belum diimplementasikan" tone="warning" />}
      />
      <EmptyState
        title="Halaman ini belum dibangun"
        message="Panel halaman ini akan ditambahkan pada milestone berikutnya, tanpa angka yang dibuat-buat."
      />
    </div>
  )
}
