import { test, expect } from '@playwright/test';
import { mockUser, mockFirestoreData } from '../utils/mockData';

test.describe('Home Page Visuals', () => {
  test.beforeEach(async ({ page }) => {
    // Inject User AND Data directly into window
    await page.addInitScript(({ user, data }) => {
      window.__TEST_USER__ = user;
      window.__TEST_DATA__ = {
        profile: { 
          uid: user.uid, 
          email: user.email, 
          displayName: user.displayName,
          role: 'H',
          householdId: 'household-1'
        },
        data: data
      };
    }, { user: mockUser, data: mockFirestoreData });

    await page.goto('/');
    
    // Wait for App to render "Hi, Test User"
    await expect(page.getByText(/Hi, Test/i)).toBeVisible();
  });

  test('should render dashboard correctly', async ({ page }) => {
    await expect(page.getByText(/Discretionary left/i)).toBeVisible();
    await expect(page.getByText(/Savings to date/i)).toBeVisible();
    await expect(page).toHaveScreenshot('home-page.png');
  });

  test('should show add expense modal', async ({ page }) => {
    await page.getByRole('button', { name: /add expense/i }).click();
    await expect(page.getByText(/Log Expense/i)).toBeVisible();
    await expect(page).toHaveScreenshot('add-expense-modal.png');
  });
});