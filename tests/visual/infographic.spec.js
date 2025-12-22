import { test, expect } from "@playwright/test";

const DEMO_ENTRY = "/?agentDemo=1";

async function setScope(page, target) {
  const targetLabel =
    target === "household"
      ? /Scope:\s*Household total/i
      : /Scope:\s*Your share/i;

  // Try clicking any visible scope control or label to open a selector
  const toggles = [
    page.getByRole("button", { name: /scope/i }).first(),
    page.getByText(/Scope:/i).first(),
  ];

  for (const toggle of toggles) {
    if (await toggle.isVisible({ timeout: 1000 }).catch(() => false)) {
      await toggle.click().catch(() => {});
      const option =
        target === "household"
          ? page.getByText(/Household total|Household/i).first()
          : page.getByText(/Your share|Self/i).first();
      if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
        await option.click().catch(() => {});
      }
    }
    if (await page.getByText(targetLabel).isVisible({ timeout: 500 }).catch(() => false)) {
      return;
    }
  }

  await expect(page.getByText(targetLabel)).toBeVisible({ timeout: 5000 });
}

test.describe("Infographic Visuals", () => {
  test("captures self and household scopes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.clear());

    await page.goto("/planner" + DEMO_ENTRY);

    await expect(
      page.getByRole("heading", { level: 2, name: "Financial Analysis" })
    ).toBeVisible({ timeout: 30000 });

    const infographicHeading = page.getByText(/Cashflow Infographic/i).first();
    await infographicHeading.scrollIntoViewIfNeeded();
    const infographicSection = page
      .locator("div")
      .filter({ has: infographicHeading })
      .first();

    // Self scope (default)
    await setScope(page, "self");
    await expect(page.getByText(/Scope:\s*Your share/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(150);
    await expect(infographicSection).toHaveScreenshot("visual--infographic--self.png", {
      maxDiffPixelRatio: 0.01,
    });

    // Household scope
    await setScope(page, "household");
    await expect(page.getByText(/Scope:\s*Household total/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(200);
    await expect(infographicSection).toHaveScreenshot("visual--infographic--household.png", {
      maxDiffPixelRatio: 0.01,
    });
  });
});
