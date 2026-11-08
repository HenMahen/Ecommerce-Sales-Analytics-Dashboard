import { render, screen, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from '@/app/ThemeProvider'
import {
  THEME_STORAGE_KEY,
  applyTheme,
  isThemeMode,
  nextThemeMode,
  readStoredMode,
  resolveTheme,
  storeMode,
} from '@/lib/theme'

/** Minimal in-memory Storage for the pieces of the API the theme code touches. */
function fakeStorage(initial: Record<string, string> = {}, throwOnWrite = false): Storage {
  const data = { ...initial }
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      if (throwOnWrite) throw new Error('storage penuh')
      data[key] = value
    },
    removeItem: (key: string) => {
      delete data[key]
    },
    clear: () => undefined,
    key: () => null,
    length: 0,
  } as Storage
}

afterEach(() => {
  document.documentElement.classList.remove('dark')
  delete document.documentElement.dataset.theme
})

describe('resolusi tema', () => {
  it('menghormati preferensi tersimpan, dan jatuh ke "system" bila tidak valid', () => {
    expect(readStoredMode(fakeStorage({ [THEME_STORAGE_KEY]: 'dark' }))).toBe('dark')
    expect(readStoredMode(fakeStorage({ [THEME_STORAGE_KEY]: 'light' }))).toBe('light')
    expect(readStoredMode(fakeStorage({ [THEME_STORAGE_KEY]: 'system' }))).toBe('system')
    expect(readStoredMode(fakeStorage({ [THEME_STORAGE_KEY]: 'sepia' }))).toBe('system')
    expect(readStoredMode(fakeStorage())).toBe('system')
    expect(readStoredMode(null)).toBe('system')
  })

  it('tidak gagal saat localStorage ditolak peramban', () => {
    const breaking = {
      getItem: () => {
        throw new Error('diblokir')
      },
      setItem: () => {
        throw new Error('diblokir')
      },
    }
    expect(readStoredMode(breaking as unknown as Storage)).toBe('system')
    expect(() => storeMode(breaking as unknown as Storage, 'dark')).not.toThrow()
  })

  it('menyelesaikan "system" menjadi tema sistem operasi', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('memutar mode terang -> gelap -> sistem', () => {
    expect(nextThemeMode('light')).toBe('dark')
    expect(nextThemeMode('dark')).toBe('system')
    expect(nextThemeMode('system')).toBe('light')
  })

  it('hanya menerima nilai mode yang dikenal', () => {
    expect(isThemeMode('light')).toBe(true)
    expect(isThemeMode('dark')).toBe(true)
    expect(isThemeMode('system')).toBe(true)
    expect(isThemeMode('sepia')).toBe(false)
    expect(isThemeMode(null)).toBe(false)
  })

  it('menerapkan kelas, dataset, dan color-scheme pada elemen akar', () => {
    applyTheme('dark', document.documentElement)
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')

    applyTheme('light', document.documentElement)
    expect(document.documentElement).not.toHaveClass('dark')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
})

function Probe() {
  const { mode, resolved, cycleMode } = useTheme()
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved">{resolved}</span>
      <button type="button" onClick={cycleMode}>
        ganti tema
      </button>
    </div>
  )
}

describe('ThemeProvider', () => {
  it('menerapkan tema gelap dan menyimpan preferensi saat tombol ditekan', () => {
    window.localStorage.clear()
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('mode')).toHaveTextContent('system')
    expect(document.documentElement).not.toHaveClass('dark')

    act(() => screen.getByRole('button', { name: 'ganti tema' }).click())
    expect(screen.getByTestId('mode')).toHaveTextContent('light')
    expect(document.documentElement).not.toHaveClass('dark')

    act(() => screen.getByRole('button', { name: 'ganti tema' }).click())
    expect(screen.getByTestId('mode')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('mode "system" mengikuti preferensi sistem operasi', () => {
    window.localStorage.clear()
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      })),
    )

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')

    vi.unstubAllGlobals()
  })
})
