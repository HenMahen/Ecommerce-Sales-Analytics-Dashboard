import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Smoke test Fase 1: memastikan test runner, DOM virtual (jsdom), dan
 * React Testing Library benar-benar berjalan. Tidak ada halaman dasbor di sini.
 */
describe('lingkungan pengujian', () => {
  it('menyediakan DOM virtual melalui jsdom', () => {
    const element = document.createElement('span')
    element.textContent = 'halo'

    document.body.append(element)

    expect(element).toBeInTheDocument()
    expect(element).toHaveTextContent('halo')

    element.remove()
  })

  it('merender komponen React dan menguery-nya lewat role', () => {
    render(createElement('button', { type: 'button' }, 'Klik saya'))

    expect(screen.getByRole('button', { name: 'Klik saya' })).toBeInTheDocument()
  })
})
