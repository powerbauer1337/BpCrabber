import { ElectronApplication, Page, _electron as electron } from '@playwright/test';
import path from 'path';

interface StartAppResponse {
  electronApp: ElectronApplication;
  window: Page;
}

/**
 * Start the Electron application for testing
 */
export async function startApp(): Promise<StartAppResponse> {
  const electronApp = await electron.launch({
    args: ['.'],
    recordVideo: {
      dir: path.join(process.cwd(), 'test-results', 'videos'),
      size: { width: 1280, height: 720 },
    },
  });

  // Wait for the main window to be ready
  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  return { electronApp, window };
}

/**
 * Take a screenshot with standardized naming
 */
export async function takeScreenshot(window: Page, name: string): Promise<void> {
  const screenshotPath = path.join(
    process.cwd(),
    'test-results',
    'screenshots',
    `${name}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
  );

  await window.screenshot({
    path: screenshotPath,
    fullPage: true,
  });
}

/**
 * Helper to safely close the app
 */
export async function closeApp(app: ElectronApplication): Promise<void> {
  try {
    await app.close();
  } catch (error) {
    console.error('Error closing app:', error);
  }
}
