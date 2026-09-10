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
          if (
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules\\react-dom\\') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules\\react\\') ||
            id.includes('node_modules/scheduler/') ||
            id.includes('node_modules\\scheduler\\') ||
            id.includes('react-router') ||
            id.includes('zustand') ||
            id.includes('@tanstack/react-query')
          ) return 'vendor_react';

          if (id.includes('recharts')) return 'vendor_charts';
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor_leaflet';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor_pdf';
          if (id.includes('lucide-react')) return 'vendor_icons';
          if (id.includes('framer-motion')) return 'vendor_motion';
          return undefined;
        }
      }
    }
  }
})

