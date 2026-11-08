/**
 * Theme resolution shared by the app and by the pre-paint script in index.html.
 *
 * The pre-paint script cannot import this module (it runs before any bundle), so it repeats the
 * same three rules. Keep both in sync: storage key, allowed values, and the `.dark` class.
 */
export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'dashboard.theme'
export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system']
export const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'Terang',
  dark: 'Gelap',
  system: 'Sistem',
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

/** Stored preference, defaulting to "system" when nothing valid was saved. */
export function readStoredMode(storage?: Pick<Storage, 'getItem'> | null): ThemeMode {
  if (!storage) return 'system'
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(stored) ? stored : 'system'
  } catch {
    // Storage can throw when cookies/site data are blocked.
    return 'system'
  }
}

export function storeMode(storage: Pick<Storage, 'setItem'> | null, mode: ThemeMode): void {
  if (!storage) return
  try {
    storage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // Persisting the preference is best-effort; the session still works without it.
  }
}

export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
  return mode
}

/** Light → Dark → System → Light, so every mode stays reachable from one button. */
export function nextThemeMode(mode: ThemeMode): ThemeMode {
  const index = THEME_MODES.indexOf(mode)
  return THEME_MODES[(index + 1) % THEME_MODES.length]
}

/** Applies the resolved theme to <html>: class for Tailwind, dataset and color-scheme for the browser. */
export function applyTheme(theme: ResolvedTheme, root: HTMLElement): void {
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
