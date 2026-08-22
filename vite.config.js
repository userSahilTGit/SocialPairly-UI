import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3002,
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
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
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
