import { test, expect } from '@playwright/test';

/**
 * Clicks a bottom-nav tab using data-testid first, then accessible name as fallback.
 * Throws a clear, actionable error if neither is found.
 */
async function clickNavTab(page, tabName) {
  const expectedName = tabName.charAt(0).toUpperCase() + tabName.slice(1);
  const expectedTestId = `nav-${tabName}`;
  const testIdLocator = page.getByTestId(expectedTestId);
  try {
    await testIdLocator.click({ timeout: 2000 });
    return;
  } catch (testIdError) {
    const roleLocator = page.getByRole('button', { name: new RegExp(expectedName, 'i') });
    try {
      await roleLocator.first().click({ timeout: 2000 });
      return;
    } catch (roleError) {
      throw new Error(
        `Could not find bottom-nav button for '${tabName}'. Expected either:\n` +
        `- an element with data-testid="${expectedTestId}", OR\n` +
        `- a role="button" with accessible name matching /${expectedName}/i.\n` +
        `Please ensure BottomNav sets data-testid="${expectedTestId}" or aria-label="${expectedName}" on the ${expectedName} tab button.\n` +
        `Original errors:\n${testIdError}\n${roleError}`
      );
    }
  }
}

test.describe('Stability & Smoke (remote, agentDemo)', () => {
  test.beforeEach(async ({ page }) => {
    // Log console errors (visibility into regressions without flaking on benign warnings)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // eslint-disable-next-line no-console
        console.error(`Console error from browser: ${msg.text()}`);
      }
    });
  });

  test('A.1 Rapid route switching does not crash (loop regression check)', async ({ page }) => {
    await page.goto('/?agentDemo=1');

    await expect(page.getByText('Projected Cash Flow')).toBeVisible();

    for (let i = 0; i < 3; i++) {
      // Planner
      await clickNavTab(page, 'planner');
      await expect(
        page.getByRole('heading', { level: 1, name: /Financial Analysis|Monthly snapshot/i })
      ).toBeVisible();

      // Bills
      await clickNavTab(page, 'bills');
      await expect(page.getByTestId('bills-header')).toBeVisible();
      const billsListVisible = await page.getByTestId('bills-list').isVisible();
      const billsEmptyVisible = await page.getByTestId('bills-empty').isVisible();
      expect(billsListVisible || billsEmptyVisible).toBeTruthy();

      // Expenses
      await clickNavTab(page, 'expenses');
      await expect(page.getByText(/Expenses|Transactions/i)).toBeVisible();

      // Settings
      await clickNavTab(page, 'settings');
      await expect(page.getByText(/Household & Profile/i)).toBeVisible();

      // Home
      await clickNavTab(page, 'home');
      await expect(page.getByText('Projected Cash Flow')).toBeVisible();
    }
  });

  test('A.2 Demo mode vs auth screen', async ({ page }) => {
    // 1. Root without agentDemo flag should show login
    await page.goto('/');
    await expect(page.getByText(/Sign in with Google/i)).toBeVisible();
    await expect(page.getByText(/Projected Cash Flow/i)).not.toBeVisible();

    // 2. agentDemo flag should skip login, load dashboard, and show seeded data
    await page.goto('/?agentDemo=1');
    await expect(page.getByText(/Sign in with Google/i)).not.toBeVisible();
    await expect(page.getByText(/Projected Cash Flow/i)).toBeVisible();
    await clickNavTab(page, 'bills');
    await expect(page.getByTestId('bills-header')).toBeVisible();
    await expect(page.getByText(/Internet/i)).toBeVisible();
  });
});
