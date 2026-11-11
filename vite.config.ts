import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/BattleMath/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'BattleMath',
        short_name: 'BattleMath',
        description: 'Calcul mental CE2',
        lang: 'fr',
        start_url: '/BattleMath/',
        scope: '/BattleMath/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f8f9fa',
        theme_color: '#1c7ed6',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'] },
    }),
  ],
  test: { include: ['tests/**/*.test.ts'] },
})
