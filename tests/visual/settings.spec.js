import { test, expect } from '@playwright/test';
import { mockUser, mockFirestoreData } from '../utils/mockData';

test.describe('Settings Visuals', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ user, data }) => {
      window.__TEST_USER__ = user;
      window.__TEST_DATA__ = {
        profile: { uid: user.uid, email: user.email, displayName: user.displayName, role: 'H' },
        data: data
      };
    }, { user: mockUser, data: mockFirestoreData });

    await page.goto('/');
    
    // FIX: Use exact match for the tab button to ensure reliable navigation
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
  });

  test('should render settings layout', async ({ page }) => {
    // FIX: Wait for the unique page header first to confirm we left Home
    await expect(page.getByText('Smart Cash Flow Planner')).toBeVisible();

    // Now check the sections
    // FIX: Updated text to match Phase 5 change ("Household & Profile")
    await expect(page.getByText(/Household & Profile/i)).toBeVisible();
    
    await expect(page.getByText(/Bank Accounts/i)).toBeVisible();
    await expect(page.getByText(/Savings Goals/i)).toBeVisible();

    await expect(page).toHaveScreenshot('settings-page.png');
  });
});