import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    minify: 'esbuild',
    cssMinify: 'esbuild',
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React and React DOM
            if (id.includes('/react/') || id.includes('/react-dom/')) {
              return 'react-vendor'
            }
            // TanStack packages
            if (id.includes('/@tanstack/')) {
              return 'tanstack-vendor'
            }
            // Radix UI and UI components
            if (
              id.includes('/radix-ui/') ||
              id.includes('/cmdk/') ||
              id.includes('/class-variance-authority/') ||
              id.includes('/clsx/') ||
              id.includes('/tailwind-merge/')
            ) {
              return 'ui-vendor'
            }
            // Heavy XLSX library
            if (id.includes('/xlsx/')) {
              return 'xlsx-vendor'
            }
            // Routing
            if (id.includes('/react-router/')) {
              return 'router-vendor'
            }
          }
        },
      },
    },
  },
})
