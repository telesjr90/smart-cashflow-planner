import { test } from '@playwright/test';

// This test script navigates to the staging URL with the ?e2e=1 flag,
// then polls for the presence of a userProfile UID via the exposed
// Zustand store (window.__cashflowStore). If a UID is found within
// 10 seconds, it prints SUCCESS and stops. Otherwise it reports a failure.

test('debug staging login', async ({ page }) => {
  const url = 'https://cashflow-a1c11-staging.web.app/?e2e=1';
  await page.goto(url);

  let uid = null;

  for (let i = 0; i < 10; i++) {
    // Evaluate the UID from the exposed Zustand store on the page
    uid = await page.evaluate(() => {
      const store = window.__cashflowStore;
      if (store && typeof store.getState === 'function') {
        const state = store.getState();
        return state?.userProfile?.uid || null;
      }
      return null;
    });
    console.log(`Poll ${i + 1}: uid =`, uid);
    if (uid) {
      console.log('SUCCESS');
      return;
    }
    // wait 1 second before polling again
    await page.waitForTimeout(1000);
  }

  console.log('FAILURE: UID is still null');
});
