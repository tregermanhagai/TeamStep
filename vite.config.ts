import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/icon.png'],
      manifest: {
        name: 'TeamStep',
        short_name: 'TeamStep',
        description: 'Track your weekly training performance',
        theme_color: '#06C8E0',
        background_color: '#0B1627',
        display: 'standalone',
        start_url: '/dashboard',
        scope: '/',
        icons: [
          {
            src: '/icons/icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        runtimeCaching: [],
      },
    }),
  ],
})
