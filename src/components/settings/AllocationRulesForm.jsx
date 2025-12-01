// File: src/components/settings/AllocationRulesForm.jsx
import React from "react";
import { ArrowRightLeft, Plus, Trash2, CheckCircle2 } from "lucide-react";

/**
 * Income allocation rules configuration card content.
 *
 * Controlled by the parent Settings component.
 */
export default function AllocationRulesForm({
  rules,
  accounts,
  dirtyRules,
  onAddRule,
  onRuleChange,
  onDeleteRule,
  onSaveRules,
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="text-indigo-500" size={18} />
          <div className="text-sm font-semibold text-slate-900">
            Income allocation rules
          </div>
        </div>
        <button
          type="button"
          onClick={onAddRule}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={12} /> Add rule
        </button>
      </div>

      {rules.length === 0 && (
        <p className="text-xs text-slate-500">No rules defined yet.</p>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-2 border border-slate-200 rounded-lg bg-slate-50"
          >
            <div className="grid grid-cols-6 gap-2 items-center">
              {/* Account selection */}
              <label className="flex flex-col text-[10px] text-slate-500">
                <span>Account</span>
                <select
                  className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                  value={rule.accountId || ""}
                  onChange={(e) =>
                    onRuleChange(rule.id, { accountId: e.target.value })
                  }
                >
                  <option value="">Select</option>
                  {accounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>
                      {acct.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Type selection */}
              <label className="flex flex-col text-[10px] text-slate-500">
                <span>Type</span>
                <select
                  className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                  value={rule.type}
                  onChange={(e) =>
                    onRuleChange(rule.id, { type: e.target.value })
                  }
                >
                  <option value="percent">Percent</option>
                  <option value="amount">Amount</option>
                </select>
              </label>

              {/* Value input */}
              <label className="flex flex-col text-[10px] text-slate-500">
                <span>{rule.type === "percent" ? "Percent" : "Amount"}</span>
                <input
                  type="number"
                  step="0.01"
                  className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                  value={rule.value}
                  onChange={(e) =>
                    onRuleChange(rule.id, {
                      value:
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                    })
                  }
                  placeholder={rule.type === "percent" ? "0" : "0.00"}
                />
              </label>

              {/* Frequency selection */}
              <label className="flex flex-col text-[10px] text-slate-500">
                <span>Frequency</span>
                <select
                  className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                  value={rule.frequency}
                  onChange={(e) =>
                    onRuleChange(rule.id, { frequency: e.target.value })
                  }
                >
                  <option value="each">Each</option>
                  <option value="first">First</option>
                  <option value="second">Second</option>
                </select>
              </label>

              {/* Label */}
              <label className="flex flex-col text-[10px] text-slate-500">
                <span>Label</span>
                <input
                  type="text"
                  className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                  value={rule.label || ""}
                  onChange={(e) =>
                    onRuleChange(rule.id, { label: e.target.value })
                  }
                  placeholder="Description"
                />
              </label>

              {/* Delete button */}
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700"
                  onClick={() => onDeleteRule(rule.id)}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {dirtyRules && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onSaveRules}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
          >
            <CheckCircle2 size={12} /> Save rules
          </button>
        </div>
      )}
    </>
  );
}
