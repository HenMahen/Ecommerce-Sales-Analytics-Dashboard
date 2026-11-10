import type { ReactNode } from 'react'
import { cn } from 'cn'

export interface DataTableColumn<T> {
  key: string
  header: ReactNode
  align?: 'left' | 'right'
  width?: string
  render: (row: T, index: number) => React.ReactNode
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>
  rows: T[]
  getRowKey: (row: T, index: number) => string
  caption?: string
  className?: string
  /** Optional row-level accent, e.g. a soft warning background on an outlier row. */
  rowClassName?: (row: T, index: number) => string | undefined
}

/**
 * Table styling foundation for the dashboard: soft header, numeric columns right-aligned with
 * tabular figures, subtle row separators, and horizontal scrolling on narrow screens.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  className,
  rowClassName,
}: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-[560px] border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  'px-2 py-2 font-mono text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase',
                  column.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={getRowKey(row, index)}
              className={cn(
                'border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50',
                rowClassName?.(row, index),
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-2 py-2.5 align-middle',
                    column.align === 'right'
                      ? 'font-mono text-right tabular-nums whitespace-nowrap'
                      : 'text-left',
                  )}
                >
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
