// tests/e2e/ui-audit-import.spec.js
import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

import {
  tsSlug,
  ensureDir,
  ensureAgentDemoReady,
  captureSnapshot,
  writeAuditLog,
} from "./helpers/uiAudit.mjs";
import { seedStoreFromBudgetImport } from "./helpers/seedFromBudgetImportCsv.mjs";

test("UI Audit (seeded CSV) - walkthrough + screenshots + store snapshots", async ({ page }) => {
  const outDir = path.join(process.cwd(), "artifacts", "ui-audit", tsSlug());
  ensureDir(outDir);

  await ensureAgentDemoReady(page);

  // Seed from CSV fixture
  const seed = await seedStoreFromBudgetImport(page);
  fs.writeFileSync(path.join(outDir, "seed-used.json"), JSON.stringify(seed, null, 2), "utf-8");

  const steps = [];

  // Home
  await page.getByTestId("nav-home").click();
  steps.push(await captureSnapshot(page, { outDir, name: "home" }));

  // Planner (planned + actual)
  await page.getByTestId("nav-planner").click();
  steps.push(await captureSnapshot(page, { outDir, name: "planner-planned" }));

  const actualBtn = page.getByRole("button", { name: /^Actual$/i });
  if (await actualBtn.isVisible().catch(() => false)) {
    await actualBtn.click();
    steps.push(await captureSnapshot(page, { outDir, name: "planner-actual" }));
  }

  // Bills
  await page.getByTestId("nav-bills").click();
  steps.push(await captureSnapshot(page, { outDir, name: "bills" }));

  // Expenses
  await page.getByTestId("nav-expenses").click();
  steps.push(await captureSnapshot(page, { outDir, name: "expenses" }));

  // Accounts
  await page.getByTestId("nav-accounts").click();
  steps.push(await captureSnapshot(page, { outDir, name: "accounts" }));

  // Settings + subsections
  await page.getByTestId("nav-settings").click();
  steps.push(await captureSnapshot(page, { outDir, name: "settings" }));

  const sections = ["Accounts & Residual", "Budgets", "Goals", "Allocation Rules"];
  for (const label of sections) {
    const btn = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") });
    if (await btn.isVisible().catch(() => false)) {
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click();
      steps.push(
        await captureSnapshot(page, {
          outDir,
          name: `settings-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`,
        })
      );
    }
  }

  const logPath = writeAuditLog(outDir, steps);
  // eslint-disable-next-line no-console
  console.log(`UI Audit complete.\nOutDir: ${outDir}\nLog: ${logPath}`);
});

