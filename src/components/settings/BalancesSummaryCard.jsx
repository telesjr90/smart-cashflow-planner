import React from "react";
import { Wallet } from "lucide-react";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[11px]">
      <span className="text-surface-500">{label}</span>
      <span className="font-medium text-surface-900">{value}</span>
    </div>
  );
}

export default function BalancesSummaryCard({ total, husband, wife }) {
  const showPartners = (Number(husband) || 0) !== 0 || (Number(wife) || 0) !== 0;

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600">
          <Wallet size={16} />
        </div>
        <div className="text-body font-semibold text-surface-900">
          Current Balances (manual)
        </div>
      </div>
      <Row label="Household total" value={total} />
      {showPartners && (
        <div className="mt-2 text-caption text-surface-500">
          Partner breakdown shown only when provided.
        </div>
      )}
      {showPartners && (
        <>
          <Row label="Partner A" value={husband} />
          <Row label="Partner B" value={wife} />
        </>
      )}
    </>
  );
}
