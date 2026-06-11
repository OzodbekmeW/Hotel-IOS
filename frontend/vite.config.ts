import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/reception':    { target: 'http://localhost:8001', rewrite: (p) => p.replace(/^\/api\/reception/, ''), changeOrigin: true },
      '/api/housekeeping': { target: 'http://localhost:8002', rewrite: (p) => p.replace(/^\/api\/housekeeping/, ''), changeOrigin: true },
      '/api/room-service': { target: 'http://localhost:8003', rewrite: (p) => p.replace(/^\/api\/room-service/, ''), changeOrigin: true },
      '/api/maintenance':  { target: 'http://localhost:8004', rewrite: (p) => p.replace(/^\/api\/maintenance/, ''), changeOrigin: true },
      '/api/dashboard':    { target: 'http://localhost:8000', rewrite: (p) => p.replace(/^\/api\/dashboard/, ''), changeOrigin: true },
      '/ws':               { target: 'ws://localhost:8000',   ws: true, changeOrigin: true },
    },
  },
})
