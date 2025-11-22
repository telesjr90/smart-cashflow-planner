// src/components/AddExpenseModal.jsx
import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Calendar, Tag, CreditCard } from "lucide-react";

export default function AddExpenseModal({ isOpen, onClose, onSave, accounts = [] }) {
  const [draft, setDraft] = useState({
    amount: "",
    description: "",
    category: "other",
    date: new Date().toISOString().split("T")[0],
    accountId: accounts[0]?.id || "",
  });

  // Reset account default when accounts load or modal opens
  useEffect(() => {
    if (isOpen && accounts.length > 0 && !draft.accountId) {
      setDraft(prev => ({ ...prev, accountId: accounts[0].id }));
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const amt = parseFloat(draft.amount);
    if (!draft.description || isNaN(amt) || amt <= 0) return;

    onSave({
      id: `exp-${Date.now()}`,
      amount: amt,
      description: draft.description,
      category: draft.category || "other",
      date: draft.date,
      accountId: draft.accountId,
      createdAt: new Date().toISOString(),
    });

    // Reset fields
    setDraft({
      amount: "",
      description: "",
      category: "other",
      date: new Date().toISOString().split("T")[0],
      accountId: accounts[0]?.id || "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-900">Log Expense</h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-4 space-y-4">
          
          {/* Amount */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-semibold">$</span>
              <input
                type="number"
                step="0.01"
                autoFocus
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-lg font-bold text-slate-900 placeholder-slate-300 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">
              Description
            </label>
            <input
              type="text"
              placeholder="What was this for?"
              className="w-full px-3 py-2 text-sm text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Calendar size={12} /> Date
              </label>
              <input
                type="date"
                className="w-full px-2 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Tag size={12} /> Category
              </label>
              <select
                className="w-full px-2 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                <option value="other">Other</option>
                <option value="groceries">Groceries</option>
                <option value="dining">Dining Out</option>
                <option value="transport">Transport</option>
                <option value="entertainment">Entertainment</option>
                <option value="shopping">Shopping</option>
                <option value="health">Health</option>
                <option value="utilities">Utilities</option>
              </select>
            </div>
          </div>

          <div>
             <label className="block text-[10px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                <CreditCard size={12} /> Paid from
              </label>
              <select
                className="w-full px-2 py-2 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white"
                value={draft.accountId}
                onChange={(e) => setDraft({ ...draft, accountId: e.target.value })}
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
          </div>

          <button
            type="submit"
            disabled={!draft.amount || !draft.description}
            className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle2 size={16} />
            Save Expense
          </button>
        </form>
      </div>
    </div>
  );
}