import { test, expect } from '@playwright/test';

test.describe('Planner View (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?agentDemo=1');
    await page.getByRole('button', { name: /planner/i }).click();
  });

  test('D.1 Planner renders Monthly snapshot and Projected section', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'Financial Analysis' })).toBeVisible();
    await expect(page.getByText('Projected Balance', { exact: false })).toBeVisible();
  });
});
