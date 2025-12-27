import React, { useState } from "react";
import { Wallet, CheckCircle2 } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useToast } from "../ui/toast/useToast";

export default function StartingBalanceCard({
  startingBalance,
  dirtyStartingBalance,
  onStartingBalanceChange,
  onSaveStartingBalance,
}) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      await Promise.resolve(onSaveStartingBalance?.());
      showToast({ type: "success", message: "Starting balance saved." });
    } catch (err) {
      console.error("Failed to save starting balance", err);
      showToast({ type: "error", message: "Failed to save starting balance." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="text-indigo-500" size={18} />
          <div className="text-sm font-semibold text-slate-900">
            Plan starting balance
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mb-1">
        Set the starting cash balance of your plan. You can change it anytime;
        we save it to your household profile.
      </p>

      <div className="mt-2 text-[11px]">
        <Input
          label="Starting balance"
          type="number"
          step="0.01"
          value={
            startingBalance === "" || startingBalance == null
              ? ""
              : startingBalance
          }
          onChange={(e) => onStartingBalanceChange(e.target.value)}
        />
      </div>

      {(dirtyStartingBalance || saving) && (
        <div className="mt-3 flex items-center justify-end">
          <Button
            type="button"
            onClick={handleSave}
            variant="primary"
            size="sm"
            icon={CheckCircle2}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </>
  );
}
