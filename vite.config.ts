import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages serves the project site under /<repo>/. Override with VITE_BASE for another host.
  base: process.env.VITE_BASE ?? '/SVG-Morph/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  worker: {
    format: 'es',
    plugins: () => [react()],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
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
