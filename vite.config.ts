import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vite 8 uses Rolldown; this is the typed replacement for manualChunks.
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-utils',
              test: /node_modules[\\/](cn|clsx|tailwind-merge|use-sync-external-store)[\\/]/,
              priority: 25,
            },
            {
              name: 'vendor-charts',
              test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|react-smooth|decimal\.js-light)[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor-ui',
              test: /node_modules[\\/](@base-ui[\\/]react|lucide-react)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
