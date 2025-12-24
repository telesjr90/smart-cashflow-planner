import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.join(process.cwd(), 'playwright', '.auth', 'staging.json');

test('auth: staging e2e bootstrap (anonymous)', async ({ page, context }, testInfo) => {
  test.setTimeout(2 * 60 * 1000);

  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  // Capture browser-side failures so “blank page” is actionable
  page.on('pageerror', async (err) => {
    await testInfo.attach(`pageerror-${Date.now()}`, {
      body: Buffer.from(String(err?.stack || err)),
      contentType: 'text/plain',
    });
  });

  page.on('console', async (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      await testInfo.attach(`console-${type}-${Date.now()}`, {
        body: Buffer.from(`[${type}] ${msg.text()}`),
        contentType: 'text/plain',
      });
    }
  });

  page.on('requestfailed', async (req) => {
    await testInfo.attach(`requestfailed-${Date.now()}`, {
      body: Buffer.from(
        [
          `URL: ${req.url()}`,
          `METHOD: ${req.method()}`,
          `FAILURE: ${req.failure()?.errorText || 'unknown'}`,
        ].join('\n')
      ),
      contentType: 'text/plain',
    });
  });

  const baseUrl =
    process.env.PW_STAGING_URL || process.env.PW_BASE_URL || 'https://cashflow-a1c11-staging.web.app';

  // IMPORTANT:
  // This does NOT use Google OAuth. It relies on the app auto-signing in anonymously
  // when (a) ?e2e=1 and (b) navigator.webdriver is true (Playwright).
  const appUrl = new URL(baseUrl);
  appUrl.searchParams.set('e2e', '1');

  await page.goto(appUrl.toString(), { waitUntil: 'domcontentloaded' });

  // App anchor after auth
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 60_000 });

  // Save cookies/localStorage so subsequent staging tests can run without login
  await context.storageState({ path: authFile });

  await testInfo.attach('saved-storage-state', {
    body: Buffer.from(`Saved storageState to: ${authFile}`),
    contentType: 'text/plain',
  });
});
