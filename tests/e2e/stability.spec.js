import { test, expect } from '@playwright/test';

test.describe('Stability & Smoke (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    // Fail on any console error – this is where the React #185 regression would surface
    page.on('console', msg => {
      if (msg.type() === 'error') {
        throw new Error(`Console error from browser: ${msg.text()}`);
      }
    });
  });

  test('A.1 Rapid route switching does not crash (loop regression check)', async ({ page }) => {
    await page.goto('/?agentDemo=1');

    await expect(page.getByText('Projected Cash Flow')).toBeVisible();

    for (let i = 0; i < 3; i++) {
      // Planner
      await page.getByRole('button', { name: /planner/i }).click();
      await expect(page.getByText(/Monthly snapshot/i)).toBeVisible();

      // Dashboard (Infographic)
      await page.getByRole('button', { name: /dashboard/i }).click();
      await expect(page.getByText(/Cash Flow Plan/i)).toBeVisible();

      // Settings
      await page.getByRole('button', { name: /settings/i }).click();
      await expect(page.getByText(/Household & Profile/i)).toBeVisible();

      // Home
      await page.getByRole('button', { name: /home/i }).click();
      await expect(page.getByText('Projected Cash Flow')).toBeVisible();
    }
  });

  test('A.2 Demo mode vs auth screen', async ({ page }) => {
    // 1. Root without agentDemo → should show login
    await page.goto('/');
    await expect(page.getByText(/Sign in with Google/i)).toBeVisible();
    await expect(page.getByText(/Projected Cash Flow/i)).not.toBeVisible();

    // 2. agentDemo → should skip login and go straight to Home
    await page.goto('/?agentDemo=1');
    await expect(page.getByText(/Sign in with Google/i)).not.toBeVisible();
    await expect(page.getByText(/Projected Cash Flow/i)).toBeVisible();
  });
});
