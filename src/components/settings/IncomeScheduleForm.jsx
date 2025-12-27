// File: src/components/settings/IncomeScheduleForm.jsx
import React, { useCallback, useMemo, useState } from "react";
import { Wallet, CheckCircle2 } from "lucide-react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { useToast } from "../ui/toast/useToast";

/**
 * Household income and pay schedule card content.
 *
 * Controlled by the parent Settings component.
 */
export default function IncomeScheduleForm({
  income,
  schedule,
  dirtyIncomeSchedule,
  onIncomeChange,
  onScheduleChange,
  onSaveIncomeSchedule,
}) {
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  /**
   * Convert the stored day2 value into a safe string for the <select> element.
   *
   * The parent Settings component stores day2 as either a number or the string
   * "last". We normalize undefined/null to "last" and coerce numbers to
   * strings to ensure the <select> always receives a string value that matches
   * one of the option values.
   */
  const day2Value = useMemo(() => {
    const raw = schedule?.day2;
    if (raw === "last" || raw == null) return "last";
    return String(raw);
  }, [schedule?.day2]);

  const handleSave = useCallback(async () => {
    if (!onSaveIncomeSchedule || saving) return;
    try {
      setSaving(true);
      await Promise.resolve(onSaveIncomeSchedule());
      showToast({ type: "success", message: "Income & schedule saved." });
    } catch (err) {
      console.error("Failed to save income & schedule", err);
      showToast({ type: "error", message: "Failed to save income & schedule." });
    } finally {
      setSaving(false);
    }
  }, [onSaveIncomeSchedule, saving, showToast]);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="text-indigo-500" size={18} />
          <div className="text-sm font-semibold text-slate-900">
            Household income &amp; pay schedule
          </div>
        </div>

        {(dirtyIncomeSchedule || saving) && (
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            data-testid="save-income-btn"
            variant="primary"
            size="sm"
            icon={CheckCircle2}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>

      <div className="space-y-3 text-[11px]">
        <Input
          label="Partner H income (per paycheque)"
          type="number"
          step="0.01"
          prefix="$"
          value={income?.husband === "" ? "" : String(income?.husband ?? "")}
          onChange={(e) => onIncomeChange("husband", e.target.value)}
          data-testid="input-income-husband"
        />

        <Input
          label="Partner W income (per paycheque)"
          type="number"
          step="0.01"
          prefix="$"
          value={income?.wife === "" ? "" : String(income?.wife ?? "")}
          onChange={(e) => onIncomeChange("wife", e.target.value)}
          data-testid="input-income-wife"
        />

        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-slate-500">Pay schedule</div>
            <div className="text-xs font-medium text-slate-700">Semi-monthly</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="First pay date (day)"
              type="number"
              min={1}
              max={28}
              value={
                schedule?.day1 === "" || schedule?.day1 === null || schedule?.day1 === undefined
                  ? ""
                  : String(schedule?.day1)
              }
              onChange={(e) => onScheduleChange("day1", e.target.value)}
              data-testid="input-pay-day1"
            />

            <Select
              label="Second pay date"
              value={day2Value}
              onChange={(e) => onScheduleChange("day2", e.target.value)}
              data-testid="select-pay-day2"
            >
              <option value="last">Last day of month</option>
              <option value="15">15</option>
              <option value="30">30</option>
            </Select>
          </div>
        </div>
      </div>
    </>
  );
}
