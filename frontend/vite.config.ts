import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['jspdf', 'html2canvas'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Bundle React core + chart libraries that depend on React into
          // a single chunk to avoid circular chunk references.
          if (
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules\\react-dom\\') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules\\react\\') ||
            id.includes('node_modules/scheduler/') ||
            id.includes('node_modules\\scheduler\\') ||
            id.includes('recharts')
          ) return 'vendor_react';
          return undefined;
        }
      }
    }
  }
})

