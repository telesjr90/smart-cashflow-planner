// File: src/components/settings/BudgetsForm.jsx
import React, { useState } from "react";
import { PieChart, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { useToast } from "../ui/toast/useToast";

/**
 * Budgets configuration card content.
 * Refactored to use UI Kit components.
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
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSaveBudgets = async () => {
    if (!onSaveBudgets || saving) return;
    try {
      setSaving(true);
      await Promise.resolve(onSaveBudgets());
      showToast({ type: "success", message: "Budgets updated." });
    } catch (err) {
      console.error("Failed to save budgets", err);
      showToast({ type: "error", message: "Failed to save budgets." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="text-primary-600" size={20} />
          <h3 className="text-body font-semibold text-surface-900">Budgets</h3>
        </div>
        <Button
          onClick={onAddBudgetCategory}
          size="sm"
          variant="primary"
          icon={Plus}
          data-testid="btn-add-budget"
        >
          Add Category
        </Button>
      </div>

      <div className="bg-surface-50 border border-primary-100 rounded-xl p-3 mb-4">
        <p className="text-caption text-surface-600">
          These budgets track monthly spending limits for transaction categories. They are shared across the household by default.
        </p>
      </div>

      {visibleBudgets.length === 0 && (
        <p className="text-caption text-surface-500 py-4 text-center border border-dashed border-surface-200 rounded-2xl">
          No budget categories defined yet.
        </p>
      )}

      <div className="space-y-3">
        {visibleBudgets.map(({ key, label, amount, scope, owner, accountId }) => (
          <div
            key={key}
            data-testid={`budget-item-${key}`}
            className="p-4 border border-surface-200 rounded-2xl bg-white shadow-sm space-y-3 transition-all hover:border-primary-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div data-testid="input-group-budget-name">
                <Input
                  label="Category Name"
                  value={label}
                  onChange={(e) => onBudgetChange(key, { label: e.target.value })}
                  placeholder="e.g. Groceries"
                />
              </div>
              
              <div data-testid="input-group-budget-limit">
                <Input
                  label="Monthly Limit"
                  type="number"
                  step="0.01"
                  prefix="$"
                  value={amount}
                  onChange={(e) =>
                    onBudgetChange(key, {
                      amount: e.target.value === "" ? "" : parseFloat(e.target.value),
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Scope"
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
              </Select>

              {scope === "personal" && (
                <Select
                  label="Owner"
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
                </Select>
              )}

              <Select
                label="Linked Account"
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
              </Select>
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-100">
              <Button
                size="sm"
                variant="ghost"
                className="text-danger-500 hover:bg-danger-50 hover:text-danger-600"
                onClick={() => onDeleteBudget(key)}
                icon={Trash2}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {(dirtyBudgets || saving) && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSaveBudgets}
            variant="primary"
            icon={CheckCircle2}
            data-testid="btn-save-budgets"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Budgets"}
          </Button>
        </div>
      )}
    </>
  );
}
