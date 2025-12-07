import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { CATEGORY_LIST } from '../../lib/categories';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export default function ExpenseFormSheet({
  open,
  expense,
  accounts = [],
  isSaving = false,
  onSave,
  onCancel,
}) {
  const [draft, setDraft] = useState({
    amount: "",
    description: "",
    category: "food",
    date: new Date().toISOString().slice(0, 10),
    accountId: "",
    type: "expense"
  });

  useEffect(() => {
    if (open) {
      if (expense) {
        setDraft({
          id: expense.id,
          amount: expense.amount ?? "",
          description: expense.description || "",
          category: expense.category || "other",
          date: expense.date || new Date().toISOString().slice(0, 10),
          accountId: expense.accountId || (accounts[0]?.id || ""),
          type: expense.type || "expense",
          createdAt: expense.createdAt
        });
      } else {
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
    onSave({
      ...draft,
      amount: cleanAmount,
      date: draft.date || new Date().toISOString().slice(0, 10),
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

          <div className="space-y-4">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              autoFocus={!expense}
              prefix="$"
              placeholder="0.00"
              className="pl-8 py-3 text-2xl font-bold"
              value={draft.amount}
              onChange={(e) => setDraft(d => ({ ...d, amount: e.target.value }))}
            />

            <Input
              label="Description"
              placeholder="What is this for?"
              value={draft.description}
              onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={draft.category}
              onChange={(e) => setDraft(d => ({ ...d, category: e.target.value }))}
            >
              {CATEGORY_LIST.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </Select>

            <Input
              label="Date"
              type="date"
              value={draft.date}
              onChange={(e) => setDraft(d => ({ ...d, date: e.target.value }))}
            />

            {accounts.length > 0 && (
              <div className="col-span-2">
                <Select
                  label="Account"
                  value={draft.accountId}
                  onChange={(e) => setDraft(d => ({ ...d, accountId: e.target.value }))}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </Select>
              </div>
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