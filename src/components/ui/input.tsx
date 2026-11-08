import { cn } from 'cn'

/**
 * Shared text input. Kept dimensionally identical to SelectTrigger (h-9, rounded-md, border-input)
 * so inputs and selects line up in the same form row; colours come only from theme tokens.
 */
function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-input bg-card px-2.5 py-1 text-body text-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:border-input dark:bg-surface-container-lowest/80 dark:hover:border-primary/40',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
