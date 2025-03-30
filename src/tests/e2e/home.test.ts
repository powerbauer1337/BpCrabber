import { test, expect } from '@playwright/test';

test('home page loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Beatport App/);
});

test('navigation works', async ({ page }) => {
  await page.goto('/');

  // Test navigation to main sections
  await expect(page.getByRole('link', { name: /tracks/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /playlists/i })).toBeVisible();
});
