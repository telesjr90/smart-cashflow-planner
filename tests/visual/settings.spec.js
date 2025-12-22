import { test, expect } from '@playwright/test';

const DEMO_ENTRY = '/?agentDemo=1';

test.describe('Settings Visuals', () => {
  test('should render settings layout', async ({ page }) => {
    await page.goto(DEMO_ENTRY);

    const navSettings = page.getByTestId('nav-settings');
    await expect(navSettings).toBeVisible({ timeout: 10000 });
    await navSettings.click();

    await expect(page.getByRole('button', { name: 'Accounts & Residual' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(100);

    await expect(page).toHaveScreenshot('settings-page.png', { fullPage: true });
  });
});
