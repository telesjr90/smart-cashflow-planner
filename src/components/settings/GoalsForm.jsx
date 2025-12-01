// File: src/components/settings/GoalsForm.jsx
import React from "react";
import { Target, Plus, Trash2, CheckCircle2 } from "lucide-react";

/**
 * Goals configuration card content.
 *
 * This component is fully controlled by the parent (Settings).
 * It assumes it is wrapped by a Card with padding.
 */
export default function GoalsForm({
  visibleGoals,
  localRole,
  localAccounts,
  dirtyGoals,
  onAddGoal,
  onGoalChange,
  onGoalPerMonthChange,
  onGoalScopeChange,
  onGoalContributionChange,
  onGoalApproval,
  onDeleteGoal,
  onSaveGoals,
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="text-indigo-500" size={18} />
          <div className="text-sm font-semibold text-slate-900">Goals</div>
        </div>
        <button
          type="button"
          onClick={onAddGoal}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={12} /> Add goal
        </button>
      </div>

      {visibleGoals.length === 0 && (
        <p className="text-xs text-slate-500">No goals defined yet.</p>
      )}

      <div className="space-y-3">
        {visibleGoals.map((goal) => (
          <div
            key={goal.id}
            className="p-2 border border-slate-200 rounded-lg bg-slate-50 space-y-2"
          >
            {/* First row: name, target amount, contribution/perMonth display and delete */}
            <div className="grid grid-cols-4 gap-2 items-center">
              <label className="flex flex-col text-[10px] text-slate-500">
                <span>Name</span>
                <input
                  type="text"
                  className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                  value={goal.name}
                  onChange={(e) =>
                    onGoalChange(goal.id, { name: e.target.value })
                  }
                  placeholder="Goal name"
                />
              </label>

              <label className="flex flex-col text-[10px] text-slate-500">
                <span>Target amount</span>
                <input
                  type="number"
                  step="0.01"
                  className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                  value={goal.targetAmount}
                  onChange={(e) =>
                    onGoalChange(goal.id, {
                      targetAmount:
                        e.target.value === "" ? 0 : parseFloat(e.target.value),
                    })
                  }
                  placeholder="0.00"
                />
              </label>

              {goal.scope === "personal" ? (
                <label className="flex flex-col text-[10px] text-slate-500">
                  <span>Monthly contribution</span>
                  <input
                    type="number"
                    step="0.01"
                    className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                    value={goal.perMonth}
                    onChange={(e) =>
                      onGoalPerMonthChange(goal.id, e.target.value)
                    }
                    placeholder="0.00"
                  />
                </label>
              ) : (
                <div className="flex flex-col text-[10px] text-slate-500">
                  <span>Monthly total</span>
                  <span className="text-[11px] text-slate-800">
                    {goal.perMonth ?? 0}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-1">
                {/* Accept / reject for pending goals when applicable */}
                {goal.status === "pending" && goal.pendingFor === localRole ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onGoalApproval(goal.id, "accept")}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-700"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => onGoalApproval(goal.id, "reject")}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-rose-700"
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700"
                  onClick={() => onDeleteGoal(goal.id)}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>

            {/* Second row: scope, owner (for personal), account, dates, and partner contributions if shared */}
            <div className="grid grid-cols-6 gap-2 items-center">
              {/* Scope selector */}
              <label className="flex flex-col text-[10px] text-slate-500 col-span-2">
                <span>Scope</span>
                <select
                  className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                  value={goal.scope}
                  onChange={(e) =>
                    onGoalScopeChange(goal.id, e.target.value)
                  }
                >
                  <option value="personal">Personal</option>
                  <option value="shared">Shared</option>
                </select>
              </label>

              {/* Owner selector for personal goals */}
              {goal.scope === "personal" && (
                <label className="flex flex-col text-[10px] text-slate-500">
                  <span>Owner</span>
                  <select
                    className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                    value={goal.owner || ""}
                    onChange={(e) =>
                      onGoalChange(goal.id, {
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

              {/* Account attachment */}
              <label className="flex flex-col text-[10px] text-slate-500">
                <span>Account</span>
                <select
                  className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                  value={goal.accountId || ""}
                  onChange={(e) =>
                    onGoalChange(goal.id, { accountId: e.target.value || null })
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

              {/* Start date */}
              <label className="flex flex-col text-[10px] text-slate-500">
                <span>Start date</span>
                <input
                  type="date"
                  className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                  value={goal.startDate || ""}
                  onChange={(e) =>
                    onGoalChange(goal.id, { startDate: e.target.value })
                  }
                />
              </label>

              {/* End/target date */}
              <label className="flex flex-col text-[10px] text-slate-500">
                <span>Target date</span>
                <input
                  type="date"
                  className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                  value={goal.endDate || ""}
                  onChange={(e) =>
                    onGoalChange(goal.id, { endDate: e.target.value })
                  }
                />
              </label>

              {/* Shared contributions (only when shared) */}
              {goal.scope === "shared" && (
                <>
                  <label className="flex flex-col text-[10px] text-slate-500">
                    <span>Partner H share</span>
                    <input
                      type="number"
                      step="0.01"
                      className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                      value={goal.contributions?.H ?? 0}
                      onChange={(e) =>
                        onGoalContributionChange(goal.id, "H", e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </label>
                  <label className="flex flex-col text-[10px] text-slate-500">
                    <span>Partner W share</span>
                    <input
                      type="number"
                      step="0.01"
                      className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                      value={goal.contributions?.W ?? 0}
                      onChange={(e) =>
                        onGoalContributionChange(goal.id, "W", e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {dirtyGoals && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onSaveGoals}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
          >
            <CheckCircle2 size={12} /> Save goals
          </button>
        </div>
      )}
    </>
  );
}
