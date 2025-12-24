// File: src/components/settings/IncomeScheduleForm.jsx
import React, { useCallback, useMemo, useState } from "react";
import { Wallet, CheckCircle2 } from "lucide-react";

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

  /**
   * Convert the stored day2 value into a safe string for the <select> element.
   *
   * The parent Settings component stores day2 as either a number or the string
   * "last". We normalize undefined/null to "last" and coerce numbers to
   * strings to ensure the <select> always receives a string value that matches
   * one of the option values. This avoids React warnings about mixing
   * controlled/uncontrolled inputs and allows the parent to decide on types.
   */
  const day2Value = useMemo(() => {
    const raw = schedule?.day2;
    if (raw === "last" || raw == null) return "last";
    return String(raw);
  }, [schedule?.day2]);

  const handleSave = useCallback(async () => {
    if (!onSaveIncomeSchedule) return;
    try {
      setSaving(true);
      await onSaveIncomeSchedule();
    } finally {
      setSaving(false);
    }
  }, [onSaveIncomeSchedule]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="text-indigo-500" size={18} />
          <div className="text-sm font-semibold text-slate-900">
            Household income &amp; pay schedule
          </div>
        </div>

        {(dirtyIncomeSchedule || saving) && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            data-testid="save-income-btn"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={12} /> {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>

      <div className="space-y-3 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <div className="text-slate-500">Partner H income (per paycheque)</div>
          <input
            type="number"
            step="0.01"
            className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
            // When the parent store holds an empty string to represent "cleared" input, show it as blank.
            value={income?.husband === "" ? "" : String(income?.husband ?? "")}
            // Pass raw string value to the parent. The parent is responsible for casting to number.
            onChange={(e) => onIncomeChange("husband", e.target.value)}
            data-testid="input-income-husband"
            aria-label="Partner H income (per paycheque)"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-slate-500">Partner W income (per paycheque)</div>
          <input
            type="number"
            step="0.01"
            className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
            value={income?.wife === "" ? "" : String(income?.wife ?? "")}
            onChange={(e) => onIncomeChange("wife", e.target.value)}
            data-testid="input-income-wife"
            aria-label="Partner W income (per paycheque)"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-slate-500">Pay schedule</div>
            <div className="text-xs font-medium text-slate-700">Semi-monthly</div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-slate-500">First pay date (day)</div>
            <input
              type="number"
              min={1}
              max={28}
              className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
              value={
                schedule?.day1 === "" || schedule?.day1 === null || schedule?.day1 === undefined
                  ? ""
                  : String(schedule?.day1)
              }
              // Pass raw string to parent; parent handles casting to number when saving.
              onChange={(e) => onScheduleChange("day1", e.target.value)}
              data-testid="input-pay-day1"
              aria-label="First pay date (day)"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-slate-500">Second pay date</div>
            <select
              className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
              value={day2Value}
              // Provide raw select value ("last", "15", "30") to the parent. Parent converts to number or keeps as "last".
              onChange={(e) => onScheduleChange("day2", e.target.value)}
              data-testid="select-pay-day2"
              aria-label="Second pay date"
            >
              <option value="last">Last day of month</option>
              <option value="15">15</option>
              <option value="30">30</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
