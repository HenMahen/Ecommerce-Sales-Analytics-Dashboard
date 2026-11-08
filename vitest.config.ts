import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Konfigurasi test runner (Fase 1).
 *
 * Vitest sengaja dipisah dari `vite.config.ts` agar proses build produksi tidak memuat
 * konfigurasi pengujian. Plugin React dan alias `@` diulang di sini karena Vitest memakai
 * berkas ini sebagai konfigurasi tunggal dan mengabaikan `vite.config.ts`.
 *
 * Lingkungan `jsdom` dipakai untuk menguji komponen React; berkas JSON statis tetap dibaca
 * langsung dari `data/processed` pada fase berikutnya.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    // Berkas CSS diproses agar `tests/design_tokens.test.ts` bisa membaca `src/index.css?raw`.
    css: true,
  },
})
