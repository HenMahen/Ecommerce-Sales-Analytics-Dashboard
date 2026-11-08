import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  applyTheme,
  nextThemeMode,
  readStoredMode,
  resolveTheme,
  storeMode,
  systemPrefersDark,
  type ResolvedTheme,
  type ThemeMode,
} from '@/lib/theme'

interface ThemeContextValue {
  /** User preference: light, dark, or follow the operating system. */
  mode: ThemeMode
  /** What is actually painted right now (system preference already resolved). */
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  /** Advances light → dark → system, for the single header button. */
  cycleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Keeps the `.dark` class on <html> in sync with the stored preference and the system setting.
 * index.html already applied the same theme before first paint; this only takes over afterwards.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode(storage()))
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark)

  const resolved = resolveTheme(mode, prefersDark)

  useEffect(() => {
    applyTheme(resolved, document.documentElement)
  }, [resolved])

  // Follow the operating system while mode === "system".
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const setMode = (next: ThemeMode) => {
    setModeState(next)
    storeMode(storage(), next)
  }

  return (
    <ThemeContext.Provider
      value={{ mode, resolved, setMode, cycleMode: () => setMode(nextThemeMode(mode)) }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme harus dipakai di dalam ThemeProvider')
  return context
}
