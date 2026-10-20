import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import {
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  buildRobotsTxt,
  buildSitemapXml,
  buildStructuredData,
} from './src/seo/routes.js'

/**
 * SEO assets (defect 1571). Set VITE_SITE_URL (e.g. https://app.socialpairly.com) once DNS is live to get
 * absolute og:image/og:url, JSON-LD URLs and a sitemap. Without it robots.txt is still served.
 */
function seoPlugin() {
  let siteUrl = ''
  const robots = () => buildRobotsTxt(siteUrl)
  const sitemap = () => (absoluteUrl(siteUrl, '/') ? buildSitemapXml(siteUrl) : null)

  return {
    name: 'socialpairly-seo',
    configResolved(config) {
      siteUrl = config.env?.VITE_SITE_URL || ''
    },
    transformIndexHtml(html) {
      const jsonLd = JSON.stringify(buildStructuredData(siteUrl)).replace(/</g, '\\u003c')
      const tags = [
        { tag: 'script', attrs: { type: 'application/ld+json' }, children: jsonLd, injectTo: 'head' },
      ]
      const ogImage = absoluteUrl(siteUrl, DEFAULT_OG_IMAGE)
      const home = absoluteUrl(siteUrl, '/')
      let out = html
      if (ogImage) {
        out = out.replaceAll(`content="${DEFAULT_OG_IMAGE}"`, `content="${ogImage}"`)
      }
      if (home) {
        tags.push({ tag: 'meta', attrs: { property: 'og:url', content: home }, injectTo: 'head' })
      }
      return { html: out, tags }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        if (url === '/robots.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(robots())
          return
        }
        if (url === '/sitemap.xml' && sitemap()) {
          res.setHeader('Content-Type', 'application/xml; charset=utf-8')
          res.end(sitemap())
          return
        }
        next()
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots() })
      const xml = sitemap()
      if (xml) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: xml })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), seoPlugin()],
  server: {
    // Keep in sync with GCP OAuth "Authorized JavaScript origins" (no wildcards).
    // Override with --port 3091 only after adding that origin in Google Cloud Console.
    port: Number(process.env.VITE_DEV_PORT || process.env.PORT || 3001),
    strictPort: false,
    // Allow access via nip.io / LAN IP (not only localhost)
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '3.151.77.90',
      '3.151.77.90.nip.io',
      '.nip.io',
      'www.socialpairly.com',
      'socialpairly.com',
      '.socialpairly.com',
    ],
    // Local default: HMR uses the same host/port as the Vite server (e.g. :3010).
    // For nip.io / tunneled access only, override with:
    //   set VITE_HMR_HOST=3.151.77.90.nip.io&& set VITE_HMR_CLIENT_PORT=3002&& npm run dev
    hmr: process.env.VITE_HMR_HOST
      ? {
          host: process.env.VITE_HMR_HOST,
          protocol: 'ws',
          clientPort: Number(process.env.VITE_HMR_CLIENT_PORT || process.env.PORT || 3002),
        }
      : undefined,
    watch: {
      // Vitest HTML coverage must not trigger HMR page-reload spam in the UI console.
      ignored: ['**/coverage/**', '**/node_modules/**'],
    },
    proxy: {
      '/api': {
        // Local Workflow-manager (BUG-1570 phone country codes, auth, etc.)
        // Use 127.0.0.1 — Node on Windows often fails localhost via IPv6 (ECONNREFUSED AggregateError).
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:9011',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@mediapipe/selfie_segmentation': path.resolve(__dirname, 'src/mocks/selfie-segmentation.js'),
    },
  },
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs-core',
      '@tensorflow/tfjs-backend-webgl',
      '@tensorflow-models/body-segmentation',
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
    include: ['tests/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**'],
      exclude: ['tests/**'],
      thresholds: {
        lines: 5,
        statements: 5,
        functions: 5,
        branches: 90,
      },
    },
  },
})
