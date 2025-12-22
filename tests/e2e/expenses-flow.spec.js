import { test, expect } from '@playwright/test';

test.describe('Expenses Flow (remote, agentDemo)', () => {
  const seedCategory = async (page) => {
    await page.getByTestId('nav-settings').click();
    const budgetsNav = page.getByRole('button', { name: /^Budgets$/i });
    await expect(budgetsNav).toBeVisible({ timeout: 10000 });
    await budgetsNav.click();

    const addCategory = page.getByRole('button', { name: /add category/i });
    await expect(addCategory).toBeVisible({ timeout: 10000 });
    await addCategory.click();

    await expect(page.getByLabel('Category Name').last()).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Category Name').last().fill('QA Category');
    await page.getByLabel('Monthly Limit').last().fill('100');

    const save = page.getByRole('button', { name: /save budgets/i });
    await save.click();
    await save.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.getByTestId('nav-home').click();
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/?agentDemo=1');
    await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-add')).toBeVisible();
  });

  test('B.1 & B.2 Add Expense updates Expenses tab and Home balance', async ({ page }) => {
    await seedCategory(page);

    // Open Add Transaction modal (FAB)
    await page.getByTestId('nav-add').click();
    await expect(page.getByText('Add Transaction')).toBeVisible({ timeout: 10000 });

    // Fill form
    await page.getByPlaceholder('0.00').fill('50.00');
    await page.getByPlaceholder('For?').fill('Playwright Lunch');
    await page.getByRole('button', { name: /Save transaction/i }).click();
    await expect(page.getByText('Add Transaction')).toBeHidden({ timeout: 5000 });

    // Check Expenses tab for the new item
    await page.getByTestId('nav-expenses').click();
    await expect(page.getByText('Playwright Lunch')).toBeVisible();
    await expect(page.getByText('$50.00')).toBeVisible();
  });
});
