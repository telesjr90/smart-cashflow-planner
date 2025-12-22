import { test, expect } from '@playwright/test';

test.describe('Planner View (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?agentDemo=1');
    await page.getByRole('button', { name: /planner/i }).click();
    await expect(page.getByText(/cashflow infographic/i)).toBeVisible();
  });

  test('D.1 Planner renders Monthly snapshot and Planned section', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'Financial Analysis' })).toBeVisible();
    await expect(page.getByText('Planned Balance', { exact: false })).toBeVisible();
  });

  test('D.2 Mode toggle labels show Planned/Actual', async ({ page }) => {
    const plannedButton = page.getByRole('button', { name: /^Planned$/i });
    const actualButton = page.getByRole('button', { name: /^Actual$/i });
    await expect(plannedButton).toBeVisible();
    await expect(actualButton).toBeVisible();
  });
});
