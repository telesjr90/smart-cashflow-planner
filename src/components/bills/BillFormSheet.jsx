import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function BillFormSheet({
  open,
  bill, // null = new mode, object = edit mode
  defaultCategoryKey = "",
  budgetOptions = [], // Array of { key, label } for the dropdown
  accounts = [],
  memberNames = { H: "Partner H", W: "Partner W" },
  userRole = "H",
  isSaving = false,
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

  // Reset/Initialize form when opening
  useEffect(() => {
    if (open) {
      if (bill) {
        // Edit Mode
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
        // New Mode
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
    
    // Clean and validate inputs
    const cleanAmount = Number.isFinite(parseFloat(draft.amount)) ? parseFloat(draft.amount) : 0;
    const cleanDueDay = Math.min(31, Math.max(1, parseInt(draft.dueDay || 1, 10)));
    
    // Construct final payload
    const payload = {
      ...draft,
      amount: cleanAmount,
      dueDay: cleanDueDay,
      // If it's a new bill, ID generation usually happens in the parent or store, 
      // but if we are editing, we preserve the ID.
    };

    onSave(payload);
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Modal/Sheet Card */}
      <div className="
        pointer-events-auto
        relative w-full bg-white shadow-xl overflow-hidden
        rounded-t-3xl sm:rounded-2xl
        max-w-md sm:m-4
        animate-in slide-in-from-bottom duration-300 sm:zoom-in-95
      ">
        {/* Header */}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Top Row: Name & Amount */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Name
              </span>
              <input
                autoFocus
                type="text"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="e.g. Netflix"
                value={draft.name}
                onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Amount
              </span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-slate-200 rounded-xl pl-6 pr-3 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="0.00"
                  value={draft.amount}
                  onChange={(e) => setDraft(d => ({ ...d, amount: e.target.value }))}
                />
              </div>
            </label>
          </div>

          {/* Middle Row: Due Day, Payer */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Due Day
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={draft.dueDay}
                  onChange={(e) => setDraft(d => ({ ...d, dueDay: e.target.value }))}
                />
                <span className="text-xs text-slate-400 shrink-0">of month</span>
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Payer
              </span>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={draft.payer}
                onChange={(e) => setDraft(d => ({ ...d, payer: e.target.value }))}
              >
                <option value="H">{memberNames.H || "Partner H"}</option>
                <option value="W">{memberNames.W || "Partner W"}</option>
                <option value="AUTO">Auto (Split)</option>
              </select>
            </label>
          </div>

          {/* Bottom Row: Category & Account */}
          <div className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Category
              </span>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={draft.category}
                onChange={(e) => setDraft(d => ({ ...d, category: e.target.value }))}
              >
                {budgetOptions.length === 0 ? (
                  <option value="">No categories available</option>
                ) : (
                  <>
                    <option value="">Select a category...</option>
                    {budgetOptions.map(opt => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>

            {accounts.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Withdraw From
                </span>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={draft.accountId}
                  onChange={(e) => setDraft(d => ({ ...d, accountId: e.target.value }))}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {/* Actions */}
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
              disabled={isSaving || !draft.name}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {isSaving ? "Saving..." : "Save Bill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}