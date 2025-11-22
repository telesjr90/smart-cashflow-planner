// src/pages/Expenses.jsx
import React, { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Calendar,
  Tag,
  CreditCard,
} from "lucide-react";

/**
 * Central manager for all one‑off expenses.
 *
 * Props:
 *  - expenses: Array of expense objects (id, amount, description, category, date, accountId)
 *  - accounts: Array of account objects with id and name
 *  - onUpdateExpenses: callback when the list of expenses should be replaced
 */
export default function Expenses({
  expenses = [],
  accounts = [],
  onUpdateExpenses,
}) {
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({
    amount: "",
    description: "",
    category: "other",
    date: new Date().toISOString().split("T")[0],
    accountId: accounts[0]?.id || "",
  });

  // Map account ids to names for display
  const accountMap = useMemo(() => {
    const map = {};
    (accounts || []).forEach((acc) => {
      map[acc.id] = acc.name;
    });
    return map;
  }, [accounts]);

  // Start adding a new expense
  const startAdd = () => {
    setEditId("new");
    setDraft({
      amount: "",
      description: "",
      category: "other",
      date: new Date().toISOString().split("T")[0],
      accountId: accounts[0]?.id || "",
    });
  };

  // Start editing an existing expense
  const startEdit = (expense) => {
    setEditId(expense.id);
    setDraft({
      amount: expense.amount != null ? String(expense.amount) : "",
      description: expense.description || "",
      category: expense.category || "other",
      date: expense.date || new Date().toISOString().split("T")[0],
      accountId: expense.accountId || accounts[0]?.id || "",
    });
  };

  // Cancel current add/edit
  const cancelEdit = () => {
    setEditId(null);
    setDraft({
      amount: "",
      description: "",
      category: "other",
      date: new Date().toISOString().split("T")[0],
      accountId: accounts[0]?.id || "",
    });
  };

  const handleSave = () => {
    const amt = parseFloat(draft.amount);
    if (!draft.description || isNaN(amt) || amt <= 0) return;
    let next;
    if (editId === "new") {
      // Create new expense
      const newExp = {
        id: `exp-${Date.now()}`,
        amount: amt,
        description: draft.description,
        category: draft.category || "other",
        date: draft.date,
        accountId: draft.accountId,
        createdAt: new Date().toISOString(),
      };
      next = [...expenses, newExp];
    } else {
      // Update existing
      next = (expenses || []).map((e) =>
        e.id === editId
          ? {
              ...e,
              amount: amt,
              description: draft.description,
              category: draft.category || "other",
              date: draft.date,
              accountId: draft.accountId,
            }
          : e
      );
    }
    if (onUpdateExpenses) onUpdateExpenses(next);
    cancelEdit();
  };

  const handleDelete = (id) => {
    if (!onUpdateExpenses) return;
    const next = (expenses || []).filter((e) => e.id !== id);
    onUpdateExpenses(next);
    if (editId === id) cancelEdit();
  };

  return (
    <div className="min-h-svh bg-slate-50">
      {/* Header */}
      <header className="px-4 pt-4 pb-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="text-slate-700" size={18} />
          <div>
            <div className="text-xs font-semibold text-slate-900">
              Expenses
            </div>
            <div className="text-[11px] text-slate-500">
              View, add, edit or delete your tracked expenses
            </div>
          </div>
        </div>
      </header>
      <section className="px-4 pt-3 pb-20 max-w-md mx-auto space-y-4">
        {/* Add new expense button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={14} /> Add Expense
          </button>
        </div>
        {/* List of expenses */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="divide-y divide-slate-100">
            {/* Editing row for new expense at top */}
            {editId === "new" && (
              <div className="p-3 space-y-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-20 text-slate-500">Date</span>
                  <input
                    type="date"
                    className="flex-1 px-2 py-1 rounded-md border border-slate-200 text-xs"
                    value={draft.date}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-slate-500">Amount</span>
                  <input
                    type="number"
                    step="0.01"
                    className="flex-1 px-2 py-1 rounded-md border border-slate-200 text-xs"
                    placeholder="0.00"
                    value={draft.amount}
                    onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-slate-500">Description</span>
                  <input
                    type="text"
                    className="flex-1 px-2 py-1 rounded-md border border-slate-200 text-xs"
                    placeholder="What was this for?"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-slate-500">Category</span>
                  <select
                    className="flex-1 px-2 py-1 rounded-md border border-slate-200 text-xs bg-white"
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
                <div className="flex items-center gap-2">
                  <span className="w-20 text-slate-500">Account</span>
                  <select
                    className="flex-1 px-2 py-1 rounded-md border border-slate-200 text-xs bg-white"
                    value={draft.accountId}
                    onChange={(e) => setDraft({ ...draft, accountId: e.target.value })}
                  >
                    {(accounts || []).map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="text-xs px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
            {(expenses || []).length === 0 && editId !== "new" && (
              <div className="p-4 text-center text-[11px] text-slate-500">
                No expenses logged yet.
              </div>
            )}
            {/* List existing expenses */}
            {(expenses || []).map((exp) => (
              <div key={exp.id} className="p-3 space-y-1 text-[11px]">
                {editId === exp.id ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-slate-500">Date</span>
                      <input
                        type="date"
                        className="flex-1 px-2 py-1 rounded-md border border-slate-200 text-xs"
                        value={draft.date}
                        onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-slate-500">Amount</span>
                      <input
                        type="number"
                        step="0.01"
                        className="flex-1 px-2 py-1 rounded-md border border-slate-200 text-xs"
                        value={draft.amount}
                        onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-slate-500">Description</span>
                      <input
                        type="text"
                        className="flex-1 px-2 py-1 rounded-md border border-slate-200 text-xs"
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-slate-500">Category</span>
                      <select
                        className="flex-1 px-2 py-1 rounded-md border border-slate-200 text-xs bg-white"
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
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-slate-500">Account</span>
                      <select
                        className="flex-1 px-2 py-1 rounded-md border border-slate-200 text-xs bg-white"
                        value={draft.accountId}
                        onChange={(e) => setDraft({ ...draft, accountId: e.target.value })}
                      >
                        {(accounts || []).map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="text-xs px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Save
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-0.5">
                      <div className="font-medium text-slate-800">
                        {exp.description || exp.category || "Expense"}
                      </div>
                      <div className="text-slate-500">
                        {exp.date} · {exp.category || "other"} · {accountMap[exp.accountId] || ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-slate-800">
                        {new Intl.NumberFormat("en-CA", {
                          style: "currency",
                          currency: "CAD",
                          maximumFractionDigits: 2,
                        }).format(Number(exp.amount) || 0)}
                      </div>
                      <div className="flex gap-1 mt-1 justify-end">
                        <button
                          type="button"
                          onClick={() => startEdit(exp)}
                          className="p-1 text-slate-500 hover:text-slate-700"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(exp.id)}
                          className="p-1 text-slate-500 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}