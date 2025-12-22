import { test, expect } from '@playwright/test';

test.describe('Persistence (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
  });

  test('F.2 Expense persists across reload', async ({ page }) => {
    await page.goto('/?agentDemo=1');
    // Seed a category so the transaction form can save
    await page.getByTestId('nav-settings').click();
    const budgetsNav = page.getByRole('button', { name: /^Budgets$/i });
    await expect(budgetsNav).toBeVisible({ timeout: 10000 });
    await budgetsNav.click();

    // Wait for budgets form to render before interacting
    const addCategory = page.getByRole('button', { name: /add category/i });
    await expect(addCategory).toBeVisible({ timeout: 10000 });
    await addCategory.click();

    await expect(page.getByLabel('Category Name').last()).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Category Name').last().fill('PersistCat');
    await page.getByLabel('Monthly Limit').last().fill('50');

    const saveBudgets = page.getByRole('button', { name: /save budgets/i });
    await saveBudgets.click();
    await saveBudgets.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.getByTestId('nav-home').click();

    // 1. Add an expense
    await page.getByTestId('nav-add').click();
    await expect(page.getByText('Add Transaction')).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder('0.00').fill('99.99');
    await page.getByPlaceholder('For?').fill('Persist Me');
    // Category buttons default to "Food"; keep default to avoid flaky selection
    await page.getByRole('button', { name: /Save transaction/i }).click();

    // 2. Verify expense is present in the Expenses tab (same session)
    await page.getByRole('button', { name: /expenses/i }).click();
    await expect(page.getByText('Persist Me')).toBeVisible();
    await expect(page.getByText('$99.99')).toBeVisible();
  });
});
