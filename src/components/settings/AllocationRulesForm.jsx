// File: src/components/settings/AllocationRulesForm.jsx
import React, { useState } from "react";
import { ArrowRightLeft, Plus, Trash2, CheckCircle2 } from "lucide-react";
import ConfirmModal from "../ui/modals/ConfirmModal";
import { useToast } from "../ui/toast/useToast";
// [!code ++] Import UI Kit components
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

/**
 * Income allocation rules configuration card content.
 * Refactored to use UI Kit components for consistent styling.
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
  const { showToast } = useToast();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleDeleteRequest = (rule) => setPendingDelete(rule);

  const handleConfirmDelete = async () => {
    if (!pendingDelete || isDeletingId) return;
    const targetId = pendingDelete.id;
    setIsDeletingId(targetId);
    try {
      await Promise.resolve(onDeleteRule?.(targetId));
      showToast({ type: "success", message: "Allocation rule deleted." });
    } catch (err) {
      console.error("Failed to delete allocation rule", err);
      showToast({ type: "error", message: "Failed to delete allocation rule." });
    } finally {
      setIsDeletingId(null);
      setPendingDelete(null);
    }
  };

  const handleCancelDelete = () => {
    if (isDeletingId) return;
    setPendingDelete(null);
  };

  const handleSaveRulesClick = async () => {
    if (!onSaveRules || saving) return;
    try {
      setSaving(true);
      await Promise.resolve(onSaveRules());
      showToast({ type: "success", message: "Allocation rules saved." });
    } catch (err) {
      console.error("Failed to save allocation rules", err);
      showToast({ type: "error", message: "Failed to save allocation rules." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="text-primary-600" size={20} />
          <h3 className="text-body font-semibold text-surface-900">
            Income allocation rules
          </h3>
        </div>
        <Button
          onClick={onAddRule}
          size="sm"
          variant="primary"
          icon={Plus}
        >
          Add Rule
        </Button>
      </div>

      <div className="bg-surface-50 border border-primary-100 rounded-xl p-3 mb-4">
        <p className="text-caption text-surface-600">
          Automatically distribute income into different accounts when paychecks arrive.
        </p>
      </div>

      {rules.length === 0 && (
        <p className="text-caption text-surface-500 py-4 text-center border border-dashed border-surface-200 rounded-2xl">
          No allocation rules defined yet.
        </p>
      )}

      <div className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            // [!code highlight] Using white background + rounded-2xl to match other forms
            className="p-4 border border-surface-200 rounded-2xl bg-white shadow-sm space-y-3 transition-all hover:border-primary-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-start">
              
              {/* Account selection (Wide) */}
              <div className="sm:col-span-2 lg:col-span-4">
                <Select
                  label="Account"
                  value={rule.accountId || ""}
                  onChange={(e) =>
                    onRuleChange(rule.id, { accountId: e.target.value })
                  }
                >
                  <option value="">Select Account</option>
                  {accounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>
                      {acct.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Type selection */}
              <div className="sm:col-span-1 lg:col-span-2">
                <Select
                  label="Type"
                  value={rule.type}
                  onChange={(e) =>
                    onRuleChange(rule.id, { type: e.target.value })
                  }
                >
                  <option value="percent">Percent</option>
                  <option value="amount">Amount</option>
                </Select>
              </div>

              {/* Value input */}
              <div className="sm:col-span-1 lg:col-span-2">
                <Input
                  label={rule.type === "percent" ? "Percent" : "Amount"}
                  type="number"
                  step="0.01"
                  // Dynamic prefix/suffix based on type
                  prefix={rule.type === "amount" ? "$" : undefined}
                  rightElement={rule.type === "percent" ? "%" : undefined}
                  value={rule.value}
                  onChange={(e) =>
                    onRuleChange(rule.id, {
                      value: e.target.value === "" ? "" : parseFloat(e.target.value),
                    })
                  }
                  placeholder={rule.type === "percent" ? "0" : "0.00"}
                />
              </div>

              {/* Frequency selection */}
              <div className="sm:col-span-1 lg:col-span-2">
                <Select
                  label="Frequency"
                  value={rule.frequency}
                  onChange={(e) =>
                    onRuleChange(rule.id, { frequency: e.target.value })
                  }
                >
                  <option value="each">Every Pay</option>
                  <option value="first">1st Pay</option>
                  <option value="second">2nd Pay</option>
                </Select>
              </div>

              {/* Label */}
              <div className="sm:col-span-1 lg:col-span-2">
                <Input
                  label="Label"
                  value={rule.label || ""}
                  onChange={(e) =>
                    onRuleChange(rule.id, { label: e.target.value })
                  }
                  placeholder="New rule"
                />
              </div>
            </div>

            {/* Delete Action Footer */}
            <div className="flex justify-end pt-2 border-t border-surface-100">
              <Button
                size="sm"
                variant="ghost"
                className="text-danger-500 hover:bg-danger-50 hover:text-danger-600"
                onClick={() => handleDeleteRequest(rule)}
                icon={Trash2}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {(dirtyRules || saving) && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSaveRulesClick}
            variant="primary"
            icon={CheckCircle2}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Rules"}
          </Button>
        </div>
      )}

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete allocation rule?"
        message={
          pendingDelete
            ? `Delete allocation rule "${pendingDelete.label || "this rule"}"?`
            : ""
        }
        confirmLabel={isDeletingId ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        variant="danger"
      />
    </>
  );
}