test("UI Audit (seeded CSV) - safe clickability smoke + screenshots", async ({ page }) => {
    test.setTimeout(120000); // audit can be slow (many screenshots)
  
    const outDir = path.join(process.cwd(), "artifacts", "ui-audit", tsSlug());
    ensureDir(outDir);
  
    await ensureAgentDemoReady(page);
  
    // Seed from CSV fixture
    const seed = await seedStoreFromBudgetImport(page);
    fs.writeFileSync(path.join(outDir, "seed-used.json"), JSON.stringify(seed, null, 2), "utf-8");
  
    const steps = [];
  
    async function capture(name) {
      steps.push(await captureSnapshot(page, { outDir, name }));
    }
  
    async function closeAnyModalIfPresent(tag = "close-modal") {
      // The Add Transaction modal contains the "For?" input in your logs.
      const forInput = page.getByPlaceholder("For?").first();
      const dialog = page.locator('div[role="dialog"]').first();
  
      const modalVisible =
        (await forInput.isVisible().catch(() => false)) ||
        (await dialog.isVisible().catch(() => false));
  
      if (!modalVisible) return false;
  
      // Try Cancel / Close buttons
      const cancel = page.getByRole("button", { name: /cancel/i }).first();
      const close = page.getByRole("button", { name: /close/i }).first();
  
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(150);
        await capture(`${tag}-cancel`);
        return true;
      }
  
      if (await close.isVisible().catch(() => false)) {
        await close.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(150);
        await capture(`${tag}-close`);
        return true;
      }
  
      // ESC fallback
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(150);
      await capture(`${tag}-escape`);
      return true;
    }
  
    async function clickAndSnap(locator, name, opts = {}) {
      const { waitMs = 250 } = opts;
      try {
        // Ensure overlays are gone before clicking
        await closeAnyModalIfPresent(`pre-${name}`).catch(() => {});
        await locator.scrollIntoViewIfNeeded().catch(() => {});
        await locator.click({ timeout: 5000 });
        await page.waitForTimeout(waitMs);
        await capture(name);
      } catch (e) {
        await capture(`${name}__FAILED`).catch(() => {});
        throw e;
      }
    }
  
    async function clickNav(testId, name) {
      const loc = page.getByTestId(testId);
      try {
        await closeAnyModalIfPresent(`pre-nav-${name}`).catch(() => {});
        await loc.click({ timeout: 5000 });
      } catch {
        // If something still intercepts pointer events, force click as last resort
        await loc.click({ timeout: 5000, force: true });
      }
      await page.waitForTimeout(200);
      await capture(`click-${name}`);
    }
  
    async function maybeClickAndSnap(locator, name) {
      if (await locator.isVisible().catch(() => false)) {
        await clickAndSnap(locator, name);
        return true;
      }
      return false;
    }
  
    async function openCloseAddTransactionModal() {
      await clickAndSnap(page.getByTestId("nav-add"), "click-add-open-modal");
  
      // Close it deterministically
      await closeAnyModalIfPresent("add-modal").catch(() => {});
      // If still visible, ESC again
      await closeAnyModalIfPresent("add-modal-2").catch(() => {});
    }
  
    // Baseline
    await page.getByTestId("nav-home").click();
    await capture("smoke-home-baseline");
  
    // NAV CLICK PASS (use safe nav helper)
    await clickNav("nav-home", "nav-home");
    await clickNav("nav-planner", "nav-planner");
    await clickNav("nav-bills", "nav-bills");
    await clickNav("nav-expenses", "nav-expenses");
    await clickNav("nav-accounts", "nav-accounts");
    await clickNav("nav-settings", "nav-settings");
  
    // PLANNER toggles
    await page.getByTestId("nav-planner").click();
    await capture("planner-before-toggles");
  
    await maybeClickAndSnap(page.getByRole("button", { name: /^Planned$/i }), "click-planner-planned");
    await maybeClickAndSnap(page.getByRole("button", { name: /^Actual$/i }), "click-planner-actual");
    await maybeClickAndSnap(page.getByRole("button", { name: /^Planned$/i }), "click-planner-planned-again");
  
    // ADD modal open/close
    await openCloseAddTransactionModal();
  
    // SETTINGS subsections
    await clickNav("nav-settings", "nav-settings-post-add");
    await capture("settings-baseline");
  
    const settingsSections = [
      ["Accounts & Residual", "settings-accounts-residual"],
      ["Budgets", "settings-budgets"],
      ["Goals", "settings-goals"],
      ["Allocation Rules", "settings-allocation-rules"],
    ];
  
    for (const [label, slug] of settingsSections) {
      const btn = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") });
      if (await btn.isVisible().catch(() => false)) {
        await clickAndSnap(btn, `click-${slug}`);
      }
    }
  
    // BILLS: open/close add bill modal (no save)
    await clickNav("nav-bills", "nav-bills-post-settings");
    await capture("bills-baseline");
  
    const addBillCandidates = [
      page.getByRole("button", { name: /add bill/i }),
      page.getByLabel(/add bill/i),
      page.getByTestId("bills-empty").getByRole("button", { name: /add/i }),
      page.getByRole("button", { name: /^\+$/ }),
    ];
  
    for (const c of addBillCandidates) {
      const loc = c.first ? c.first() : c;
      if (await loc.isVisible().catch(() => false)) {
        await clickAndSnap(loc, "click-bills-open-add-modal");
        await closeAnyModalIfPresent("bills-add-modal").catch(() => {});
        await closeAnyModalIfPresent("bills-add-modal-2").catch(() => {});
        break;
      }
    }
  
    // EXPENSES: baseline
    await clickNav("nav-expenses", "nav-expenses-post-bills");
    await capture("expenses-baseline");
  
    // ACCOUNTS: baseline
    await clickNav("nav-accounts", "nav-accounts-post-expenses");
    await capture("accounts-baseline");
  
    const logPath = writeAuditLog(outDir, steps);
    // eslint-disable-next-line no-console
    console.log(`UI Clickability Smoke complete.\nOutDir: ${outDir}\nLog: ${logPath}`);
  });
  