// tests/e2e/helpers/uiAudit.mjs
import fs from "fs";
import path from "path";

export function tsSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export async function ensureAgentDemoReady(page) {
  await page.goto("/?agentDemo=1");
  await page.getByTestId("nav-home").waitFor({ state: "visible", timeout: 15000 });

  // Wait for the demo store handle
  await page.waitForFunction(() => !!window.__cashflowStore?.getState?.(), { timeout: 15000 });

  // Wait for zustand persist hydration (or the fallback demo hydration)
  await page.waitForFunction(() => {
    const store = window.__cashflowStore;
    const s = store?.getState?.();
    return !!s && (s.hasHydrated === true || store?.persist?.hasHydrated?.());
  }, { timeout: 15000 });
}

export async function captureSnapshot(page, { outDir, name }) {
  const pagesDir = path.join(outDir, "pages");
  const stateDir = path.join(outDir, "state");
  ensureDir(pagesDir);
  ensureDir(stateDir);

  const pngPath = path.join(pagesDir, `${name}.png`);
  const jsonPath = path.join(stateDir, `${name}.json`);

  await page.screenshot({ path: pngPath, fullPage: true });

  const payload = await page.evaluate(() => {
    const store = window.__cashflowStore;
    const state = store?.getState?.() ?? null;

    // Light UI headline reads (best-effort, don’t fail if missing)
    const text = (sel) => {
      const el = document.querySelector(sel);
      return el ? (el.textContent || "").trim() : null;
    };

    return {
      url: location.href,
      persisted: localStorage.getItem("cashflow-storage"),
      hasStore: !!store,
      hasState: !!state,
      hasHydrated: state?.hasHydrated ?? null,
      // Full store snapshot for “compare what UI shows vs imported”
      storeState: state,
      // minimal UI “headline” text (optional; screenshot is source of truth)
      uiHints: {
        homeBalanceText: text("main")?.match(/\$[\d,.-]+/)?.[0] ?? null,
      },
    };
  });

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf-8");

  return { name, pngPath, jsonPath, url: payload.url };
}

export function writeAuditLog(outDir, steps) {
  const p = path.join(outDir, "audit-log.json");
  fs.writeFileSync(p, JSON.stringify({ createdAt: new Date().toISOString(), steps }, null, 2), "utf-8");
  return p;
}
