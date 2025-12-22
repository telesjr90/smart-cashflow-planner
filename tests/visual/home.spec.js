import { test, expect } from '@playwright/test';
const DEMO_ENTRY = '/?agentDemo=1';

test.describe('Home Page Visuals', () => {
  test('renders demo-mode home dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Always use demo mode to load fixtures quickly
    await page.goto(DEMO_ENTRY);

    // Ensure we're on Home (clicking is idempotent)
    const navHome = page.getByTestId('nav-home');
    await expect(navHome).toBeVisible({ timeout: 10000 });
    await navHome.click();

    // Wait for hydrated home content (home returns null pre-hydration)
    const balanceCard = page.locator('div').filter({ hasText: /My Balance|Starting Balance/ }).first();
    await expect(balanceCard).toBeVisible({ timeout: 15000 });

    // Stable anchors in the current UI
    await expect(page.getByRole('heading', { name: 'Cash Flow' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('heading', { name: 'My Accounts' })).toBeVisible();
    await expect(page.getByTestId('nav-add')).toBeVisible();
    await page.waitForTimeout(100); // small settle for visual stability

    // Visual regression snapshot
    await expect(page).toHaveScreenshot('visual--home--default.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});
