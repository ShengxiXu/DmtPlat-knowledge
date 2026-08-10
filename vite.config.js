import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

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
      'Content-Security-Policy':
        "default-src 'self'; connect-src 'self' http://localhost:3001 http://localhost:5173 http://www.zsgz-ai.cn; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; font-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net data:; img-src 'self' data: https:; frame-src 'self' http://localhost:5173 http://www.zsgz-ai.cn http://www.zsgz-ai.net;",
    },
    proxy: {
      '/zsgz-proxy': {
        target: 'http://www.zsgz-ai.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zsgz-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['content-security-policy-report-only'];
          });
        },
      },
      '/prod-api': {
        target: 'http://www.zsgz-ai.cn',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
          });
        },
      },
      '/static': {
        target: 'http://www.zsgz-ai.cn',
        changeOrigin: true,
      },
      '/img': {
        target: 'http://www.zsgz-ai.cn',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://www.zsgz-ai.cn',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist',
    sourcemap: true,
  },
});
