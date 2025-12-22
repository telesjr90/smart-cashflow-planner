import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

export default function BillFormSheet({
  open,
  bill, // null = new mode, object = edit mode
  defaultCategoryKey = "",
  budgetOptions = [],
  accounts = [],
  memberNames = { H: "Partner H", W: "Partner W" },
  userRole = "H",
  isSaving = false,
  isOnline = true,
  onSave,
  onCancel,
}) {
  const [draft, setDraft] = useState({
    name: "",
    amount: "",
    dueDay: 1,
    payer: userRole || "H",
    category: "",
    accountId: "",
  });

  useEffect(() => {
    if (open) {
      if (bill) {
        setDraft({
          id: bill.id,
          name: bill.name || "",
          amount: bill.amount ?? "",
          dueDay: bill.dueDay || 1,
          payer: bill.payer || userRole || "H",
          category: bill.category || defaultCategoryKey,
          accountId: bill.accountId || accounts[0]?.id || "",
        });
      } else {
        setDraft({
          name: "",
          amount: "",
          dueDay: 1,
          payer: userRole || "H",
          category: defaultCategoryKey,
          accountId: accounts[0]?.id || "",
        });
      }
    }
  }, [open, bill, defaultCategoryKey, accounts, userRole]);

  const normalizeAmount = (val) => {
    if (typeof val === "string") {
      const cleaned = val.replace(/[^0-9.-]/g, "");
      const n = Number(cleaned);
      if (!Number.isFinite(n)) return 0;
      return Number(n.toFixed(2));
    }
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    return Number(n.toFixed(2));
  };

  const clampDueDay = (val) => {
    const num = Number.parseInt(val, 10);
    if (!Number.isFinite(num)) return 1;
    return Math.min(31, Math.max(1, num));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isOnline) return;
    const cleanAmount = normalizeAmount(draft.amount);
    const cleanDueDay = clampDueDay(draft.dueDay || 1);
    const safeAccountId = draft.accountId || accounts[0]?.id || "";

    onSave({
      ...draft,
      amount: cleanAmount,
      dueDay: cleanDueDay,
      accountId: safeAccountId,
    });
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity animate-in fade-in duration-200"
        onClick={onCancel}
      />

      <div className="
        pointer-events-auto
        relative w-full bg-surface-50 border border-surface-200 shadow-soft overflow-hidden
        rounded-t-2xl sm:rounded-2xl
        max-w-md sm:m-4
        animate-in slide-in-from-bottom duration-300 sm:zoom-in-95
      ">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h2 className="text-title-l font-semibold text-surface-900">
            {bill ? "Edit Bill" : "New Bill"}
          </h2>
          <button 
            onClick={onCancel}
            className="p-2 rounded-full text-surface-400 hover:bg-surface-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              autoFocus
              placeholder="e.g. Netflix"
              value={draft.name}
              onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
              data-testid="input-bill-name"
              className="rounded-lg"
            />
            <Input
              label="Amount"
              type="number"
              step="0.01"
              prefix="$"
              placeholder="0.00"
              value={draft.amount}
              onChange={(e) => setDraft(d => ({ ...d, amount: e.target.value }))}
              data-testid="input-bill-amount"
              className="rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Day"
              type="number"
              min={1}
              max={31}
              rightElement="of month"
              value={draft.dueDay}
              onChange={(e) => setDraft(d => ({ ...d, dueDay: e.target.value }))}
              data-testid="input-bill-day"
              className="rounded-lg"
            />
            <Select
              label="Payer"
              value={draft.payer}
              onChange={(e) => setDraft(d => ({ ...d, payer: e.target.value }))}
              className="rounded-lg"
            >
              <option value="H">{memberNames.H || "Partner H"}</option>
              <option value="W">{memberNames.W || "Partner W"}</option>
              <option value="AUTO">Auto (Split)</option>
            </Select>
          </div>

          <div className="space-y-4">
            <Select
              label="Category"
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              helperText={
                budgetOptions.length === 0
                  ? "No categories available. Bills will be saved as Uncategorized."
                  : undefined
              }
              className="rounded-lg"
            >
              {budgetOptions.length === 0 ? (
                <option value="uncategorized">Uncategorized</option>
              ) : (
                <>
                  <option value="">Select a category...</option>
                  {budgetOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </>
              )}
            </Select>

            {accounts.length > 0 && (
              <Select
                label="Withdraw From"
                value={draft.accountId}
                onChange={(e) => setDraft((d) => ({ ...d, accountId: e.target.value }))}
                helperText="Select the account this bill draws from."
                className="rounded-lg"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              variant="secondary"
              size="md"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!draft.name || !isOnline}
              data-testid="btn-save-bill"
              variant="primary"
              size="md"
              fullWidth
              isLoading={isSaving}
              icon={isSaving ? Loader2 : undefined}
            >
              {isSaving ? "Saving..." : isOnline ? "Save Bill" : "Offline"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
