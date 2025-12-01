// File: src/components/settings/BillSharingForm.jsx
import React from "react";
import { Users2, CheckCircle2 } from "lucide-react";

/**
 * Household bill sharing configuration card content.
 *
 * Controlled by the parent Settings component.
 */
export default function BillSharingForm({
  billSharing,
  dirtyBillSharing,
  onModeChange,
  onPercentageChange,
  onSave,
}) {
  const hPercent = Math.round((billSharing.percentageSplit.H ?? 0.5) * 100);
  const wPercent = Math.round((billSharing.percentageSplit.W ?? 0.5) * 100);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users2 className="text-indigo-500" size={18} />
          <div className="text-sm font-semibold text-slate-900">
            Household bill sharing
          </div>
        </div>
      </div>

      <div className="space-y-2 text-[11px]">
        {/* Mode selection */}
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="bill-sharing-mode"
              value="manual"
              className="h-3 w-3"
              checked={billSharing.mode === "manual"}
              onChange={() => onModeChange("manual")}
            />
            <span>Manual</span>
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="bill-sharing-mode"
              value="percentage"
              className="h-3 w-3"
              checked={billSharing.mode === "percentage"}
              onChange={() => onModeChange("percentage")}
            />
            <span>Percentage split</span>
          </label>
        </div>

        {billSharing.mode === "percentage" && (
          <div className="flex items-center gap-2 mt-2">
            <label className="flex flex-col text-[10px] text-slate-500">
              <span>Partner H share (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                value={hPercent}
                onChange={(e) => onPercentageChange("H", e.target.value)}
              />
            </label>
            <label className="flex flex-col text-[10px] text-slate-500">
              <span>Partner W share (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                value={wPercent}
                onChange={(e) => onPercentageChange("W", e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      {dirtyBillSharing && (
        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
          >
            <CheckCircle2 size={12} /> Save bill sharing
          </button>
        </div>
      )}
    </>
  );
}
