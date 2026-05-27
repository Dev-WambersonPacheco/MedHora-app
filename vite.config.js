import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      '.ngrok-free.app',
      '2b6b-2804-30f8-3f7-9200-5976-162d-3825-1f94.ngrok-free.app'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
})
