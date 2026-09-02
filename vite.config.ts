import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // ------------------------------------------------------------------
    // Real, working offline capability for the app shell + bundled demo
    // data (terrain/POI/mission data is already compiled into the JS
    // bundle — this just makes the bundle itself installable and loadable
    // with zero network, via a generated service worker).
    //
    // This does NOT add any real server synchronization — there is still
    // no backend. The "Last synchronized" / per-layer MB breakdown in the
    // Offline Data screen remain a simulated demo narrative, unchanged.
    // ------------------------------------------------------------------
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'DisasterReady — Terrain Preparedness',
        short_name: 'DisasterReady',
        description:
          'Offline-first landslide preparedness and terrain-intelligence prototype for the NER (SIH26001 demo).',
        theme_color: '#2e5339',
        background_color: '#f8f3e6',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the built app shell (JS/CSS/HTML) so it loads with zero
        // network after the first successful visit.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // The Unity WebGL preparedness simulator (public/unity-sim/) is
        // explicitly NOT part of the offline app shell: it's large (~13MB),
        // its own offline behavior has not been verified, and precaching it
        // would silently make the "installable, works offline" PWA claim
        // cover a build that was never tested for that. Users who launch
        // the simulator online still get it fine — it's just not promised
        // offline the way the rest of the app is.
        globIgnores: ['unity-sim/**'],
        runtimeCaching: [
          // Google Fonts are cross-origin and not covered by the precache
          // manifest above — cache them at runtime so typography doesn't
          // fall back to system fonts once offline.
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
})
