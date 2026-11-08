import { CircleAlert, TriangleAlert } from 'lucide-react'
import { cn } from 'cn'

/** Loading placeholder that matches the shape of a real panel, so layout does not jump. */
export function PanelSkeleton({ className, lines = 4 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-busy="true" aria-live="polite">
      <span className="block h-5 w-40 animate-pulse rounded-md bg-muted" />
      <span className="block h-[220px] w-full animate-pulse rounded-lg bg-muted" />
      {Array.from({ length: Math.max(0, lines - 2) }).map((_, index) => (
        <span key={index} className="block h-4 w-full animate-pulse rounded-md bg-muted" />
      ))}
      <span className="sr-only">Memuat data dashboard...</span>
    </div>
  )
}

export function ErrorState({
  title,
  message,
  details,
  className,
}: {
  title: string
  message: string
  details?: string[]
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-negative/30 bg-negative/5 p-6 text-sm',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-negative">
        <CircleAlert aria-hidden="true" className="size-5" />
        <h2 className="font-heading text-base font-semibold">{title}</h2>
      </div>
      <p className="text-foreground">{message}</p>
      {details && details.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function EmptyState({
  title,
  message,
  className,
}: {
  title: string
  message: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center',
        className,
      )}
    >
      <TriangleAlert aria-hidden="true" className="size-5 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
    </div>
  )
}
