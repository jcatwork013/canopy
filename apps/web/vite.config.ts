import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Canopy web PWA. Installable, mobile-first, offline app shell.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Canopy — Chăm cây cùng AI',
        short_name: 'Canopy',
        description:
          'Nhận diện cây, chẩn đoán bệnh, lộ trình chữa trị và nhắc lịch chăm sóc bằng AI.',
        theme_color: '#16a34a',
        background_color: '#0b1220',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['lifestyle', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // App shell + static assets: cache-first.
            urlPattern: ({ request }) =>
              ['style', 'script', 'font', 'image'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'canopy-assets' },
          },
          {
            // API GETs: network-first so data stays fresh, falls back offline.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'canopy-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Dev convenience: proxy /api to the Go backend so SW + cookies share origin.
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8088',
        changeOrigin: true,
      },
    },
  },
});
