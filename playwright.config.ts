import { PlaywrightTestConfig } from '@playwright/test';
import path from 'path';

const outputDir = path.join(process.cwd(), 'test-results');

const config: PlaywrightTestConfig = {
  testDir: './tests',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/test-results.json' }],
  ],
  use: {
    actionTimeout: 15000,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
  },
  outputDir,
  preserveOutput: process.env.CI ? 'failures-only' : 'always',
  projects: [
    {
      name: 'Electron',
      testMatch: /.*\.spec\.ts/,
      testDir: './tests',
      snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
    },
  ],
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
};

export default config;
