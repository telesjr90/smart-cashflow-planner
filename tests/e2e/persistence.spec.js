import { test, expect } from '@playwright/test';

test.describe('Persistence (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        throw new Error(`Console error from browser: ${msg.text()}`);
      }
    });
  });

  test('F.2 Expense persists across reload', async ({ page }) => {
    await page.goto('/?agentDemo=1');

    // 1. Add an expense
    await page.getByLabel('Add Transaction').click();
    await expect(page.getByText(/Log Expense/i)).toBeVisible();
    await page.getByPlaceholder('0.00').fill('99.99');
    await page.getByPlaceholder('What is this for?').fill('Persist Me');
    await page.getByRole('button', { name: /save/i }).click();

    // 2. Reload
    await page.reload();

    // 3. Verify expense is still present in the Expenses tab
    await page.getByRole('button', { name: /expenses/i }).click();
    await expect(page.getByText('Persist Me')).toBeVisible();
    await expect(page.getByText('$99.99')).toBeVisible();
  });
});
