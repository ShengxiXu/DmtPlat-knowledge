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
  },
  build: {
    outDir: '../dist',
    sourcemap: true,
  },
})
