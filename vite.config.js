import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    dedupe: ['react', 'react-dom'],
  },
 
  server: {
  port: 5173,
  proxy: {
    '/api':     { target: 'http://127.0.0.1:8000', changeOrigin: true },
    '/uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
  },
},
});