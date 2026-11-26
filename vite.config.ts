import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => {
  const base =
    process.env.VITE_BASE_PATH ?? (command === 'build' ? '/AppTramites/' : '/')

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon-32x32.png',
          'apple-touch-icon.png',
        ],
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        manifest: {
          id: base,
          name: 'Trámites Escolares UAS',
          short_name: 'TrámitesUAS',
          description: 'Control de trámites y actas escolares UAS',
          start_url: base,
          scope: base,
          theme_color: '#002B49',
          background_color: '#ffffff',
          display: 'standalone', // Hace que se abra como app de escritorio sin barras de navegador
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})