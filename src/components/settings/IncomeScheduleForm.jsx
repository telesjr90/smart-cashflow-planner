// File: src/components/settings/IncomeScheduleForm.jsx
import React from "react";
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
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="text-indigo-500" size={18} />
          <div className="text-sm font-semibold text-slate-900">
            Household income &amp; pay schedule
          </div>
        </div>
        {dirtyIncomeSchedule && (
          <button
            type="button"
            onClick={onSaveIncomeSchedule}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCircle2 size={12} /> Save
          </button>
        )}
      </div>

      <div className="space-y-3 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <div className="text-slate-500">
            Partner H income (per paycheque)
          </div>
          <input
            type="number"
            step="0.01"
            className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
            value={income.husband === "" ? "" : income.husband}
            onChange={(e) => onIncomeChange("husband", e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-slate-500">
            Partner W income (per paycheque)
          </div>
          <input
            type="number"
            step="0.01"
            className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
            value={income.wife === "" ? "" : income.wife}
            onChange={(e) => onIncomeChange("wife", e.target.value)}
          />
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-slate-500">Pay schedule</div>
            <div className="text-xs font-medium text-slate-700">
              Semi-monthly
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-slate-500">First pay date (day)</div>
            <input
              type="number"
              min={1}
              max={28}
              className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
              value={schedule.day1}
              onChange={(e) =>
                onScheduleChange("day1", Number(e.target.value))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-slate-500">Second pay date</div>
            <select
              className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
              value={schedule.day2}
              onChange={(e) => onScheduleChange("day2", e.target.value)}
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
