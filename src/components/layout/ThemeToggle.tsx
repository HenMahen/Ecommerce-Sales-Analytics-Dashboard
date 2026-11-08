import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/app/ThemeProvider'
import { Button } from '@/components/ui/button'
import { THEME_LABELS } from '@/lib/theme'

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const

/**
 * One button for all three modes: Terang → Gelap → Sistem. The icon shows the active mode and
 * the accessible name spells it out, so the control stays usable without colour perception.
 */
export function ThemeToggle() {
  const { mode, cycleMode } = useTheme()
  const Icon = ICONS[mode]
  const nextLabel = THEME_LABELS[mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light']

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={cycleMode}
      aria-label={`Tema: ${THEME_LABELS[mode]}. Ganti ke tema ${nextLabel}.`}
      title={`Tema: ${THEME_LABELS[mode]}`}
    >
      <Icon aria-hidden="true" />
    </Button>
  )
}
