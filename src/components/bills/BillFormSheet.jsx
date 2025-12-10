import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

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
    payer: "H",
    category: "",
    accountId: ""
  });

  useEffect(() => {
    if (open) {
      if (bill) {
        setDraft({
          id: bill.id,
          name: bill.name || "",
          amount: bill.amount ?? "",
          dueDay: bill.dueDay || 1,
          payer: bill.payer || "H",
          category: bill.category || defaultCategoryKey,
          accountId: bill.accountId || (accounts[0]?.id || "")
        });
      } else {
        setDraft({
          name: "",
          amount: "",
          dueDay: 1,
          payer: userRole || "H",
          category: defaultCategoryKey,
          accountId: accounts[0]?.id || ""
        });
      }
    }
  }, [open, bill, defaultCategoryKey, accounts, userRole]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isOnline) return;
    const cleanAmount = Number.isFinite(parseFloat(draft.amount)) ? parseFloat(draft.amount) : 0;
    const cleanDueDay = Math.min(31, Math.max(1, parseInt(draft.dueDay || 1, 10)));
    
    onSave({
      ...draft,
      amount: cleanAmount,
      dueDay: cleanDueDay,
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
        relative w-full bg-white shadow-xl overflow-hidden
        rounded-t-3xl sm:rounded-2xl
        max-w-md sm:m-4
        animate-in slide-in-from-bottom duration-300 sm:zoom-in-95
      ">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">
            {bill ? "Edit Bill" : "New Bill"}
          </h2>
          <button 
            onClick={onCancel}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              autoFocus
              placeholder="e.g. Netflix"
              value={draft.name}
              onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
            />
            <Input
              label="Amount"
              type="number"
              step="0.01"
              prefix="$"
              placeholder="0.00"
              value={draft.amount}
              onChange={(e) => setDraft(d => ({ ...d, amount: e.target.value }))}
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
            />
            <Select
              label="Payer"
              value={draft.payer}
              onChange={(e) => setDraft(d => ({ ...d, payer: e.target.value }))}
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
              onChange={(e) => setDraft(d => ({ ...d, category: e.target.value }))}
            >
              {budgetOptions.length === 0 ? (
                <option value="">No categories available</option>
              ) : (
                <>
                  <option value="">Select a category...</option>
                  {budgetOptions.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </>
              )}
            </Select>

            {accounts.length > 0 && (
              <Select
                label="Withdraw From"
                value={draft.accountId}
                onChange={(e) => setDraft(d => ({ ...d, accountId: e.target.value }))}
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </Select>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !draft.name || !isOnline}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {isSaving ? "Saving..." : isOnline ? "Save Bill" : "Offline"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
