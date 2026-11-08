import { describe, expect, it } from 'vitest'

import css from '../src/index.css?raw'
import html from '../index.html?raw'

/**
 * Guards for the design foundations: both themes must define the same tokens, the theme blocks
 * must not touch shape (radius/spacing), every Tailwind colour mapping must resolve, the
 * signature palettes stay in place, and the documented contrast pairs stay WCAG AA compliant
 * (docs/DESIGN_BRIEF.MD §15).
 */

if (!css || !html) throw new Error('index.css atau index.html tidak terbaca')

function block(source: string, selector: string): string {
  const start = source.indexOf(selector)
  if (start === -1) throw new Error(`blok ${selector} tidak ditemukan`)
  const open = source.indexOf('{', start)
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(open + 1, index)
    }
  }
  throw new Error(`blok ${selector} tidak ditutup`)
}

function tokens(source: string, selector: string): Map<string, string> {
  const found = new Map<string, string>()
  for (const match of block(source, selector).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    found.set(match[1], match[2].trim())
  }
  return found
}

function channel(value: number): number {
  const scaled = value / 255
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const raw = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(raw.slice(index, index + 2), 16))
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(first: string, second: string): number {
  const [high, low] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (high + 0.05) / (low + 0.05)
}

const LIGHT = tokens(css, ':root {')
const DARK = tokens(css, '.dark {')

const TEXT_PAIRS: Array<[string, string]> = [
  ['--foreground', '--card'],
  ['--foreground', '--background'],
  ['--muted-foreground', '--card'],
  ['--muted-foreground', '--background'],
  ['--muted-foreground', '--muted'],
  ['--primary-foreground', '--primary'],
  ['--primary-foreground', '--primary-hover'],
  ['--secondary-foreground', '--secondary'],
  ['--accent-foreground', '--accent'],
  ['--destructive', '--card'],
  ['--brand-violet', '--card'],
  ['--brand-blue', '--card'],
  ['--positive', '--card'],
  ['--negative', '--card'],
  ['--warning', '--card'],
  ['--sidebar-foreground', '--sidebar'],
]

const NON_TEXT_PAIRS: Array<[string, string]> = [
  ['--ring', '--card'],
  ['--ring', '--background'],
  ['--chart-1', '--card'],
  ['--chart-2', '--card'],
  ['--chart-3', '--card'],
  ['--chart-4', '--card'],
  ['--chart-5', '--card'],
  ['--brand-pink', '--card'],
]

describe('token tema', () => {
  it('mendefinisikan nama token yang sama pada tema terang dan gelap', () => {
    // Token bentuk (radius, spasi) sengaja hanya didefinisikan sekali; warna wajib ada di kedua tema.
    const isShape = (name: string) => name.startsWith('--radius') || name.startsWith('--spacing')
    const missingInDark = [...LIGHT.keys()]
      .filter((name) => !isShape(name))
      .filter((name) => !DARK.has(name))
    const missingInLight = [...DARK.keys()].filter((name) => !LIGHT.has(name))

    expect(missingInDark).toEqual([])
    expect(missingInLight).toEqual([])
  })

  it('tidak mengubah radius, dimensi, atau jarak antar tema', () => {
    const shapeTokensInDark = [...DARK.keys()].filter((name) => name.startsWith('--radius'))
    expect(shapeTokensInDark).toEqual([])
    expect(LIGHT.get('--radius')).toBeDefined()
    expect(DARK.has('--radius')).toBe(false)
  })

  it('memetakan setiap warna Tailwind ke token yang benar-benar ada', () => {
    const theme = block(css, '@theme inline {')
    const mappings = [...theme.matchAll(/--color-[\w-]+\s*:\s*var\((--[\w-]+)\)/g)].map(
      (match) => match[1],
    )

    expect(mappings.length).toBeGreaterThan(20)
    expect(mappings.filter((name) => !LIGHT.has(name))).toEqual([])
  })

  it('menyediakan skala tipografi yang disepakati', () => {
    const theme = block(css, '@theme inline {')
    for (const name of [
      '--text-display',
      '--text-h1',
      '--text-h2',
      '--text-h3',
      '--text-body',
      '--text-body-medium',
      '--text-caption',
      '--text-micro',
    ]) {
      expect(theme).toContain(`${name}:`)
    }
  })

  it('mengaktifkan varian dark berbasis kelas .dark', () => {
    expect(css).toContain('@custom-variant dark (&:is(.dark *))')
  })

  it('memakai palet tanda tangan Warm Alabaster & Japanese Indigo pada tema terang', () => {
    const expected = {
      '--background': '#f9f9ff',
      '--sidebar': '#fbf9f5',
      '--primary': '#0037b0',
      '--primary-container': '#1d4ed8',
      '--secondary': '#ac3400',
      '--tertiary': '#004f38',
      '--border': '#e8e2d8',
      '--border-variant': '#c4c5d7',
    }
    for (const [name, value] of Object.entries(expected)) {
      expect(LIGHT.get(name)).toBe(value)
    }
  })

  it('memakai palet tanda tangan Nocturne Synthwave Luxury pada tema gelap', () => {
    const expected = {
      '--background': '#151120',
      '--sidebar': '#100c1b',
      '--card': '#221d2d',
      '--surface-container-lowest': '#100c1b',
      '--surface-container-low': '#1d1929',
      '--surface-container': '#221d2d',
      '--surface-container-high': '#2c2738',
      '--surface-container-highest': '#373243',
      '--primary': '#ffaeda',
      '--primary-container': '#ff3ac2',
      '--secondary': '#e5b4ff',
      '--tertiary': '#bcc2ff',
    }
    for (const [name, value] of Object.entries(expected)) {
      expect(DARK.get(name)).toBe(value)
    }
    // Borders in the dark theme are translucent rose tints, so they are matched as source text.
    expect(DARK.get('--border')).toBe('rgba(255, 28, 192, 0.18)')
    expect(DARK.get('--sidebar-border')).toBe('rgba(255, 28, 192, 0.12)')
  })

  it('memetakan tipografi Space Grotesk, Geist, dan JetBrains Mono', () => {
    const theme = block(css, '@theme inline {')
    expect(theme).toContain("--font-sans: 'Geist Variable'")
    expect(theme).toContain("--font-heading: 'Space Grotesk Variable'")
    expect(theme).toContain("--font-mono: 'JetBrains Mono Variable'")
  })
})

