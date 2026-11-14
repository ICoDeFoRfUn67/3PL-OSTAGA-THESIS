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
          const normalizedId = id.replace(/\\/g, '/');
          if (!normalizedId.includes('/node_modules/')) return;

          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/scheduler/') ||
            normalizedId.includes('/node_modules/react-router/') ||
            normalizedId.includes('/node_modules/react-router-dom/') ||
            normalizedId.includes('/node_modules/@remix-run/') ||
            normalizedId.includes('/node_modules/zustand/') ||
            normalizedId.includes('/node_modules/@tanstack/react-query/')
          ) return 'vendor_react';

          if (normalizedId.includes('/node_modules/xlsx/')) return 'vendor_xlsx';
          if (normalizedId.includes('/node_modules/phil-reg-prov-mun-brgy/')) return 'vendor_geo';
          if (normalizedId.includes('/node_modules/recharts/')) return 'vendor_charts';
          if (normalizedId.includes('/node_modules/leaflet/') || normalizedId.includes('/node_modules/react-leaflet/')) return 'vendor_leaflet';
          if (normalizedId.includes('/node_modules/jspdf/') || normalizedId.includes('/node_modules/html2canvas/')) return 'vendor_pdf';
          if (normalizedId.includes('/node_modules/lucide-react/')) return 'vendor_icons';
          if (normalizedId.includes('/node_modules/framer-motion/')) return 'vendor_motion';
          if (normalizedId.includes('/node_modules/date-fns/')) return 'vendor_date';
          return undefined;
        }
      }
    }
  }
})

