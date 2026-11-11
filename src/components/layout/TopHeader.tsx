import { Menu, Printer } from 'lucide-react'
import { cn } from 'cn'
import { useDashboardData } from '@/app/DataProvider'
import { useRouter } from '@/app/router'
import { Button } from '@/components/ui/button'
import { ProfilePopover } from '@/components/profile/ProfilePopover'
import { ThemeToggle } from './ThemeToggle'

function Chip({
  children,
  className,
  title,
}: {
  children: React.ReactNode
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-muted/70 px-2.5 py-0.5 font-mono text-micro font-medium tracking-wide text-muted-foreground dark:bg-surface-container-high',
        className,
      )}
    >
      {children}
    </span>
  )
}

function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      aria-label="Export PDF / Cetak Laporan"
      title="Export PDF / Cetak Laporan"
    >
      <Printer aria-hidden="true" />
      <span className="hidden sm:inline">Export PDF</span>
    </Button>
  )
}

/** Sticky work-area top bar: dashboard identity + current page on the left, data range on the right. */
export function TopHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { route } = useRouter()
  const data = useDashboardData()
  const { metadata } = data

  const fromYear = metadata.date_range.min.slice(0, 4)
  const toYear = metadata.date_range.max.slice(0, 4)

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md lg:px-6 dark:bg-background/80 dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)] dark:backdrop-blur-xl">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Buka navigasi"
        className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden dark:bg-surface-container-low/60 dark:hover:bg-surface-container-high"
      >
        <Menu className="size-4" />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-primary shadow-[0_0_8px_rgba(0,55,176,0.45)] dark:bg-primary-container dark:shadow-[0_0_8px_rgba(255,58,194,0.8)]"
        />
        <span className="truncate font-heading text-[15px] leading-tight font-semibold text-foreground">
          Dashboard Sales
        </span>
        <span aria-hidden="true" className="hidden text-muted-foreground/50 sm:inline">
          /
        </span>
        <span className="hidden truncate text-sm text-muted-foreground sm:inline">
          {route.label}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Chip className="hidden sm:inline-flex" title={`Periode data ${fromYear} sampai ${toYear}`}>
          {fromYear}–{toYear}
        </Chip>
        <PrintButton />
        <ThemeToggle />
        <ProfilePopover />
      </div>
    </header>
  )
}
