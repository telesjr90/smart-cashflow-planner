// File: src/components/settings/BudgetsForm.jsx
import React from "react";
import { PieChart, Plus, Trash2, CheckCircle2 } from "lucide-react";

/**
 * Budgets configuration card content.
 *
 * Controlled by the parent (Settings). It assumes it is wrapped by a Card.
 */
export default function BudgetsForm({
  visibleBudgets,
  localRole,
  localAccounts,
  dirtyBudgets,
  onAddBudgetCategory,
  onBudgetChange,
  onDeleteBudget,
  onSaveBudgets,
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PieChart className="text-indigo-500" size={18} />
          <div className="text-sm font-semibold text-slate-900">Budgets</div>
        </div>
        <button
          type="button"
          onClick={onAddBudgetCategory}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={12} /> Add category
        </button>
      </div>

      {/* Helper text */}
      <p className="text-[11px] text-slate-500 mb-2">
        These category budgets are shared across your household. If you and your
        partner use different spending cards, you can still track them together
        here.
      </p>

      {visibleBudgets.length === 0 && (
        <p className="text-xs text-slate-500">
          No budget categories defined yet.
        </p>
      )}

      <div className="space-y-3">
        {visibleBudgets.map(
          ({ key, label, amount, scope, owner, accountId }) => (
            <div
              key={key}
              className="p-2 border border-slate-200 rounded-lg bg-slate-50"
            >
              <div className="grid grid-cols-4 gap-2 items-center">
                {/* Category name */}
                <label className="flex flex-col text-[10px] text-slate-500">
                  <span>Category</span>
                  <input
                    type="text"
                    className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                    value={label}
                    onChange={(e) =>
                      onBudgetChange(key, { label: e.target.value })
                    }
                    placeholder="Category name"
                  />
                </label>

                {/* Amount */}
                <label className="flex flex-col text-[10px] text-slate-500">
                  <span>Amount</span>
                  <input
                    type="number"
                    step="0.01"
                    className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                    value={amount}
                    onChange={(e) =>
                      onBudgetChange(key, {
                        amount:
                          e.target.value === "" ? "" : parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                  />
                </label>

                {/* Scope + owner (for personal) */}
                <div className="flex flex-col gap-1 text-[10px] text-slate-500">
                  <label className="flex flex-col">
                    <span>Scope</span>
                    <select
                      className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                      value={scope || "shared"}
                      onChange={(e) => {
                        const nextScope = e.target.value;
                        const updates =
                          nextScope === "personal"
                            ? {
                                scope: "personal",
                                owner:
                                  owner ||
                                  (localRole === "H" || localRole === "W"
                                    ? localRole
                                    : "H"),
                              }
                            : {
                                scope: "shared",
                                owner: null,
                              };
                        onBudgetChange(key, updates);
                      }}
                    >
                      <option value="shared">Shared</option>
                      <option value="personal">Personal</option>
                    </select>
                  </label>
                  {scope === "personal" && (
                    <label className="flex flex-col">
                      <span>Owner</span>
                      <select
                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                        value={owner || ""}
                        onChange={(e) =>
                          onBudgetChange(key, {
                            owner: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Select</option>
                        <option value="H">Partner H</option>
                        <option value="W">Partner W</option>
                      </select>
                    </label>
                  )}
                </div>

                {/* Account + delete */}
                <div className="flex flex-col items-end justify-between gap-1">
                  <label className="flex flex-col text-[10px] text-slate-500 w-full">
                    <span>Account</span>
                    <select
                      className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                      value={accountId || ""}
                      onChange={(e) =>
                        onBudgetChange(key, {
                          accountId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">None</option>
                      {localAccounts.map((acct) => (
                        <option key={acct.id} value={acct.id}>
                          {acct.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700"
                    onClick={() => onDeleteBudget(key)}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {dirtyBudgets && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onSaveBudgets}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
          >
            <CheckCircle2 size={12} /> Save budgets
          </button>
        </div>
      )}
    </>
  );
}
