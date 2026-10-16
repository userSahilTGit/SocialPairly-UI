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
    port: 3001,
    // Allow access via nip.io / LAN IP (not only localhost)
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '3.151.77.90',
      '3.151.77.90.nip.io',
      '.nip.io',
    ],
    // When the page is opened as http://3.151.77.90.nip.io, HMR must not
    // try to open ws://localhost:3000 (blocked by Local Network Access checks).
    // For nip.io access, start with:
    //   set VITE_HMR_HOST=3.151.77.90.nip.io&& set VITE_HMR_CLIENT_PORT=3002&& npm run dev
    // (or put those in the shell that tunnels/proxies the UI).
    hmr: {
      host: process.env.VITE_HMR_HOST || 'localhost',
      protocol: 'ws',
      clientPort: Number(process.env.VITE_HMR_CLIENT_PORT || 3002),
    },
    watch: {
      // Vitest HTML coverage must not trigger HMR page-reload spam in the UI console.
      ignored: ['**/coverage/**', '**/node_modules/**'],
    },
    proxy: {
      '/api': {
        // Local Workflow-manager (BUG-1570 phone country codes, auth, etc.)
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
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
      exclude: ['src/utils/faceRecognition.js', 'tests/**'],
      thresholds: {
        lines: 5,
        statements: 5,
        functions: 5,
        branches: 90,
      },
    },
  },
})
