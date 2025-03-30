import { defineConfig } from 'vite';
import { forgeViteConfig } from '@electron-forge/plugin-vite/plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig(forgeViteConfig.renderer({
  plugins: [react()],
  base: './',
  build: {
    outDir: '.vite/build/renderer',
    assetsDir: '.',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      external: ['electron'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
}));
