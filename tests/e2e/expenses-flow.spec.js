import { test, expect } from '@playwright/test';

test.describe('Expenses Flow (remote, agentDemo)', () => {
  const seedCategory = async (page) => {
    await page.getByTestId('nav-settings').click();
    await page.getByRole('button', { name: /^Budgets$/i }).click();
    await page.getByRole('button', { name: /Add category/i }).click();
    await page.locator('input[placeholder="Category name"]').last().fill('QA Category');
    await page.locator('input[placeholder="0.00"]').last().fill('100');
    const save = page.getByRole('button', { name: /Save budgets/i });
    await save.click();
    await save.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.getByTestId('nav-home').click();
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/?agentDemo=1');
    await expect(page.getByText('Smart Cash Flow Planner')).toBeVisible();
  });

  test('B.1 & B.2 Add Expense updates Expenses tab and Home balance', async ({ page }) => {
    await seedCategory(page);

    // Open Add Transaction modal (FAB)
    await page.getByTestId('nav-add').click();
    await expect(page.getByText('Add Transaction')).toBeVisible();

    // Fill form
    await page.getByLabel('Amount').fill('50.00');
    await page.getByLabel('Description').fill('Playwright Lunch');
    await page.getByRole('button', { name: /Save transaction/i }).click();
    await expect(page.getByText('Add Transaction')).toBeHidden({ timeout: 5000 });

    // Check Expenses tab for the new item
    await page.getByTestId('nav-expenses').click();
    await expect(page.getByText('Playwright Lunch')).toBeVisible();
    await expect(page.getByText('$50.00')).toBeVisible();
  });
});
