import { test, expect } from '@playwright/test';

test.describe('Settings View (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        throw new Error(`Console error from browser: ${msg.text()}`);
      }
    });

    await page.goto('/?agentDemo=1');
    await page.getByRole('button', { name: /settings/i }).click();
  });

  test('E.1 Renders settings layout and sections', async ({ page }) => {
    // Ensure we left Home and are on Settings
    await expect(page.getByText('Smart Cash Flow Planner')).toBeVisible();

    await expect(page.getByText(/Household & Profile/i)).toBeVisible();
    await expect(page.getByText(/Bank Accounts/i)).toBeVisible();
    await expect(page.getByText(/Savings Goals/i)).toBeVisible();
  });
});
