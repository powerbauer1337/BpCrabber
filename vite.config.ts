import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { builtinModules } from 'module';

// https://vitejs.dev/config
export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['electron-updater'],
      }),
    ],
    build: {
      rollupOptions: {
        external: ['electron', ...builtinModules],
      },
    },
    resolve: {
      alias: {
        '@': resolve('src'),
        '@shared': resolve('src/shared'),
        '@components': resolve('src/components'),
        '@electron': resolve('src/electron'),
        '@renderer': resolve('src/renderer'),
        '@config': resolve('src/config'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve('src'),
        '@shared': resolve('src/shared'),
        '@components': resolve('src/components'),
        '@electron': resolve('src/electron'),
        '@renderer': resolve('src/renderer'),
        '@config': resolve('src/config'),
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
        external: [
          'electron',
          ...builtinModules,
          'path',
          'fs',
          'events',
          'crypto',
          'stream',
          'util',
          'assert',
          'http',
          'net',
          'tls',
          'https',
        ],
      },
    },
    server: {
      host: process.env.VITE_DEV_SERVER_HOST || '127.0.0.1',
      port: parseInt(process.env.VITE_DEV_SERVER_PORT || '5173'),
    },
    optimizeDeps: {
      exclude: ['electron'],
    },
  },
});
