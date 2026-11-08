import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Page title block used at the top of every page body: identity icon + title + one short
 * description on the left, scope badges and actions on the right.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  badges,
  actions,
}: {
  title: string
  description?: string
  /** Page identity icon (matches the route icon in the sidebar). */
  icon?: LucideIcon
  badges?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary-foreground shadow-[var(--shadow-rail)] dark:bg-surface-container-high dark:text-primary dark:ring-1 dark:ring-primary/25"
          >
            <Icon className="size-5" />
          </span>
        ) : null}
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-[1.75rem] leading-tight font-semibold tracking-tight text-balance text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {badges || actions ? (
        <div className="flex flex-wrap items-center gap-2">
          {badges}
          {actions}
        </div>
      ) : null}
    </div>
  )
}
