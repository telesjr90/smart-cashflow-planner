import { test, expect } from '@playwright/test';

test.describe('Settings View (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?agentDemo=1');
    await page.getByRole('button', { name: /settings/i }).click();
  });

  test('E.1 Renders settings layout and sections', async ({ page }) => {
    // Ensure we left Home and are on Settings
    await expect(page.getByTestId('accounts-section')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Goals' })).toBeVisible();
  });
});
