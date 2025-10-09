import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  worker: {
    format: 'es',
    plugins: () => [react()],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'worker-deps': ['d3-interpolate', 'svg-path-commander'],
        },
      },
    },
  },
});
