// File: src/components/settings/AccountsForm.jsx
import React, { useState } from "react";
import { Wallet, Plus, Trash2, CheckCircle2 } from "lucide-react";
import BulkImportSpreadsheet from "../../components/BulkImportSpreadsheet";
import ConfirmModal from "../ui/modals/ConfirmModal";
import { useToast } from "../ui/toast/useToast";

/**
 * Accounts configuration card.
 *
 * Controlled by the parent (Settings), which owns localAccounts / residualId
 * and the various handlers. This component is purely presentational.
 */
export default function AccountsForm({
  accounts,
  residualAccountId,
  dirtyAccounts,
  onAddAccount,
  onAccountChange,
  onDeleteAccount,
  onResidualChange,
  onSaveAccounts,
  onBulkImport,
}) {
  const { showToast } = useToast();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteRequest = (acct) => {
    setPendingDelete(acct);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deletingId) return;
    setDeletingId(pendingDelete.id);
    try {
      await Promise.resolve(onDeleteAccount?.(pendingDelete.id));
      showToast({ type: "success", message: "Account deleted." });
    } catch (err) {
      console.error("Failed to delete account", err);
      showToast({ type: "error", message: "Failed to delete account." });
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const handleCancelDelete = () => {
    if (deletingId) return;
    setPendingDelete(null);
  };

  return (
    <section className="mt-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="text-indigo-500" size={18} />
            <div className="text-sm font-semibold text-slate-900">Accounts</div>
          </div>
          <button
            type="button"
            onClick={onAddAccount}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={12} /> Add account
          </button>
        </div>

        {accounts.length === 0 && (
          <p className="text-xs text-slate-500">No accounts defined yet.</p>
        )}

        <div className="space-y-3">
          {accounts.map((acct) => (
            <div
              key={acct.id}
              className="p-2 border border-slate-200 rounded-lg bg-slate-50"
            >
              <div className="grid grid-cols-4 gap-2 items-center">
                <label className="flex flex-col text-[10px] text-slate-500">
                  <span>Name</span>
                  <input
                    type="text"
                    className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                    value={acct.name}
                    onChange={(e) =>
                      onAccountChange(acct.id, { name: e.target.value })
                    }
                    placeholder="Account name"
                  />
                </label>

                <label className="flex flex-col text-[10px] text-slate-500">
                  <span>Type</span>
                  <select
                    className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                    value={acct.type}
                    onChange={(e) =>
                      onAccountChange(acct.id, { type: e.target.value })
                    }
                  >
                    <option value="deposit">Deposit</option>
                    <option value="savings">Savings</option>
                  </select>
                </label>

                <label className="flex flex-col text-[10px] text-slate-500">
                  <span>Opening balance</span>
                  <input
                    type="number"
                    step="0.01"
                    className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
                    value={acct.openingBalance}
                    onChange={(e) =>
                      onAccountChange(acct.id, {
                        openingBalance:
                          e.target.value === ""
                            ? 0
                            : parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                  />
                </label>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700"
                    onClick={() => handleDeleteRequest(acct)}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Residual account</span>
            <select
              className="border border-slate-200 rounded-md px-2 py-1 text-[11px]"
              value={residualAccountId || ""}
              onChange={(e) => onResidualChange(e.target.value)}
            >
              <option value="">None</option>
              {accounts.map((acct) => (
                <option key={acct.id} value={acct.id}>
                  {acct.name}
                </option>
              ))}
            </select>
          </div>

          {dirtyAccounts && (
            <button
              type="button"
              onClick={onSaveAccounts}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
            >
              <CheckCircle2 size={12} /> Save accounts
            </button>
          )}
        </div>

        {/* Bulk import: accounts + bills from CSV template */}
        <BulkImportSpreadsheet onImport={onBulkImport} />
      </div>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete account?"
        message={
          pendingDelete
            ? `Delete account "${pendingDelete.name || "this account"}"?`
            : ""
        }
        confirmLabel={deletingId ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        variant="danger"
      />
    </section>
  );
}
