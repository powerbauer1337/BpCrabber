import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { builtinModules } from 'module';

// https://vitejs.dev/config
export default defineConfig({
  root: '.',
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@shared': resolve(__dirname, './src/shared'),
      '@electron': resolve(__dirname, './src/electron'),
      '@renderer': resolve(__dirname, './src/renderer'),
      '@config': resolve(__dirname, './src/config'),
      '@components': resolve(__dirname, './src/renderer/src/components'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      external: ['electron', ...builtinModules],
    },
  },
  server: {
    host: process.env.VITE_DEV_SERVER_HOST || '127.0.0.1',
    port: parseInt(process.env.VITE_DEV_SERVER_PORT || '5173'),
  },
  optimizeDeps: {
    exclude: ['electron'],
  },
});
