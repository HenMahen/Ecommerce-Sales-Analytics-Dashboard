import { cn } from 'cn'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Option } from '@/lib/filter'

/**
 * Labelled select built on the existing shadcn/base-ui primitive, so every filter in the bar has
 * identical markup, sizing, and keyboard behaviour.
 */
export function SelectField({
  id,
  label,
  value,
  options,
  onValueChange,
  placeholder,
  disabled,
  className,
}: {
  id: string
  label: string
  value: string
  options: Option[]
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex min-w-[10rem] flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className="font-mono text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase"
      >
        {label}
      </label>
      <Select
        value={value}
        items={options.map((option) => ({ label: option.label, value: option.value }))}
        onValueChange={(next) => {
          if (typeof next === 'string') onValueChange(next)
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full bg-card text-xs font-medium">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className={option.hidden ? 'hidden' : undefined}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
