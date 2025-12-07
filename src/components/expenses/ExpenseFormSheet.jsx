import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar } from 'lucide-react';
import { CATEGORY_LIST } from '../../lib/categories';

export default function ExpenseFormSheet({
  open,
  expense, // null = new mode, object = edit mode
  accounts = [],
  isSaving = false,
  onSave,
  onCancel,
}) {
  // Default State
  const [draft, setDraft] = useState({
    amount: "",
    description: "",
    category: "food",
    date: new Date().toISOString().slice(0, 10),
    accountId: "",
    type: "expense" // 'expense' | 'income'
  });

  // Initialize form when opening
  useEffect(() => {
    if (open) {
      if (expense) {
        // Edit Mode
        setDraft({
          id: expense.id,
          amount: expense.amount ?? "",
          description: expense.description || "",
          category: expense.category || "other",
          date: expense.date || new Date().toISOString().slice(0, 10),
          accountId: expense.accountId || (accounts[0]?.id || ""),
          type: expense.type || "expense",
          createdAt: expense.createdAt // preserve creation date
        });
      } else {
        // New Mode
        setDraft({
          amount: "",
          description: "",
          category: "food",
          date: new Date().toISOString().slice(0, 10),
          accountId: accounts[0]?.id || "",
          type: "expense"
        });
      }
    }
  }, [open, expense, accounts]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const cleanAmount = Number.isFinite(parseFloat(draft.amount)) ? parseFloat(draft.amount) : 0;
    
    const payload = {
      ...draft,
      amount: cleanAmount,
      // Ensure date is a string YYYY-MM-DD
      date: draft.date || new Date().toISOString().slice(0, 10),
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
            {expense ? "Edit Transaction" : "New Transaction"}
          </h2>
          <button 
            onClick={onCancel}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Type Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setDraft(d => ({ ...d, type: 'expense' }))}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${draft.type === 'expense' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setDraft(d => ({ ...d, type: 'income' }))}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${draft.type === 'income' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Income
            </button>
          </div>

          {/* Amount & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">$</span>
                <input
                  type="number"
                  step="0.01"
                  autoFocus={!expense}
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-3 text-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="0.00"
                  value={draft.amount}
                  onChange={(e) => setDraft(d => ({ ...d, amount: e.target.value }))}
                />
              </div>
            </div>

            <label className="block">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Description
              </span>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="What is this for?"
                value={draft.description}
                onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
              />
            </label>
          </div>

          {/* Grid: Category, Date, Account */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Category
              </span>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={draft.category}
                onChange={(e) => setDraft(d => ({ ...d, category: e.target.value }))}
              >
                {CATEGORY_LIST.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Date
              </span>
              <div className="relative">
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-xl pl-3 pr-2 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={draft.date}
                  onChange={(e) => setDraft(d => ({ ...d, date: e.target.value }))}
                />
              </div>
            </label>

            {accounts.length > 0 && (
              <label className="col-span-2 flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Account
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
              disabled={isSaving || !draft.amount}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}