import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

import vercel from './vercel.json' with { type: 'json' }

const securityHeaders = Object.fromEntries(
  vercel.headers.find(rule => rule.source === '/(.*)').headers.map(({ key, value }) => [key, value]),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A waiting version installs only when no case or editor is open (src/pwa.js).
      registerType: 'prompt',
      // The book lives in IndexedDB on the phone. The service worker only keeps the
      // app shell, including the self-hosted font, so it opens with no signal.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}', '**/inter-latin-*.woff2'],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith('.woff2'),
            handler: 'CacheFirst',
            options: { cacheName: 'font-subsets', expiration: { maxEntries: 10 } },
          },
        ],
      },
      manifest: false, // we ship our own public/manifest.json
      includeAssets: ['favicon.svg', 'icons.svg', 'icon-512.png'],
    }),
  ],
  preview: {
    headers: securityHeaders,
  },
})
