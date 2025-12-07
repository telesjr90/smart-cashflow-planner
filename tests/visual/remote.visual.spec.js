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
    await expect(page).toHaveScreenshot('remote-home-dashboard.png', {
      fullPage: true,
    });
  });

  test('Bills tab visual', async ({ page }) => {
    await page.getByRole('button', { name: /bills/i }).click();
    await expect(page).toHaveScreenshot('remote-bills-tab.png', {
      fullPage: true,
    });
  });

  test('Planner tab visual', async ({ page }) => {
    await page.getByRole('button', { name: /planner/i }).click();
    await expect(page).toHaveScreenshot('remote-planner-tab.png', {
      fullPage: true,
    });
  });

  test('Settings tab visual', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page).toHaveScreenshot('remote-settings-tab.png', {
      fullPage: true,
    });
  });
});
