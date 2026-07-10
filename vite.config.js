import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  root: './src',
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
    headers: {
      'Content-Security-Policy': "default-src 'self'; connect-src 'self' http://localhost:3001; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data:;",
    },
  },
  build: {
    outDir: '../dist',
    sourcemap: true,
  },
})
