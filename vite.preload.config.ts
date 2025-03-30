import { defineConfig } from 'vite';
import { forgeViteConfig } from '@electron-forge/plugin-vite/plugin';

// https://vitejs.dev/config
export default defineConfig(forgeViteConfig.preload({
  build: {
    outDir: '.vite/build',
    lib: {
      entry: 'src/preload.ts',
      formats: ['cjs'],
      fileName: () => '[name].js',
    },
    rollupOptions: {
      external: ['electron']
    }
  }
}));
