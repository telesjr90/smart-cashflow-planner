import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function tsSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function ensureAppReady(page) {
  await page.goto('/?agentDemo=1');
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 15000 });
}

async function snap(page, outDir, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
}

test('UI Walkthrough Screenshots (agentDemo)', async ({ page }) => {
  const outDir = path.join(process.cwd(), 'artifacts', 'ui-audit', tsSlug());
  fs.mkdirSync(outDir, { recursive: true });

  await ensureAppReady(page);

  await page.getByTestId('nav-home').click();
  await snap(page, outDir, 'home');

  await page.getByTestId('nav-planner').click();
  await snap(page, outDir, 'planner-planned');

  // Try toggling Actual if present
  const actualBtn = page.getByRole('button', { name: /^Actual$/i });
  if (await actualBtn.isVisible().catch(() => false)) {
    await actualBtn.click();
    await snap(page, outDir, 'planner-actual');
  }

  await page.getByTestId('nav-bills').click();
  await snap(page, outDir, 'bills');

  await page.getByTestId('nav-expenses').click();
  await snap(page, outDir, 'expenses');

  await page.getByTestId('nav-accounts').click();
  await snap(page, outDir, 'accounts');

  await page.getByTestId('nav-settings').click();
  await snap(page, outDir, 'settings');

  // Optionally click settings sub-sections if they are buttons:
  const sections = ['Accounts & Residual', 'Budgets', 'Goals', 'Allocation Rules'];
  for (const label of sections) {
    const btn = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await snap(page, outDir, `settings-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`);
    }
  }

  console.log(`Saved screenshots to: ${outDir}`);
});