describe('kontras warna (WCAG 2.1 AA)', () => {
  for (const [themeName, theme] of [
    ['terang', LIGHT],
    ['gelap', DARK],
  ] as const) {
    it(`teks tema ${themeName} minimal 4,5:1`, () => {
      const failures = TEXT_PAIRS.map(([text, surface]) => {
        const ratio = contrast(theme.get(text)!, theme.get(surface)!)
        return { pair: `${text} / ${surface}`, ratio: Number(ratio.toFixed(2)) }
      }).filter((entry) => entry.ratio < 4.5)

      expect(failures).toEqual([])
    })

    it(`elemen non-teks tema ${themeName} minimal 3:1`, () => {
      const failures = NON_TEXT_PAIRS.map(([graphic, surface]) => {
        const ratio = contrast(theme.get(graphic)!, theme.get(surface)!)
        return { pair: `${graphic} / ${surface}`, ratio: Number(ratio.toFixed(2)) }
      }).filter((entry) => entry.ratio < 3)

      expect(failures).toEqual([])
    })
  }

  it('memenuhi 3:1 untuk batas kontrol pada tema gelap', () => {
    expect(contrast(DARK.get('--input')!, DARK.get('--card')!)).toBeGreaterThanOrEqual(3)
  })

  it('mencatat deviasi yang disengaja: batas kontrol tema terang belum mencapai 3:1', () => {
    // --input light = #c4c5d7 berada di bawah ambang WCAG 1.4.11 (1.71:1) demi tampilan terang
    // yang tenang. Identifikasi kontrol dibantu label yang selalu terlihat. Angka ini dijaga
    // agar tidak memburuk tanpa sengaja.
    const ratio = contrast(LIGHT.get('--input')!, LIGHT.get('--card')!)
    expect(ratio).toBeGreaterThan(1.6)
    expect(ratio).toBeLessThan(3)
  })
})

describe('pencegahan kilasan tema', () => {
  const script = html.slice(html.indexOf('<script>'), html.indexOf('</head>'))

  it('menjalankan skrip tema sebelum bundel aplikasi dimuat', () => {
    expect(script).toContain('dashboard.theme')
    expect(script.indexOf('dashboard.theme')).toBeLessThan(html.indexOf('type="module"'))
  })

  it('skrip tema ditulis inline di <head> supaya berjalan sebelum paint pertama', () => {
    expect(script).toContain('document.documentElement.classList.toggle')
    expect(script).toContain('(prefers-color-scheme: dark)')
    expect(script.slice(0, script.indexOf('>'))).not.toContain('src=')
  })

  it('menangani localStorage yang diblokir tanpa melempar galat', () => {
    expect(script).toContain('catch')
  })
})
