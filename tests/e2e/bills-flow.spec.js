import { test, expect } from '@playwright/test';

test.describe('Bills Flow (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        throw new Error(`Console error from browser: ${msg.text()}`);
      }
    });

    await page.goto('/?agentDemo=1');
    await page.getByRole('button', { name: /bills/i }).click();
  });

  test('C.1 Mark first unpaid bill as paid', async ({ page }) => {
    // Try to find an unpaid bill icon by its "gray" styling
    const unpaidBillToggle = page
      .locator('button')
      .filter({ has: page.locator('svg.text-slate-300') })
      .first();

    const count = await unpaidBillToggle.count();
    if (count === 0) {
      test.skip(true, 'No unpaid bills found in agentDemo data');
    }

    await unpaidBillToggle.click();

    // After clicking, expect a green check icon inside the same button
    await expect(
      unpaidBillToggle.locator('svg.text-emerald-600')
    ).toBeVisible();
  });
});
