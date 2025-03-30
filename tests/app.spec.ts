import { test, expect } from '@playwright/test';
import { startApp, takeScreenshot, closeApp } from './utils/electron-helpers';
import { cache } from '../src/utils/cache';
import { handleError } from '../src/utils/error-handler';

test.describe('Beatport Track Downloader App', () => {
  test('should launch and show the main window', async () => {
    const { electronApp, window } = await startApp();

    // Verify window is visible
    expect(await window.isVisible()).toBe(true);

    // Take a screenshot of the initial state
    await window.screenshot({
      path: 'test-results/screenshots/initial-state.png',
      fullPage: true,
    });

    await closeApp(electronApp);
  });

  test('should validate Beatport URLs', async () => {
    const { electronApp, window } = await startApp();

    // Get the URL input field
    const urlInput = window.locator('input[type="text"]');
    await urlInput.fill('https://www.beatport.com/track/invalid-url');

    // Click the add button
    const addButton = window.locator('button:has-text("Add")');
    await addButton.click();

    // Verify error message is shown
    const errorMessage = window.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Invalid Beatport URL');

    await takeScreenshot(window, 'url-validation-error');
    await closeApp(electronApp);
  });

  test('should handle track downloads', async () => {
    const { electronApp, window } = await startApp();

    // Add a valid track URL
    const urlInput = window.locator('input[type="text"]');
    await urlInput.fill('https://www.beatport.com/track/some-valid-track/12345');

    // Click the add button
    const addButton = window.locator('button:has-text("Add")');
    await addButton.click();

    // Verify track is added to the list
    const trackList = window.locator('.track-list');
    await expect(trackList).toContainText('some-valid-track');

    // Start download
    const downloadButton = window.locator('button:has-text("Download")');
    await downloadButton.click();

    // Verify download progress is shown
    const progressBar = window.locator('.progress-bar');
    await expect(progressBar).toBeVisible();

    await takeScreenshot(window, 'download-progress');
    await closeApp(electronApp);
  });

  test('should handle cache operations', async () => {
    const { electronApp } = await startApp();

    // Test cache operations
    await cache.set('test-key', { value: 'test-value' }, 60);
    const value = await cache.get('test-key');
    await cache.delete('test-key');
    const deletedValue = await cache.get('test-key');

    expect(value).toEqual({ value: 'test-value' });
    expect(deletedValue).toBeNull();

    await closeApp(electronApp);
  });

  test('should handle errors gracefully', async () => {
    const { electronApp } = await startApp();

    const error = new Error('Test error');
    let errorHandled = false;

    try {
      handleError(error);
      errorHandled = true;
    } catch (e) {
      errorHandled = false;
    }

    expect(errorHandled).toBe(true);

    await closeApp(electronApp);
  });
});
