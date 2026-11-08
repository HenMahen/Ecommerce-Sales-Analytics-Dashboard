import { CalendarDays, Coins, Lightbulb, Truck, Users, type LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import { EmptyState } from '@/components/feedback/AsyncStates'
import { HintPopover } from '@/components/metrics/HintPopover'
import { CHIP, CHIP_TRIGGER, ICON_TONES, type IconTone } from '@/components/metrics/iconTones'
import { StatusPill } from '@/components/metrics/StatusPill'
import type { Insight } from './insights'

/** One representational icon per tile; clicking it opens the apa / kenapa / bagaimana explanation. */
const INSIGHT_ICONS: Record<string, { icon: LucideIcon; tone: IconTone }> = {
  'month-net-sales': { icon: CalendarDays, tone: 'violet' },
  'month-profit': { icon: Coins, tone: 'blue' },
  'top-status': { icon: Truck, tone: 'pink' },
  'top-segment': { icon: Users, tone: 'positive' },
}

const FALLBACK_ICON: { icon: LucideIcon; tone: IconTone } = {
  icon: Lightbulb,
  tone: 'positive',
}

/**
 * Compact tiles for the business-insight panel. Every tile states its own scope on the top right,
 * and its numbers and full explanation (the former caption line) live behind the tile's icon
 * popover, so the tile itself stays short.
 */
export function BusinessInsights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <EmptyState
        title="Belum ada wawasan pada rentang ini"
        message="Perlebar rentang bulan pada filter global."
      />
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {insights.map((insight) => {
        const { icon: Icon, tone } = INSIGHT_ICONS[insight.id] ?? FALLBACK_ICON
        return (
          <li
            key={insight.id}
            className="flex flex-col gap-3 rounded-lg border border-border/70 border-l-2 border-l-brand-violet/60 bg-muted/30 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <HintPopover
                  label={`Penjelasan ${insight.label}`}
                  description={insight.info}
                  align="start"
                  className={cn(CHIP, CHIP_TRIGGER, ICON_TONES[tone])}
                >
                  <Icon aria-hidden="true" className="size-4" />
                </HintPopover>
                <p className="text-sm font-medium text-foreground">{insight.label}</p>
              </div>
              <StatusPill label={insight.scope} tone="neutral" className="shrink-0" />
            </div>
            <p className="font-heading text-2xl leading-tight font-semibold text-foreground tabular-nums">
              {insight.value}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
