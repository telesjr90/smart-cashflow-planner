// File: src/components/settings/BillSharingForm.jsx
import React, { useState } from "react";
import { Users2, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { useToast } from "../ui/toast/useToast";

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
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const hPercent = Math.round((billSharing.percentageSplit.H ?? 0.5) * 100);
  const wPercent = Math.round((billSharing.percentageSplit.W ?? 0.5) * 100);

  const handleSave = async () => {
    if (!onSave || saving) return;
    try {
      setSaving(true);
      await Promise.resolve(onSave());
      showToast({ type: "success", message: "Bill sharing saved." });
    } catch (err) {
      console.error("Failed to save bill sharing", err);
      showToast({ type: "error", message: "Failed to save bill sharing." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <Users2 className="text-primary-600" size={18} />
        <div className="text-body font-semibold text-surface-900">Household bill sharing</div>
      </div>

      <div className="rounded-2xl border border-surface-200 p-4 space-y-3 bg-surface-50">
        <Select
          label="Mode"
          value={billSharing.mode}
          onChange={(e) => onModeChange(e.target.value)}
        >
          <option value="manual">Manual</option>
          <option value="percentage">Percentage split</option>
        </Select>

        {billSharing.mode === "percentage" && (
          <div className="space-y-2">
            <p className="text-caption text-surface-500">Set each partner&rsquo;s share (must total 100%).</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Partner H share (%)"
                type="number"
                min={0}
                max={100}
                value={hPercent}
                onChange={(e) => onPercentageChange("H", e.target.value)}
              />
              <Input
                label="Partner W share (%)"
                type="number"
                min={0}
                max={100}
                value={wPercent}
                onChange={(e) => onPercentageChange("W", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {(dirtyBillSharing || saving) && (
        <div className="mt-3 flex items-center justify-end">
          <Button type="button" onClick={handleSave} size="sm" variant="primary" icon={CheckCircle2} disabled={saving}>
            {saving ? "Saving..." : "Save bill sharing"}
          </Button>
        </div>
      )}
    </>
  );
}
