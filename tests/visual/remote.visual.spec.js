import { test, expect } from '@playwright/test';

test.describe('Visual Regression (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?agentDemo=1');

    // Disable animations for stable screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          transition: none !important;
          animation: none !important;
        }
      `,
    });
  });

  test('Home dashboard visual', async ({ page }) => {
    await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(100);
    const main = page.locator('main');
    await main.evaluate((el) => {
      el.style.minHeight = '979px';
    });
    await expect(main).toHaveScreenshot('remote-home-dashboard.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Bills tab visual', async ({ page }) => {
    const navBills = page.getByTestId('nav-bills');
    await expect(navBills).toBeVisible({ timeout: 10000 });
    await navBills.click();
    await page.waitForTimeout(100);
    await expect(page).toHaveScreenshot('remote-bills-tab.png', {
      fullPage: true,
    });
  });

  test('Planner tab visual', async ({ page }) => {
    const navPlanner = page.getByTestId('nav-planner');
    await expect(navPlanner).toBeVisible({ timeout: 10000 });
    await navPlanner.click();
    await page.waitForTimeout(100);
    const main = page.locator('main');
    await main.evaluate((el) => {
      el.style.minHeight = '1826px';
    });
    await expect(main).toHaveScreenshot('remote-planner-tab.png', {
      maxDiffPixelRatio: 0.07,
    });
  });

  test('Settings tab visual', async ({ page }) => {
    const navSettings = page.getByTestId('nav-settings');
    await expect(navSettings).toBeVisible({ timeout: 10000 });
    await navSettings.click();
    await page.waitForTimeout(100);
    await expect(page).toHaveScreenshot('remote-settings-tab.png', {
      fullPage: true,
    });
  });
});
