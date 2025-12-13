import { test, expect } from '@playwright/test';

/**
 * Clicks a bottom-nav tab using accessible name first, then data-testid as fallback.
 * Throws a clear, actionable error if neither is found.
 */
async function clickNavTab(page, tabName) {
  const expectedName = tabName.charAt(0).toUpperCase() + tabName.slice(1);
  const expectedTestId = `nav-${tabName}`;
  const roleLocator = page.getByRole('button', { name: new RegExp(expectedName, 'i') });
  try {
    await roleLocator.first().click({ timeout: 2000 });
    return;
  } catch (roleError) {
    const testIdLocator = page.getByTestId(expectedTestId);
    try {
      await testIdLocator.click({ timeout: 2000 });
      return;
    } catch (testIdError) {
      throw new Error(
        `Could not find bottom-nav button for '${tabName}'. Expected either:\n` +
        `- a role="button" with accessible name matching /${expectedName}/i, OR\n` +
        `- an element with data-testid="${expectedTestId}".\n` +
        `Please ensure BottomNav sets aria-label="${expectedName}" or data-testid="${expectedTestId}" on the ${expectedName} tab button.\n` +
        `Original errors:\n${roleError}\n${testIdError}`
      );
    }
  }
}

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
      await clickNavTab(page, 'planner');
      await expect(
        page.getByRole('heading', { level: 1, name: /Financial Analysis|Monthly snapshot/i })
      ).toBeVisible();

      // Bills
      await clickNavTab(page, 'bills');
      await expect(page.getByText(/Upcoming Bills|Mark Paid/i)).toBeVisible();

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
