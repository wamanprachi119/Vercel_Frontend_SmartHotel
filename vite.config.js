import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: false,
    // Proxy API calls to .NET backend — avoids CORS issues in development
    proxy: {
      '/api': {
        target: 'https://smarthotelbackendrender-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
  optimizeDeps: {
    force: true,
  },
  cacheDir: '.vite-cache',
});
