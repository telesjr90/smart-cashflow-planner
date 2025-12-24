import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.join(process.cwd(), 'playwright', '.auth', 'prod.json');

test('auth: prod interactive login', async ({ page, context }, testInfo) => {
  // Give yourself time to complete MFA/SSO
  test.setTimeout(10 * 60 * 1000);

  // Ensure the auth directory exists before we write prod.json
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

  // If prod is blocked by strict CSP/cross-origin issues, these help debug quickly.
  page.on('response', async (res) => {
    if (res.status() >= 400) {
      await testInfo.attach(`http-${res.status()}-${Date.now()}`, {
        body: Buffer.from(`HTTP ${res.status()} ${res.url()}`),
        contentType: 'text/plain',
      });
    }
  });

  const baseUrl = process.env.PW_BASE_URL || 'https://cashflow-a1c11.web.app/';

  // Navigate to the app root. (No demo/query modes.)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  // Wait for *some* DOM to exist so screenshots / pause are meaningful.
  await page.waitForFunction(() => document.readyState === 'interactive' || document.readyState === 'complete', {
    timeout: 30_000,
  });

  // Optional: small “settle” for SPA hydration to begin
  await page.waitForTimeout(250);

  // Anchors:
  // - logged-in shell
  // - app’s login affordance (update if your UI uses different text)
  const loggedInNav = page.getByTestId('nav-home');
  const loginHint = page.getByRole('button', { name: /sign in|log in|continue/i });

  // Google “blocked/unsafe browser” banner (common with Playwright’s bundled Chromium)
  // If you see this, fix is in config: use an installed browser channel (chrome/msedge) + headed.
  const googleBlocked = page.getByText(/This browser or app may not be secure/i);

  // Wait until we see *either* the app shell, a login affordance, or the Google blocked message.
  // We intentionally avoid relying on networkidle (often flaky for SPAs).
  await expect
    .poll(
      async () => {
        const [navVisible, loginVisible, blockedVisible] = await Promise.all([
          loggedInNav.isVisible().catch(() => false),
          loginHint.isVisible().catch(() => false),
          googleBlocked.isVisible().catch(() => false),
        ]);

        if (blockedVisible) return 'google-blocked';
        if (navVisible) return 'logged-in';
        if (loginVisible) return 'login-page';
        return 'waiting';
      },
      { timeout: 30_000, interval: 250 }
    )
    .not.toBe('waiting');

  // Helpful: screenshot what you actually got (blank vs login vs app vs blocked)
  await testInfo.attach('before-pause', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  // If Google is blocking sign-in, fail with a clear actionable message.
  if (await googleBlocked.isVisible().catch(() => false)) {
    throw new Error(
      [
        'Google sign-in blocked this browser: "This browser or app may not be secure."',
        '',
        'Fix:',
        '- Run the auth project in a REAL installed browser channel (chrome or msedge) and headed mode.',
        '- In playwright.config.js: set use.channel = "chrome" (or "msedge") and headless: false for the auth project.',
        '',
        'Then re-run: npx playwright test --project=auth-prod',
      ].join('\n')
    );
  }

  // Pause for manual login (in the inspector, complete login then click Resume)
  await page.pause();

  // After resume: don’t assume we landed back on the app route that renders the shell.
  // Force navigation back to the deterministic app entry, then assert.
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  // If Google blocked the login during the pause, fail with an actionable message.
  if (await googleBlocked.isVisible().catch(() => false)) {
    throw new Error(
      [
        'Google sign-in blocked this browser: "This browser or app may not be secure."',
        '',
        'This is a Google restriction on automated browsers. For reliable E2E:',
        '- Prefer an Email/Password (or custom token) test user for staging/prod E2E, OR',
        '- Generate storageState manually in a normal Chrome session and reuse it in Playwright.',
      ].join('\n')
    );
  }

  // If we are still on the login screen, the manual login was not completed.
  if (await loginHint.isVisible().catch(() => false)) {
    throw new Error(
      [
        'Still seeing a login affordance after resuming the auth setup test.',
        'Complete sign-in in the Playwright inspector window, then click Resume.',
        `URL: ${page.url()}`,
      ].join('\n')
    );
  }

  // Assert logged in using a stable post-login anchor
  await expect(loggedInNav).toBeVisible({ timeout: 60_000 });

  // Save cookies/localStorage so subsequent prod tests can run without login
  await context.storageState({ path: authFile });

  // Attach a confirmation artifact
  await testInfo.attach('saved-storage-state', {
    body: Buffer.from(`Saved storageState to: ${authFile}`),
    contentType: 'text/plain',
  });
});
