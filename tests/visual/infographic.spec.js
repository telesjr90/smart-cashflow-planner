import { test, expect } from "@playwright/test";
import { mockUser, mockFirestoreData } from '../utils/mockData';

test.describe("Infographic Visuals", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ user, data }) => {
      window.__TEST_USER__ = user;
      window.__TEST_DATA__ = {
        profile: { uid: user.uid, email: user.email, displayName: user.displayName, role: 'H' },
        data: data
      };
    }, { user: mockUser, data: mockFirestoreData });

    await page.goto('/');
    // "Dashboard" tab opens Infographic
    await page.getByRole('button', { name: /dashboard/i }).click();
  });

  test("renders stable layout", async ({ page }) => {
    await expect(page.getByText(/Cash Flow Plan/i)).toBeVisible();
    
    // Freeze animations
    await page.addStyleTag({
      content: `*, *::before, *::after { transition: none !important; animation: none !important; }`,
    });

    await expect(page).toHaveScreenshot("infographic.png", { fullPage: true });
  });
});