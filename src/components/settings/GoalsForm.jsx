// File: src/components/settings/GoalsForm.jsx
import React, { useState } from "react";
import { Target, Plus, Trash2, CheckCircle2 } from "lucide-react";
import ConfirmModal from "../ui/modals/ConfirmModal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { DateInput } from "../ui/DateInput";
import { useToast } from "../ui/toast/useToast";

/**
 * Goals configuration card content.
 * Refactored to use UI Kit components.
 *
 * onAddGoal is expected to insert a fully initialized goal object.
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
  const [errors, setErrors] = useState({});
  const { showToast } = useToast();
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleAddGoal = () => {
    const defaultGoal = {
      id: crypto.randomUUID(),
      name: "",
      targetAmount: 0,
      perMonth: 0,
      scope: "personal",
      owner: localRole || "H",
      accountId: "",
      contributions: { H: 0, W: 0 },
      startDate: "",
      endDate: "",
      status: "active",
    };
    onAddGoal?.(defaultGoal);
  };

  const validateField = (goalId, field, value) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (field === "name") {
        if (!value || !value.trim()) next[goalId] = { ...(next[goalId] || {}), name: "Name is required." };
        else if (next[goalId]?.name) {
          next[goalId] = { ...(next[goalId] || {}) };
          delete next[goalId].name;
        }
      }
      if (field === "targetAmount") {
        if (!(value > 0)) next[goalId] = { ...(next[goalId] || {}), targetAmount: "Target must be greater than 0." };
        else if (next[goalId]?.targetAmount) {
          next[goalId] = { ...(next[goalId] || {}) };
          delete next[goalId].targetAmount;
        }
      }
      if (next[goalId] && Object.keys(next[goalId]).length === 0) {
        delete next[goalId];
      }
      return next;
    });
  };

  const validateAllGoals = () => {
    const nextErrors = {};
    visibleGoals.forEach((goal) => {
      const goalErrors = {};
      if (!goal.name || !goal.name.trim()) goalErrors.name = "Name is required.";
      if (!(goal.targetAmount > 0)) goalErrors.targetAmount = "Target must be greater than 0.";
      if (Object.keys(goalErrors).length > 0) {
        nextErrors[goal.id] = goalErrors;
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleDeleteRequest = (goal) => setPendingDeleteGoal(goal);

  const handleConfirmDelete = async () => {
    if (!pendingDeleteGoal || deletingId) return;
    setDeletingId(pendingDeleteGoal.id);
    try {
      await Promise.resolve(onDeleteGoal?.(pendingDeleteGoal.id));
      showToast({ type: "success", message: "Goal deleted." });
    } catch (err) {
      console.error("Failed to delete goal", err);
      showToast({ type: "error", message: "Failed to delete goal." });
    } finally {
      setDeletingId(null);
      setPendingDeleteGoal(null);
    }
  };

  const handleCancelDelete = () => {
    if (deletingId) return;
    setPendingDeleteGoal(null);
  };

  const handleSaveGoalsClick = async () => {
    const valid = validateAllGoals();
    if (!valid) {
      showToast({ type: "error", message: "Please fix validation errors before saving." });
      return;
    }
    try {
      await Promise.resolve(onSaveGoals?.());
      showToast({ type: "success", message: "Goals saved." });
      setErrors({});
    } catch (err) {
      console.error("Failed to save goals", err);
      showToast({ type: "error", message: "Failed to save goals." });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="text-indigo-500" size={20} />
          <h3 className="text-body font-semibold text-surface-900">Goals</h3>
        </div>
        <Button
          onClick={handleAddGoal}
          size="sm"
          variant="primary"
          icon={Plus}
          data-testid="btn-add-goal"
        >
          Add Goal
        </Button>
      </div>

      {visibleGoals.length === 0 && (
        <p className="text-caption text-surface-500 py-4 text-center border border-dashed border-surface-200 rounded-2xl">
          No goals defined yet. Add one to start tracking.
        </p>
      )}

      <div className="space-y-4">
        {visibleGoals.map((goal) => {
          const sharedTotal = (Number(goal.contributions?.H) || 0) + (Number(goal.contributions?.W) || 0);
          return (
          <div
            key={goal.id}
            data-testid={`goal-card-${goal.id}`}
            className="p-4 border border-surface-200 rounded-2xl bg-surface-50 space-y-4 transition-all hover:border-primary-200"
          >
            {/* Top Row: Name, Target, Monthly */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div data-testid="input-group-goal-name">
                <Input
                  label="Name"
                  value={goal.name}
                  onChange={(e) => {
                    onGoalChange(goal.id, { name: e.target.value });
                    validateField(goal.id, "name", e.target.value);
                  }}
                  onBlur={(e) => validateField(goal.id, "name", e.target.value)}
                  placeholder="e.g. New Car"
                  error={errors[goal.id]?.name}
                  aria-invalid={Boolean(errors[goal.id]?.name)}
                />
              </div>

              <div data-testid="input-group-goal-target">
                <Input
                  label="Target Amount"
                  type="number"
                  step="0.01"
                  prefix="$"
                  value={goal.targetAmount}
                  onChange={(e) => {
                    const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
                    onGoalChange(goal.id, {
                      targetAmount: value,
                    });
                    validateField(goal.id, "targetAmount", value);
                  }}
                  onBlur={(e) => validateField(goal.id, "targetAmount", parseFloat(e.target.value))}
                  placeholder="0.00"
                  error={errors[goal.id]?.targetAmount}
                  aria-invalid={Boolean(errors[goal.id]?.targetAmount)}
                />
              </div>

              {goal.scope === "personal" ? (
                <Input
                  label="Monthly Contribution"
                  type="number"
                  step="0.01"
                  prefix="$"
                  value={goal.perMonth}
                  onChange={(e) => onGoalPerMonthChange(goal.id, e.target.value)}
                  placeholder="0.00"
                />
              ) : (
                <div className="space-y-1">
                  <span className="block text-tiny font-semibold uppercase tracking-wide text-surface-500">
                    Monthly Total
                  </span>
                  <div className="h-11 px-4 flex items-center bg-surface-100 rounded-2xl text-body font-semibold text-surface-700">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(sharedTotal)}
                  </div>
                </div>
              )}
            </div>

            {/* Middle Row: Scope, Account, Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Scope"
                value={goal.scope}
                onChange={(e) => onGoalScopeChange(goal.id, e.target.value)}
              >
                <option value="personal">Personal</option>
                <option value="shared">Shared</option>
              </Select>

              {goal.scope === "personal" && (
                <Select
                  label="Owner"
                  value={goal.owner || ""}
                  onChange={(e) => onGoalChange(goal.id, { owner: e.target.value || null })}
                >
                  <option value="">Select Owner</option>
                  <option value="H">Partner H</option>
                  <option value="W">Partner W</option>
                </Select>
              )}

              <Select
                label="Link Account"
                value={goal.accountId || ""}
                onChange={(e) => onGoalChange(goal.id, { accountId: e.target.value || null })}
              >
                <option value="">None (Virtual)</option>
                {localAccounts.map((acct) => (
                  <option key={acct.id} value={acct.id}>
                    {acct.name}
                  </option>
                ))}
              </Select>

              <DateInput
                label="Target Date"
                value={goal.endDate || ""}
                onChange={(val) => onGoalChange(goal.id, { endDate: val })}
              />
            </div>

            {/* Shared Contributions Row */}
            {goal.scope === "shared" && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-surface-100/50 rounded-xl border border-surface-200/50">
                <Input
                  label="Partner H Contribution"
                  type="number"
                  step="0.01"
                  prefix="$"
                  size="sm"
                  value={goal.contributions?.H ?? 0}
                  onChange={(e) => onGoalContributionChange(goal.id, "H", e.target.value)}
                />
                <Input
                  label="Partner W Contribution"
                  type="number"
                  step="0.01"
                  prefix="$"
                  size="sm"
                  value={goal.contributions?.W ?? 0}
                  onChange={(e) => onGoalContributionChange(goal.id, "W", e.target.value)}
                />
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-200/50">
              {goal.status === "pending" && goal.pendingFor === localRole && (
                <>
                  <Button
                    size="sm"
                    variant="primary" // Changed to primary for accept to match UI Kit better, or define a 'success' variant if available
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => onGoalApproval(goal.id, "accept")}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onGoalApproval(goal.id, "reject")}
                  >
                    Reject
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-danger-500 hover:bg-danger-50 hover:text-danger-600"
                onClick={() => handleDeleteRequest(goal)}
                icon={Trash2}
              >
                Delete
              </Button>
            </div>
          </div>
        );
        })}
      </div>

      {dirtyGoals && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSaveGoalsClick}
            variant="primary"
            icon={CheckCircle2}
            data-testid="btn-save-goals"
          >
            Save Goals
          </Button>
        </div>
      )}

      <ConfirmModal
        open={Boolean(pendingDeleteGoal)}
        title="Delete goal?"
        message={pendingDeleteGoal ? `Delete goal "${pendingDeleteGoal.name || "this goal"}"?` : ""}
        confirmLabel={deletingId ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        variant="danger"
      />
    </>
  );
}
