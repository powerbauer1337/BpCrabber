import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/electron/main.ts', 'src/electron/preload.ts'],
  outDir: 'build',
  target: 'node18',
  format: ['esm'],
  sourcemap: true,
  clean: true,
  external: ['electron', 'electron-serve', 'electron-store', '@electron-toolkit/utils'],
  outExtension: () => ({ js: '.js' }),
});
