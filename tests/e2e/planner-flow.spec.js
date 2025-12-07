import { test, expect } from '@playwright/test';

test.describe('Planner View (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        throw new Error(`Console error from browser: ${msg.text()}`);
      }
    });

    await page.goto('/?agentDemo=1');
    await page.getByRole('button', { name: /planner/i }).click();
  });

  test('D.1 Planner renders Monthly snapshot and Projected section', async ({ page }) => {
    await expect(page.getByText(/Monthly snapshot/i)).toBeVisible();
    // Existing planner.spec.js checks that "Projected" (exact) is visible
    await expect(page.getByText('Projected', { exact: true })).toBeVisible();
  });
});
