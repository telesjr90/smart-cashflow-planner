import { test, expect } from '@playwright/test';

const DEMO_ENTRY = '/?agentDemo=1';

test.describe('Planner Visuals', () => {
  test('captures planned and actual views', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.clear());

    await page.goto(DEMO_ENTRY);

    const navPlanner = page.getByTestId('nav-planner');
    await expect(navPlanner).toBeVisible({ timeout: 10000 });
    await navPlanner.click();

    await expect(page.getByRole('heading', { level: 2, name: 'Financial Analysis' })).toBeVisible({ timeout: 15000 });
    const plannedButton = page.getByRole('button', { name: /^Planned$/i });
    const actualButton = page.getByRole('button', { name: /^Actual$/i });
    await expect(plannedButton).toBeVisible({ timeout: 10000 });

    const main = page.locator('main');
    // Keep a modest minHeight to avoid tiny layout shifts between captures
    await main.evaluate((el) => {
      el.style.minHeight = '1600px';
    });

    // Planned view (default)
    await plannedButton.click();
    await page.waitForTimeout(100);
    await expect(main).toHaveScreenshot('visual--planner--planned.png', {
      maxDiffPixelRatio: 0.01,
    });

    // Actual view
    await actualButton.click();
    await page.waitForTimeout(150);
    await expect(main).toHaveScreenshot('visual--planner--actual.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});
