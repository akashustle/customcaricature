import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    target: "es2020",
    cssMinify: true,
    minify: "terser",
    modulePreload: { polyfill: true },
    terserOptions: {
      compress: {
        drop_console: mode === "production",
        drop_debugger: true,
        passes: 3,
        pure_getters: true,
        unsafe_math: true,
        unsafe_arrows: true,
      },
      mangle: { toplevel: true },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "ui-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-dropdown-menu",
          ],
          charts: ["recharts"],
          motion: ["framer-motion"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
    reportCompressedSize: false,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null, // we register manually via src/lib/pwa-register.ts (iframe-guarded)
      devOptions: { enabled: false }, // never run SW in dev/preview
      includeAssets: ["favicon.png", "logo.png", "badge-96.png", "badge-72.png", "sw-push.js", "offline.html"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpeg,jpg,woff,woff2,webp,avif}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        importScripts: ["/sw-push.js"],
        navigateFallback: "/offline.html",
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        navigateFallbackDenylist: [
          /^\/~oauth/,
          /^\/customcad75/,
          /^\/admin-panel/,
          /^\/cccworkshop2006/,
          /^\/workshop-admin-panel/,
          /^\/CFCAdmin936/,
          /^\/shop-admin/,
          /^\/api\//,
        ],
      },
      manifest: {
        name: "Creative Caricature Club",
        short_name: "CCC",
        description: "India's premium caricature studio — Custom art, live events & workshops",
        theme_color: "#b08d57",
        background_color: "#fdf8f3",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        id: "/",
        categories: ["entertainment", "lifestyle", "art", "shopping"],
        icons: [
          {
            src: "/logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/favicon.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
        shortcuts: [
          {
            name: "Order Caricature",
            short_name: "Order",
            url: "/order",
            icons: [{ src: "/logo.png", sizes: "192x192" as any }],
          },
          {
            name: "Book Event",
            short_name: "Event",
            url: "/book-event",
            icons: [{ src: "/logo.png", sizes: "192x192" as any }],
          },
          {
            name: "Workshop",
            short_name: "Workshop",
            url: "/workshop",
            icons: [{ src: "/logo.png", sizes: "192x192" as any }],
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
