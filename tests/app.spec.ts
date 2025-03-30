import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Beatport Downloader App Tests', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DEBUG: 'pw:browser*',
      },
    });

    // Get the first window
    window = await electronApp.firstWindow();

    // Wait for the app to be ready
    await window.waitForLoadState('domcontentloaded');
    await window.waitForLoadState('networkidle');
    await window.waitForTimeout(2000); // Give React a moment to render

    // Debug: Log the page content
    const content = await window.content();
    console.log('Page content:', content);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('application launches successfully', async () => {
    // Wait for the root element
    const root = await window.waitForSelector('#root', { timeout: 10000 });
    expect(root).toBeTruthy();

    // Take a screenshot for debugging
    await window.screenshot({ path: 'test-results/app-launch.png' });

    // Check if the tabs are present
    const tabs = await window.waitForSelector('[role="tablist"]', { timeout: 10000 });
    expect(tabs).toBeTruthy();
  });

  test('search bar and download list are present', async () => {
    // Wait for the root element
    const root = await window.waitForSelector('#root', { timeout: 10000 });
    expect(root).toBeTruthy();

    // Take a screenshot for debugging
    await window.screenshot({ path: 'test-results/search-bar.png' });

    // Wait for the search bar to be visible
    const searchBar = await window.waitForSelector('input', { timeout: 10000 });
    expect(searchBar).toBeTruthy();

    // Check if the search button is present
    const searchButton = await window.waitForSelector('button:has-text("Search")', {
      timeout: 10000,
    });
    expect(searchButton).toBeTruthy();
  });

  test('can switch between tabs', async () => {
    // Wait for the root element
    const root = await window.waitForSelector('#root', { timeout: 10000 });
    expect(root).toBeTruthy();

    // Take a screenshot for debugging
    await window.screenshot({ path: 'test-results/tabs.png' });

    // Click on History tab
    const historyTab = await window.waitForSelector('[role="tab"]:has-text("History")', {
      timeout: 10000,
    });
    await historyTab.click();

    // Click on Settings tab
    const settingsTab = await window.waitForSelector('[role="tab"]:has-text("Settings")', {
      timeout: 10000,
    });
    await settingsTab.click();
  });

  test('can enter URL in search bar', async () => {
    // Wait for the root element
    const root = await window.waitForSelector('#root', { timeout: 10000 });
    expect(root).toBeTruthy();

    // Take a screenshot for debugging
    await window.screenshot({ path: 'test-results/url-input.png' });

    // Wait for the search bar input
    const searchInput = await window.waitForSelector('input', {
      timeout: 10000,
    });

    // Enter a test URL
    await searchInput.fill('https://www.beatport.com/track/test/123');
    await searchInput.press('Enter');

    // Wait for the toast notification
    const toast = await window.waitForSelector('[role="alert"]', { timeout: 10000 });
    expect(toast).toBeTruthy();
  });
});
