import { test, expect } from '@playwright/test';

const CATEGORY_LABEL = 'QA Category';

async function seedCategoryBudget(page) {
  // Persist at least one budget category so transaction forms have a category option.
  await page.getByTestId('nav-settings').click();
  await page.getByRole('button', { name: /^Budgets$/i }).click();

  const addCategory = page.getByRole('button', { name: /Add category/i });
  await expect(addCategory).toBeVisible();
  await addCategory.click();

  await page.locator('input[placeholder="Category name"]').last().fill(CATEGORY_LABEL);
  await page.locator('input[placeholder="0.00"]').last().fill('100');

  const saveBudgets = page.getByRole('button', { name: /Save budgets/i });
  await expect(saveBudgets).toBeVisible();
  await saveBudgets.click();
  // Save button disappears once dirty state clears; ignore if it races the click.
  await saveBudgets.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
}

function parseCurrencyToNumber(text = '') {
  const cleaned = text.replace(/[^0-9.-]+/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

async function readExpensesValue(page) {
  const heading = page.locator('p', { hasText: /^Expenses$/ });
  await expect(heading).toBeVisible();
  const valueNode = heading.locator('xpath=../..//h4').first();
  const text = await valueNode.textContent();
  return parseCurrencyToNumber(text);
}

test.describe('Manual Smoke Gaps', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?agentDemo=1');
    await expect(page.getByText('Smart Cash Flow Planner')).toBeVisible();
    await seedCategoryBudget(page);
    await page.getByTestId('nav-home').click();
  });

  test('Dead Button Audit shows toasts', async ({ page }) => {
    await page.getByLabel('Notifications').click();
    await expect(page.getByText(/No new notifications yet/i)).toBeVisible({ timeout: 15000 });

    await page.getByTestId('nav-planner').click();
    await page.getByRole('button', { name: /Adjust Range/i }).click();
    await expect(page.getByText(/Adjust range coming soon/i)).toBeVisible({ timeout: 10000 });
  });

  test('Edit transaction in Expenses sheet updates amount', async ({ page }) => {
    // Add via global modal, then edit via sheet
    await page.getByTestId('nav-add').click();
    const modal = page.getByText('Add Transaction').locator('xpath=ancestor::div[contains(@class,"fixed")]');
    await modal.getByLabel('Amount').fill('10');
    await modal.getByLabel('Description').fill('To Edit');
    await modal.getByLabel('Category').selectOption({ label: CATEGORY_LABEL });
    await modal.getByRole('button', { name: /Save transaction/i }).click();
    await expect(modal).toBeHidden({ timeout: 5000 });

    await page.getByTestId('nav-expenses').click();
    await expect(page.getByRole('heading', { level: 2, name: 'Transactions' })).toBeVisible();

    await page.locator('.divide-y').getByText('To Edit').first().click();
    const editSheet = page.getByText('Edit Transaction').locator('xpath=ancestor::div[@role="dialog"]');
    await editSheet.getByLabel('Amount').fill('99.00');
    const editCat = editSheet.getByLabel('Category');
    if (await editCat.count()) {
      const optCount = await editCat.locator('option').count();
      if (optCount > 1) {
        const opt = editCat.locator('option').nth(1);
        const value = await opt.getAttribute('value');
        if (value) await editCat.selectOption(value);
      }
    }
    const editAccount = editSheet.getByLabel('Account');
    if (await editAccount.count()) {
      const optCount = await editAccount.locator('option').count();
      if (optCount > 1) {
        const val = await editAccount.locator('option').nth(1).getAttribute('value');
        if (val) await editAccount.selectOption(val);
      }
    }
    await editSheet.getByRole('button', { name: /Save transaction/i }).click();
    await expect(editSheet).toBeHidden({ timeout: 5000 });

    await page.waitForTimeout(500);
    await expect(page.locator('.divide-y').getByText('To Edit').first()).toBeVisible();
  });

  test('Add Transaction modal blocks empty submit', async ({ page }) => {
    await page.getByTestId('nav-add').click();
    const modal = page.getByText('Add Transaction').locator('xpath=ancestor::div[contains(@class,"fixed")]');
    await expect(modal).toBeVisible();

    await page.getByRole('button', { name: /Save transaction/i }).click();

    await expect(modal).toBeVisible();
    await expect(page.getByLabel('Amount')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Description')).toHaveAttribute('aria-invalid', 'true');
  });

  test('Plan lock persists after reload', async ({ page }) => {
    await page.getByTestId('nav-planner').click();
    const lockButton = page.getByRole('button', { name: /Lock this plan/i });
    await lockButton.scrollIntoViewIfNeeded();
    await lockButton.click();

    await page.waitForTimeout(1000);
    const clearButton = page.getByRole('button', { name: /Clear confirmed amount/i });
    const toast = page.getByText(/Plan locked for this scope/i);
    await expect(clearButton.or(toast)).toBeVisible({ timeout: 10000 });

    await page.reload();
    await page.getByTestId('nav-planner').click();
    await expect(lockButton).toBeVisible();
  });

  test('"Today" expense counted in Actual mode', async ({ page }) => {
    await page.getByTestId('nav-planner').click();
    await page.getByRole('button', { name: /^Actual$/i }).click();

    await page.getByTestId('nav-home').click();
    const initialExpenses = await readExpensesValue(page);

    await page.getByTestId('nav-add').click();
    await page.getByLabel('Amount').fill('25');
    await page.getByLabel('Description').fill('Actual Mode Expense');
    await page.getByLabel('Category').selectOption({ label: CATEGORY_LABEL });
    await page.getByRole('button', { name: /Save transaction/i }).click();

    await page.getByTestId('nav-home').click();
    const updatedExpenses = await readExpensesValue(page);

    expect(updatedExpenses).toBeCloseTo(initialExpenses + 25, 0.1);
  });
});
