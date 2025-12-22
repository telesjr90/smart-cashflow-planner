import { test, expect } from '@playwright/test';

const DEMO_ENTRY = '/?agentDemo=1';

test.describe('Accounts Visuals', () => {
  test('renders demo-mode accounts view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Begin in demo mode for stable fixtures
    await page.goto(DEMO_ENTRY);

    // Navigate to Accounts via bottom nav to mirror user flow
    const navAccounts = page.getByTestId('nav-accounts');
    await expect(navAccounts).toBeVisible({ timeout: 10000 });
    await navAccounts.click();

    // Anchor on the Accounts heading
    const heading = page.getByRole('heading', { name: 'Accounts', exact: true });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Wait for hydrated content (accounts grid) before snapshotting
    const accountsGrid = page.locator('[data-testid="accounts-grid"]').first().or(
      page.locator('div').filter({ hasText: /Current Balance|Opening Balance/ }).first()
    );
    await expect(accountsGrid).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(100); // brief settle for visual stability

    await expect(page).toHaveScreenshot('visual--accounts--default.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});
