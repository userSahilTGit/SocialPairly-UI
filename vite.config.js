import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server:{
    port:3001,
    proxy: {
      '/api': {
        target: 'http://localhost:9010',
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
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
})
