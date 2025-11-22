import { test, expect } from '@playwright/test';
import { mockUser, mockFirestoreData } from '../utils/mockData';

test.describe('Planner Visuals', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ user, data }) => {
      window.__TEST_USER__ = user;
      window.__TEST_DATA__ = {
        profile: { uid: user.uid, email: user.email, displayName: user.displayName, role: 'H' },
        data: data
      };
    }, { user: mockUser, data: mockFirestoreData });

    await page.goto('/');
    await page.getByRole('button', { name: /planner/i }).click();
  });

  test('should render planner view', async ({ page }) => {
    await expect(page.getByText(/Monthly snapshot/i)).toBeVisible();
    
    // FIX: Use exact match to avoid conflict with "Projected end-of-month"
    await expect(page.getByText('Projected', { exact: true })).toBeVisible();

    await expect(page).toHaveScreenshot('planner-view.png', { fullPage: true });
  });
});