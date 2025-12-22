const DEMO_ENTRY = '/?agentDemo=1';
import { test, expect } from '@playwright/test';

test.describe('Bills Visuals', () => {
  test('renders demo-mode bills view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Fresh storage to avoid scope drift; Bills defaults to self scope
    await page.addInitScript(() => window.localStorage.clear());

    // Always begin in demo mode
    await page.goto(DEMO_ENTRY);

    // Navigate to Bills (bottom nav) to stay aligned with the current UI flow
    const navBills = page.getByTestId('nav-bills');
    await expect(navBills).toBeVisible({ timeout: 10000 });
    await navBills.click();

    const billsPage = page.getByTestId('bills-page');
    await expect(billsPage).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('bills-list')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(100); // small settle for visual stability

    await expect(page).toHaveScreenshot('visual--bills--default.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});
