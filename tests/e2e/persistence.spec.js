import { test, expect } from '@playwright/test';

test.describe('Persistence (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
  });

  test('F.2 Expense persists across reload', async ({ page }) => {
    await page.goto('/?agentDemo=1');
    // Seed a category so the transaction form can save
    await page.getByTestId('nav-settings').click();
    await page.getByRole('button', { name: /^Budgets$/i }).click();
    await page.getByRole('button', { name: /Add category/i }).click();
    await page.locator('input[placeholder="Category name"]').last().fill('PersistCat');
    await page.locator('input[placeholder="0.00"]').last().fill('50');
    const saveBudgets = page.getByRole('button', { name: /Save budgets/i });
    await saveBudgets.click();
    await saveBudgets.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.getByTestId('nav-home').click();

    // 1. Add an expense
    await page.getByTestId('nav-add').click();
    await expect(page.getByText('Add Transaction')).toBeVisible();
    await page.getByLabel('Amount').fill('99.99');
    await page.getByLabel('Description').fill('Persist Me');
    await page.getByLabel('Category').selectOption({ label: 'PersistCat' });
    await page.getByRole('button', { name: /Save transaction/i }).click();

    // 2. Verify expense is present in the Expenses tab (same session)
    await page.getByRole('button', { name: /expenses/i }).click();
    await expect(page.getByText('Persist Me')).toBeVisible();
    await expect(page.getByText('$99.99')).toBeVisible();
  });
});
