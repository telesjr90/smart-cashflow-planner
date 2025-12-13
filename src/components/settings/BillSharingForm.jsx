// File: src/components/settings/BillSharingForm.jsx
import React from "react";
import { Users2, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/Button";

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
      <div className="flex items-center gap-2 mb-3">
        <Users2 className="text-primary-600" size={18} />
        <div className="text-body font-semibold text-surface-900">Household bill sharing</div>
      </div>

      <div className="rounded-2xl border border-surface-200 divide-y divide-surface-200 overflow-hidden">
        <label
          className="flex items-center justify-between py-3 px-4 hover:bg-surface-50 transition-colors cursor-pointer"
          onClick={() => onModeChange("manual")}
        >
          <div className="text-body text-surface-900">Manual</div>
          <input
            type="radio"
            name="bill-sharing-mode"
            value="manual"
            className="h-4 w-4"
            checked={billSharing.mode === "manual"}
            onChange={() => onModeChange("manual")}
          />
        </label>

        <label
          className="flex items-center justify-between py-3 px-4 hover:bg-surface-50 transition-colors cursor-pointer"
          onClick={() => onModeChange("percentage")}
        >
          <div className="text-body text-surface-900">Percentage split</div>
          <input
            type="radio"
            name="bill-sharing-mode"
            value="percentage"
            className="h-4 w-4"
            checked={billSharing.mode === "percentage"}
            onChange={() => onModeChange("percentage")}
          />
        </label>

        {billSharing.mode === "percentage" && (
          <div className="py-3 px-4 hover:bg-surface-50 transition-colors space-y-2">
            <p className="text-caption text-surface-500">Set each partner&rsquo;s share (must total 100%).</p>
            <div className="flex items-center gap-3">
              <label className="flex flex-col gap-1 text-caption text-surface-500">
                <span className="text-caption text-surface-500">Partner H share (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-24 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-body text-surface-900"
                  value={hPercent}
                  onChange={(e) => onPercentageChange("H", e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-caption text-surface-500">
                <span className="text-caption text-surface-500">Partner W share (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-24 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-body text-surface-900"
                  value={wPercent}
                  onChange={(e) => onPercentageChange("W", e.target.value)}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {dirtyBillSharing && (
        <div className="mt-3 flex items-center justify-end">
          <Button type="button" onClick={onSave} size="sm" variant="primary" icon={CheckCircle2}>
            Save bill sharing
          </Button>
        </div>
      )}
    </>
  );
}
