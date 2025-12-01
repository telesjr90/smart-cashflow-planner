import React from "react";
import { Wallet, CheckCircle2 } from "lucide-react";

export default function StartingBalanceCard({
  startingBalance,
  dirtyStartingBalance,
  onStartingBalanceChange,
  onSaveStartingBalance,
}) {
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

      <div className="flex items-center justify-between gap-2 mt-2 text-[11px]">
        <label htmlFor="starting-balance" className="text-slate-500">
          Starting balance
        </label>
        <input
          id="starting-balance"
          type="number"
          step="0.01"
          className="w-32 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
          value={
            startingBalance === "" || startingBalance == null
              ? ""
              : startingBalance
          }
          onChange={(e) => onStartingBalanceChange(e.target.value)}
        />
      </div>

      {dirtyStartingBalance && (
        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={onSaveStartingBalance}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
          >
            <CheckCircle2 size={12} /> Save
          </button>
        </div>
      )}
    </>
  );
}
