import { test, expect } from '@playwright/test';

test.describe('Settings View (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?agentDemo=1');
    const navSettings = page.getByTestId('nav-settings');
    await expect(navSettings).toBeVisible({ timeout: 10000 });
    await navSettings.click();
  });

  test('E.1 Renders settings layout and sections', async ({ page }) => {
    // Ensure we left Home and are on Settings using stable anchors
    const accountsNav = page.getByRole('button', { name: /Accounts & Residual/i });
    await expect(accountsNav).toBeVisible({ timeout: 10000 });
    await accountsNav.click();

    await expect(page.getByTestId('accounts-section')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Goals' })).toBeVisible();
  });
});
