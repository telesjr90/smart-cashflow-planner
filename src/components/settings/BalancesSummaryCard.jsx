import React from "react";
import { Wallet } from "lucide-react";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

export default function BalancesSummaryCard({ total, husband, wife }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="text-indigo-500" size={18} />
        <div className="text-sm font-semibold text-slate-900">
          Current Balances (manual)
        </div>
      </div>
      <Row label="Household total" value={total} />
      <Row label="Partner H share" value={husband} />
      <Row label="Partner W share" value={wife} />
    </>
  );
}
