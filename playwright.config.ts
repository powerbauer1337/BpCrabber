import { defineConfig } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'dot' : 'list',
  use: {
    actionTimeout: 15000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'Electron',
      testMatch: /.*\.spec\.ts/,
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: ['--no-sandbox'],
          executablePath:
            process.env.ELECTRON_EXECUTABLE_PATH || resolve('node_modules/.bin/electron'),
        },
        baseURL:
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:5173'
            : `file://${resolve(__dirname, 'dist/renderer/index.html')}`,
      },
    },
  ],
});
