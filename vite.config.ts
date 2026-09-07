import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,txt}'],
          maximumFileSizeToCacheInBytes: 5000000,
        },
        manifest: {
          name: "LiViA Editor™",
          short_name: "LiViA",
          description: "LiViA Editor - Vim Text & Code Editor",
          theme_color: "#111827",
          background_color: "#111827",
          display: "standalone",
          start_url: ".",
          scope: ".",
          icons: [
            {
              src: "logo-128x128.png",
              sizes: "128x128",
              type: "image/png"
            },
            {
              src: "logo-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "logo-256x256.png",
              sizes: "256x256",
              type: "image/png"
            },
            {
              src: "logo-512x512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "logo-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: { overlay: false },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
