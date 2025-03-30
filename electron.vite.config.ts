import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const sharedAliases = {
  '@': resolve(__dirname, 'src'),
  '@shared': resolve(__dirname, 'src/shared'),
  '@electron': resolve(__dirname, 'src/electron'),
  '@renderer': resolve(__dirname, 'src/renderer'),
  '@config': resolve(__dirname, 'src/config'),
  '@types': resolve(__dirname, 'src/types'),
  '@components': resolve(__dirname, 'src/components'),
  '@hooks': resolve(__dirname, 'src/hooks'),
  '@utils': resolve(__dirname, 'src/utils'),
  '@services': resolve(__dirname, 'src/services'),
};

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main.ts'),
        },
        external: [
          'electron',
          'electron-updater',
          'electron-store',
          'electron-log',
          'electron-serve',
        ],
      },
    },
    resolve: {
      alias: sharedAliases,
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload.ts'),
        },
        external: ['electron'],
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
        },
      },
    },
    resolve: {
      alias: sharedAliases,
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: '.',
    build: {
      outDir: 'dist/renderer',
      assetsDir: '.',
      minify: true,
      sourcemap: true,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: sharedAliases,
    },
    optimizeDeps: {
      exclude: ['electron'],
    },
  },
});
