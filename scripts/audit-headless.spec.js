// Playwright headless UI audit (agentDemo mode) with basic CRUD flows.
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.setTimeout(90000);

const outDir = path.join(process.cwd(), "artifacts", "audit");
const actionsLog = [];

const pages = [
  { tab: "home", label: "Home" },
  { tab: "bills", label: "Bills" },
  { tab: "planner", label: "Planner" },
  { tab: "settings", label: "Settings" },
];

test.beforeAll(() => {
  fs.mkdirSync(outDir, { recursive: true });
});

const safeAction = async (name, fn) => {
  try {
    await fn();
    actionsLog.push({ name, status: "ok" });
  } catch (err) {
    actionsLog.push({ name, status: "fail", error: err?.message || String(err) });
  }
};

test("Headless UI audit (agentDemo)", async ({ page }) => {
  const consoleLogs = [];
  const persistArtifacts = () => {
    fs.writeFileSync(path.join(outDir, "console.json"), JSON.stringify(consoleLogs, null, 2));
    fs.writeFileSync(path.join(outDir, "actions.json"), JSON.stringify(actionsLog, null, 2));
  };

  page.on("console", (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });
  page.on("pageerror", (err) => {
    consoleLogs.push({ type: "error", text: `PageError: ${err.message}` });
  });

  try {
    await page.goto("http://localhost:4173/?agentDemo=1", { waitUntil: "domcontentloaded" });
    page.setDefaultTimeout(5000);
    await page.waitForTimeout(800);

    const goToTab = async (tab) => {
      if (page.isClosed()) return false;
      const nameMap = {
        home: /home/i,
        planner: /analysis|planner/i,
        bills: /wallet|bills/i,
        settings: /profile|settings/i,
      };
      const label = nameMap[tab];
      if (!label) return false;
      const candidateButtons = page.getByRole("button", { name: label });
      if ((await candidateButtons.count()) > 0) {
        try {
          await candidateButtons.first().click({ timeout: 2000, force: true });
          actionsLog.push({ name: `nav:${tab}`, status: "ok" });
          await page.waitForTimeout(400);
          return true;
        } catch (err) {
          actionsLog.push({ name: `nav:${tab}`, status: "fail", error: err?.message || "nav click failed" });
          return false;
        }
      }
      const navButtons = page.locator("nav button");
      try {
        await navButtons.first().waitFor({ timeout: 3000 });
      } catch {
        actionsLog.push({ name: `nav:${tab}`, status: "fail", error: "nav not ready" });
        return false;
      }
      const indexMap = { home: 0, planner: 1, bills: 3, settings: 4 };
      const idx = indexMap[tab];
      if (idx === undefined) return false;
      const count = await navButtons.count();
      if (idx >= count) return false;
      try {
        await navButtons.nth(idx).click({ timeout: 2000, force: true });
        actionsLog.push({ name: `nav:${tab}`, status: "ok-fallback" });
      } catch (err) {
        actionsLog.push({ name: `nav:${tab}`, status: "fail", error: err?.message || "nav click failed" });
        return false;
      }
      await page.waitForTimeout(400);
      return true;
    };

    for (const { tab } of pages) {
      const ok = await goToTab(tab);
      if (!ok) {
        actionsLog.push({ name: `nav:${tab}`, status: "fail", error: "nav buttons not found" });
        continue;
      }

      if (tab === "bills") {
        const openAddBill = async () => {
          const primaryAdd = page.locator('button[aria-label="Add bill"]');
          if ((await primaryAdd.count()) > 0) return primaryAdd.first();
          const cta = page.getByRole("button", { name: /add your first bill/i });
          if ((await cta.count()) > 0) return cta.first();
          return null;
        };

        await safeAction("bills:add", async () => {
          const trigger = await openAddBill();
          if (!trigger) throw new Error("Add bill trigger not found");
          await trigger.click();
          await page.getByLabel(/name/i).fill("Audit Bill");
          await page.getByLabel(/amount/i).fill("12.34");
          await page.getByLabel(/due day/i).fill("10");
          const payer = page.getByLabel(/payer/i);
          if (await payer.count()) await payer.selectOption("H");
          const accountSelect = page.getByLabel(/withdraw from/i);
          if (await accountSelect.count()) await accountSelect.selectOption({ index: 0 });
          await page.getByRole("button", { name: /save bill/i }).click();
          await page.waitForTimeout(300);
        });

        await safeAction("bills:add-second", async () => {
          const trigger = await openAddBill();
          if (!trigger) throw new Error("Add bill trigger not found");
          await trigger.click();
          await page.getByLabel(/name/i).fill("Audit Bill 2");
          await page.getByLabel(/amount/i).fill("22.00");
          await page.getByLabel(/due day/i).fill("15");
          await page.getByRole("button", { name: /save bill/i }).click();
          await page.waitForTimeout(200);
        });

        await safeAction("bills:edit", async () => {
          const editAria = page.locator('button[aria-label*="edit bill" i]');
          const editText = page.getByRole("button", { name: /^edit$/i });
          const editBtn = (await editAria.count()) ? editAria.first() : editText.first();
          if (!(await editBtn.count())) return;
          await editBtn.waitFor({ timeout: 5000 });
          await editBtn.click({ timeout: 3000, force: true });
          const amountInput = page.getByLabel(/amount/i);
          await amountInput.fill("15.00");
          await page.getByRole("button", { name: /save bill/i }).click();
          await page.waitForTimeout(200);
        });

        await safeAction("bills:changeAccount", async () => {
          const select = page.locator("select").first();
          if (await select.count()) {
            const opts = await select.elementHandles();
            if (opts.length > 1) {
              await select.selectOption({ index: 1 });
            }
          }
        });

        await safeAction("bills:togglePaid", async () => {
          const toggle = page.getByRole("button").filter({ hasText: /^$/ }).first();
          const checkIcon = page.getByRole("button").filter({ has: page.locator("svg") }).first();
          const candidate = (await toggle.count()) ? toggle : checkIcon;
          if (await candidate.count()) {
            await candidate.click({ timeout: 2000, force: true });
          }
        });

        await safeAction("bills:bulkMarkPaidUnpaid", async () => {
          const markPaid = page.getByRole("button", { name: /mark all paid/i });
          if (await markPaid.count()) {
            await markPaid.first().click();
            await page.waitForTimeout(150);
          }
          const markUnpaid = page.getByRole("button", { name: /mark all unpaid/i });
          if (await markUnpaid.count()) {
            await markUnpaid.first().click();
            await page.waitForTimeout(150);
          }
        });

        await safeAction("expenses:addViaFab", async () => {
          const fab = page.getByRole("button", { name: /add transaction/i });
          if (!(await fab.count())) return;
          await fab.first().click();
          const amountInput = page.locator('input[type="number"]').first();
          if (await amountInput.count()) {
            await amountInput.fill("9.87");
          }
          const descInput = page.locator('input[type="text"]').first();
          if (await descInput.count()) {
            await descInput.fill("Audit Expense");
          }
          const saveBtn = page.getByRole("button", { name: /save/i }).first();
          await saveBtn.click();
          await page.waitForTimeout(200);
        });
      }

      if (tab === "expenses") {
        await safeAction("expenses:add", async () => {
          const addExpenseButton =
            (await page.getByRole("button", { name: /add expense/i }).count())
              ? page.getByRole("button", { name: /add expense/i })
              : page.getByRole("button", { name: /add transaction/i });
          if (!(await addExpenseButton.count())) return;
          await addExpenseButton.first().click();
          const amountInput = page.locator('input[type="number"]').first();
          if (await amountInput.count()) {
            await amountInput.fill("9.87");
          }
          const descInput = page.locator('input[type="text"]').first();
          if (await descInput.count()) {
            await descInput.fill("Audit Expense");
          }
          const saveBtn = page.getByRole("button", { name: /save/i }).first();
          await saveBtn.click();
          await page.waitForTimeout(200);
        });
      }

      if (tab === "planner") {
        await safeAction("planner:chartVisible", async () => {
          const chart = page.locator("canvas, svg, [role='img']");
          await chart.first().waitFor({ timeout: 3000 });
        });
        await safeAction("planner:switchMode", async () => {
          const toggleBtn = page.getByRole("button", { name: /actual|projected/i }).first();
          if (await toggleBtn.count()) {
            await toggleBtn.click({ timeout: 2000, force: true });
            await page.waitForTimeout(200);
          }
        });
      }

      if (tab === "settings") {
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(200);

        await safeAction("settings:incomeSchedule:save", async () => {
          const numInputs = page.locator('input[type="number"]');
          if (await numInputs.count()) {
            await numInputs.nth(0).fill("3200");
            if ((await numInputs.count()) > 1) {
              await numInputs.nth(1).fill("1800");
            }
          }
          const saveIncomeBtn = page.getByRole("button", { name: /save income/i });
          if (await saveIncomeBtn.count()) {
            await saveIncomeBtn.first().click();
          }
          await page.waitForTimeout(200);
        });

        await safeAction("settings:accounts:addSave", async () => {
          const addAccount = page.getByRole("button", { name: /add account/i });
          if (await addAccount.count()) {
            await addAccount.first().click();
            const nameInputs = page.locator('input[type="text"]');
            if (await nameInputs.count()) {
              await nameInputs.last().fill("Audit Account");
            }
            const balanceInputs = page.locator('input[type="number"]');
            if (await balanceInputs.count()) {
              await balanceInputs.last().fill("250");
            }
            const saveAccounts = page.getByRole("button", { name: /save accounts/i });
            if (await saveAccounts.count()) {
              await saveAccounts.click();
            }
            await page.waitForTimeout(200);
          }
        });

        await safeAction("settings:profile:roleHousehold", async () => {
          const roleSelect = page.getByLabel(/role/i);
          if (await roleSelect.count()) {
            await roleSelect.selectOption({ index: 0 });
          }
          const householdInput = page.getByLabel(/household id/i);
          if (await householdInput.count()) {
            await householdInput.fill("audit-household");
          }
        });

        await safeAction("settings:goals:addSave", async () => {
          const addGoal = page.getByRole("button", { name: /add goal/i });
          if (await addGoal.count()) {
            await addGoal.first().click();
            const goalName = page.getByRole("textbox", { name: /name/i }).last();
            await goalName.fill("Audit Goal");
            const saveGoals = page.getByRole("button", { name: /save goals/i });
            if (await saveGoals.count()) await saveGoals.click();
          }
        });

        await safeAction("settings:budgets:addSave", async () => {
          const addBudget = page.getByRole("button", { name: /add .*budget/i });
          if (await addBudget.count()) {
            await addBudget.first().click();
            const inputs = page.locator("input");
            const total = await inputs.count();
            if (total > 0) {
              await inputs.nth(total - 1).fill("123");
            }
            const saveBudgets = page.getByRole("button", { name: /save budgets/i });
            if (await saveBudgets.count()) await saveBudgets.click();
          }
        });
      }

      const shotPath = path.join(outDir, `${tab}.png`);
      try {
        await page.waitForTimeout(1200);
        await page.screenshot({ path: shotPath, fullPage: true });
        await expect(page).toHaveScreenshot(`${tab}.png`, {
          fullPage: true,
          animations: "disabled",
          timeout: 15000,
          maxDiffPixels: 2000,
          maxDiffPixelRatio: 0.01,
        });
        actionsLog.push({ name: `screenshot:${tab}`, status: "ok" });
      } catch (err) {
        const msg = err?.message || String(err);
        actionsLog.push({ name: `screenshot:${tab}`, status: "fail", error: msg });
        if (page.isClosed()) break;
      }
    }

    const errors = consoleLogs.filter((l) => l.type === "error");
    expect(errors.length, `Console errors: ${JSON.stringify(errors, null, 2)}`).toBe(0);
    const failedActions = actionsLog.filter((a) => a.status === "fail");
    expect(failedActions.length, `Failed actions: ${JSON.stringify(failedActions, null, 2)}`).toBe(0);
  } finally {
    persistArtifacts();
  }
});
