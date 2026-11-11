import { ChevronsRight, Layers, X } from 'lucide-react'
import { cn } from 'cn'
import { useRouter } from '@/app/router'
import { ROUTES } from '@/app/routes'

const SECTIONS = ['Analitik', 'Referensi'] as const

function SidebarContent({
  collapsed = false,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed?: boolean
  onNavigate?: () => void
  onToggleCollapse?: () => void
}) {
  const { route, navigate } = useRouter()

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out dark:bg-sidebar/90 dark:shadow-[4px_0_30px_rgba(0,0,0,0.5)] dark:backdrop-blur-xl',
        collapsed ? 'w-[76px]' : 'w-[264px]',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 border-b border-sidebar-border px-5 py-5',
          collapsed && 'justify-center px-0',
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-container text-primary-foreground shadow-[var(--shadow-rail)] dark:bg-surface-container-high dark:text-primary dark:ring-1 dark:ring-primary/25"
        >
          <Layers className="size-4" />
        </span>
        <div className={cn('flex min-w-0 flex-col', collapsed && 'sr-only')}>
          <span className="truncate font-heading text-base leading-tight font-semibold text-sidebar-foreground">
            Dashboard Sales
          </span>
          <span
            aria-hidden="true"
            className="my-1 h-[3px] w-7 shrink-0 rounded-full bg-brand-gradient"
          />
          <span className="truncate text-[11px] text-sidebar-foreground/70">
            E-Commerce Analytics
          </span>
        </div>
      </div>

      <nav
        aria-label="Navigasi utama"
        className="flex flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto px-3 py-4"
      >
        {SECTIONS.map((section) => (
          <div key={section} className="flex flex-col gap-1">
            <p
              className={cn(
                'px-3 pb-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-sidebar-foreground/55 uppercase',
                collapsed && 'sr-only',
              )}
            >
              {section}
            </p>
            {ROUTES.filter((item) => item.section === section).map((item) => {
              const active = item.id === route.id
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    navigate(item.path)
                    onNavigate?.()
                  }}
                  className={cn(
                    'group relative flex w-full items-center rounded-lg py-2 text-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                    active
                      ? 'bg-primary-container font-semibold text-primary-foreground shadow-[var(--shadow-rail)] dark:bg-sidebar-accent dark:text-sidebar-foreground dark:ring-1 dark:ring-primary/25 dark:shadow-[0_0_18px_rgba(255,28,192,0.45)]'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      'size-4 shrink-0',
                      active && 'text-primary-foreground dark:text-primary',
                    )}
                  />
                  <span className={cn('flex-1 text-left', collapsed && 'sr-only')}>
                    {item.label}
                  </span>
                  {item.status === 'planned' ? (
                    collapsed ? (
                      <span
                        aria-hidden="true"
                        title="Segera"
                        className="absolute top-2 right-2 size-1.5 rounded-full bg-brand-pink"
                      />
                    ) : (
                      <span className="rounded-full border border-sidebar-border px-1.5 py-0.5 font-mono text-[10px] leading-4 text-sidebar-foreground/70">
                        segera
                      </span>
                    )
                  ) : null}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {onToggleCollapse ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Perluas navigasi' : 'Kecilkan navigasi'}
          title={collapsed ? 'Perluas navigasi' : 'Kecilkan navigasi'}
          className={cn(
            'flex items-center gap-3 border-t border-sidebar-border py-3 font-mono text-[11px] font-medium tracking-wide text-sidebar-foreground/80 uppercase transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
            collapsed ? 'justify-center px-0' : 'px-5',
          )}
        >
          <ChevronsRight
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 transition-transform duration-200',
              !collapsed && 'rotate-180',
            )}
          />
          <span className={cn(collapsed && 'sr-only')}>Kecilkan</span>
        </button>
      ) : null}
    </div>
  )
}

/**
 * Dark navy navigation rail with an optional collapsed mode (blueprint §6 `SidebarNav.collapsed`).
 * Fixed rail on desktop, slide-over drawer below `lg`.
 */
export function SidebarNav({
  mobileOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  mobileOpen: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  return (
    <>
      <aside className="sticky top-0 hidden h-screen lg:block">
        <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </aside>

      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden print:hidden',
          mobileOpen ? '' : 'pointer-events-none',
        )}
      >
        <button
          type="button"
          aria-label="Tutup navigasi"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={onClose}
          className={cn(
            'absolute inset-0 bg-black/60 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 shadow-2xl transition-transform',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            type="button"
            aria-label="Tutup navigasi"
            onClick={onClose}
            className="absolute top-4 right-3 z-10 rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="size-4" />
          </button>
          <SidebarContent onNavigate={onClose} />
        </div>
      </div>
    </>
  )
}
