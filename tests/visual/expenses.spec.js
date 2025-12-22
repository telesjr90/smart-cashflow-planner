import { test, expect } from '@playwright/test';

const DEMO_ENTRY = '/?agentDemo=1';

test.describe('Expenses Visuals', () => {
  test('renders demo-mode expenses view', async ({ page }) => {
    // Start in demo mode for predictable data
    await page.goto(DEMO_ENTRY);

    // Navigate via bottom nav to the Expenses tab
    const navExpenses = page.getByTestId('nav-expenses');
    await expect(navExpenses).toBeVisible({ timeout: 10000 });
    await navExpenses.click();

    // Wait for a stable anchor on the page
    await expect(
      page.getByRole('heading', { level: 1, name: 'Transactions' })
    ).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(100); // brief settle for visual stability

    await expect(page).toHaveScreenshot('visual--expenses--default.png', {
      fullPage: true,
    });
  });
});
