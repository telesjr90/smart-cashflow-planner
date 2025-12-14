import { test, expect } from '@playwright/test';

// --- Helpers ---

async function readProjectedBalance(page) {
  // Finds the "Projected Cash Flow" card and reads the value (e.g. "$5,000.00")
  // Adjust selector based on your exact Home.jsx rendering
  const label = page.getByText(/Projected Cash Flow/i);
  await expect(label).toBeVisible();
  
  // Assuming the value is in a heading or sibling element nearby
  // We look for a currency-like value nearby
  const card = label.locator('xpath=ancestor::div[contains(@class, "Card")]').first();
  const text = await card.textContent();
  return parseCurrencyToNumber(text);
}

function parseCurrencyToNumber(text = '') {
  // Remove non-numeric chars except dot and minus
  const cleaned = text.replace(/[^0-9.-]+/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

async function createAccount(page, name, balance) {
  await page.getByTestId('nav-settings').click();
  
  // Settings usually renders sections directly or via tabs. 
  // Based on your code, AccountsForm is rendered in Settings.
  const addBtn = page.getByRole('button', { name: /Add account/i });
  await addBtn.scrollIntoViewIfNeeded();
  await addBtn.click();

  // Fill the last added account row
  await page.locator('input[placeholder="Account name"]').last().fill(name);
  await page.locator('input[placeholder="0.00"]').last().fill(balance.toString());

  const saveBtn = page.getByRole('button', { name: /Save accounts/i });
  await saveBtn.click();
  await saveBtn.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
}

async function createBudgetCategory(page, name, limit) {
  await page.getByTestId('nav-settings').click();
  
  // Click "Budgets" button if it's a section navigation or scroll to it
  // Assuming Settings.jsx renders sections vertically:
  const addBtn = page.getByRole('button', { name: /Add category/i });
  await addBtn.scrollIntoViewIfNeeded();
  await addBtn.click();

  await page.locator('input[placeholder="Category name"]').last().fill(name);
  await page.locator('input[placeholder="0.00"]').last().fill(limit.toString());

  const saveBtn = page.getByRole('button', { name: /Save budgets/i });
  await saveBtn.click();
  await saveBtn.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
}

// --- Tests ---

test.describe('Expanded Functional Regression (agentDemo)', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start with a clean demo state
    await page.goto('/?agentDemo=1');
    await expect(page.getByText('Smart Cash Flow')).toBeVisible();
  });

  test('R.1 Accounts & Cashflow: Adding account and bill updates projected balance', async ({ page }) => {
    // 1. Initial State
    await page.getByTestId('nav-home').click();
    const initialBalance = await readProjectedBalance(page);
    
    // 2. Add Account
    const accountAmt = 5000;
    await createAccount(page, 'Regression Bank', accountAmt);

    // 3. Verify Account Impact
    await page.getByTestId('nav-home').click();
    const balanceAfterAccount = await readProjectedBalance(page);
    
    expect(balanceAfterAccount).toBeCloseTo(initialBalance + accountAmt, 0.1);

    // 4. Add Bill
    const billAmt = 150;
    await page.getByTestId('nav-bills').click();
    
    // Use the "Add bill" icon button in header or empty state
    // We try generic locator for the "+" button or text
    const addBillBtn = page.getByLabel('Add bill').or(page.getByRole('button', { name: /\+/ }));
    await addBillBtn.first().click();

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    
    await modal.getByLabel('Name').fill('Regression Bill');
    await modal.getByLabel('Amount').fill(billAmt.toString());
    
    // Ensure we pick the account we just created if possible, or leave default
    // We assume default logic works (first account)
    
    await modal.getByRole('button', { name: /Save Bill/i }).click();
    await expect(modal).toBeHidden();

    // 5. Verify Bill Impact (Liability reduces projected cash)
    await page.getByTestId('nav-home').click();
    const finalBalance = await readProjectedBalance(page);

    // Projected balance should be (Start + Account - Bill)
    // Note: If today is AFTER due date and it's unpaid, it deducts. 
    // Demo sets startDate to today, Bill default due day is 1. 
    // If today is day 15, Bill due day 1 is past due -> deducted.
    expect(finalBalance).toBeCloseTo(balanceAfterAccount - billAmt, 0.1);
  });

  test('R.2 Goals: Create goal and verify persistence', async ({ page }) => {
    await page.getByTestId('nav-settings').click();
    
    // Scroll to Goals section
    const addGoalBtn = page.getByRole('button', { name: /Add goal/i });
    await addGoalBtn.scrollIntoViewIfNeeded();
    await addGoalBtn.click();

    // Fill Goal Form (Input labels might be inferred or placeholders)
    // Goal Name
    await page.locator('input[value="New goal"]').last().fill('Tesla Fund');
    
    // Target Amount (look for next number input or placeholders)
    // Assuming structure based on GoalsForm.jsx logic:
    // We might need to rely on order if labels aren't explicit in the list
    // Let's try filling by placeholder if standard inputs don't match
    const inputs = page.locator('section').filter({ hasText: 'Household goals' }).locator('input[type="number"]');
    
    // Target amount is usually the first number input in the row, Monthly is second
    await inputs.nth(-2).fill('50000'); // Target
    await inputs.last().fill('500');   // Monthly

    const saveBtn = page.getByRole('button', { name: /Save goals/i });
    await saveBtn.click();
    await saveBtn.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});

    // Verify on Home Page (if goals widget exists) or Reload Settings
    await page.reload();
    await page.getByTestId('nav-settings').click();
    await expect(page.getByDisplayValue('Tesla Fund')).toBeVisible();
    await expect(page.getByDisplayValue('50000')).toBeVisible();
  });

  test('R.3 Budgets: Create category and track spending', async ({ page }) => {
    const catName = 'Ramen';
    const limit = 100;
    const spent = 25;

    // 1. Create Budget
    await createBudgetCategory(page, catName, limit);

    // 2. Verify on Home
    await page.getByTestId('nav-home').click();
    // Look for text "Ramen" and "$100" (formatted)
    await expect(page.getByText(catName)).toBeVisible();
    
    // 3. Add Expense
    await page.getByTestId('nav-add').click();
    const modal = page.locator('div[role="dialog"]'); // or generic fixed wrapper
    await modal.getByLabel('Amount').fill(spent.toString());
    await modal.getByLabel('Description').fill('Lunch');
    await modal.getByLabel('Category').selectOption({ label: catName });
    await modal.getByRole('button', { name: /Save transaction/i }).click();

    // 4. Verify Update
    // The budget card should now show progress. 
    // We verify the remaining amount or spent amount if visible text allows.
    // E.g. "$25 of $100" or similar.
    await expect(page.getByText(catName)).toBeVisible();
    
    // Check if we can find the values near the category name
    const budgetCard = page.locator('div').filter({ hasText: catName }).last();
    // We expect to see formatted $25.00 somewhere in there
    await expect(budgetCard).toContainText('$25.00'); 
  });

  test('R.4 Allocation Rules: Create and persist rule', async ({ page }) => {
    await page.getByTestId('nav-settings').click();
    
    const addRuleBtn = page.getByRole('button', { name: /Add rule/i });
    await addRuleBtn.scrollIntoViewIfNeeded();
    await addRuleBtn.click();

    // Fill Rule
    // Label "New rule" -> "Save 20%"
    await page.locator('input[value="New rule"]').last().fill('Save 20%');
    
    // Value -> 20
    const valInput = page.locator('section').filter({ hasText: 'Allocation Rules' }).locator('input[type="number"]').last();
    await valInput.fill('20');

    const saveBtn = page.getByRole('button', { name: /Save rules/i });
    await saveBtn.click();
    
    // Reload to verify persistence
    await page.reload();
    await page.getByTestId('nav-settings').click();
    await expect(page.getByDisplayValue('Save 20%')).toBeVisible();
    await expect(page.getByDisplayValue('20')).toBeVisible();
  });

  test('R.5 Accounts Page: Verify listing', async ({ page }) => {
    await createAccount(page, 'Investment A', 1234.56);
    
    await page.getByTestId('nav-accounts').click();
    
    // Verify header
    await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible();
    
    // Verify new account card
    await expect(page.getByText('Investment A')).toBeVisible();
    await expect(page.getByText('$1,234.56')).toBeVisible();
  });

});