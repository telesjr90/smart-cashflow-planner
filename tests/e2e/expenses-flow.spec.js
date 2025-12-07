import { test, expect } from '@playwright/test';

test.describe('Expenses Flow (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        throw new Error(`Console error from browser: ${msg.text()}`);
      }
    });

    await page.goto('/?agentDemo=1');
    await expect(page.getByText('Projected Cash Flow')).toBeVisible();
  });

  test('B.1 & B.2 Add Expense updates Expenses tab and Home balance', async ({ page }) => {
    // 1. Capture initial balance from "Projected Cash Flow" hero
    const heroSection = page
      .locator('section')
      .filter({ hasText: 'Projected Cash Flow' });

    const initialBalanceStr = await heroSection
      .locator('span.text-4xl')
      .first()
      .textContent();

    const initialBalance = parseFloat(
      (initialBalanceStr || '').replace(/[^0-9.-]+/g, '') || '0'
    );

    // 2. Open Add Transaction modal (FAB)
    await page.getByLabel('Add Transaction').click();
    await expect(page.getByText(/Log Expense/i)).toBeVisible();

    // 3. Fill form
    await page.getByPlaceholder('0.00').fill('50.00');
    await page.getByPlaceholder('What is this for?').fill('Playwright Lunch');
    // If category is required, rely on whatever default is set in the UI
    await page.getByRole('button', { name: /save/i }).click();

    // 4. Check Expenses tab for the new item
    await page.getByRole('button', { name: /expenses/i }).click();
    await expect(page.getByText('Playwright Lunch')).toBeVisible();
    await expect(page.getByText('$50.00')).toBeVisible();

    // 5. Check that Home balance decreased
    await page.getByRole('button', { name: /home/i }).click();
    await page.waitForTimeout(500); // allow engine re-run

    const newBalanceStr = await heroSection
      .locator('span.text-4xl')
      .first()
      .textContent();

    const newBalance = parseFloat(
      (newBalanceStr || '').replace(/[^0-9.-]+/g, '') || '0'
    );

    expect(newBalance).toBeLessThan(initialBalance);
    expect(newBalance).toBeCloseTo(initialBalance - 50, 1);
  });
});
