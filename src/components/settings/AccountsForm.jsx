// File: src/components/settings/AccountsForm.jsx
import React, { useState } from "react";
import { Wallet, Plus, Trash2, CheckCircle2 } from "lucide-react";
import BulkImportSpreadsheet from "../../components/BulkImportSpreadsheet";
import ConfirmModal from "../ui/modals/ConfirmModal";
import { useToast } from "../ui/toast/useToast";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";

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

  const handleSaveAccountsClick = async () => {
    try {
      await Promise.resolve(onSaveAccounts?.());
      showToast({ type: "success", message: "Accounts saved." });
    } catch (err) {
      console.error("Failed to save accounts", err);
      showToast({ type: "error", message: "Failed to save accounts." });
    }
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
      <Card variant="flat">
        <CardBody className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2" data-testid="accounts-section">
              <Wallet className="text-primary-600" size={18} />
              <div className="text-body font-semibold text-surface-900">Accounts</div>
            </div>
            <Button
              type="button"
              onClick={onAddAccount}
              data-testid="btn-add-account"
              size="sm"
              variant="primary"
              icon={Plus}
            >
              Add account
            </Button>
          </div>

          {accounts.length === 0 && (
            <p className="text-caption text-surface-500">No accounts defined yet.</p>
          )}

          <div className="space-y-3">
            {accounts.map((acct) => {
              const nameError = !String(acct.name || "").trim();
              return (
                <div
                  key={acct.id}
                  className="rounded-2xl border border-surface-200 bg-surface-50 p-3 space-y-2"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                    <div className="space-y-1">
                      <Input
                        label="Name"
                        value={acct.name}
                        onChange={(e) => onAccountChange(acct.id, { name: e.target.value })}
                        data-testid="input-account-name"
                        placeholder="Account name"
                        aria-invalid={nameError}
                        required
                      />
                      {nameError && (
                        <p className="text-caption text-danger-500">Name is required.</p>
                      )}
                    </div>

                    <Select
                      label="Type"
                      value={acct.type}
                      onChange={(e) => onAccountChange(acct.id, { type: e.target.value })}
                    >
                      <option value="deposit">Deposit</option>
                      <option value="savings">Savings</option>
                    </Select>

                    <Input
                      label="Opening balance"
                      type="number"
                      step="0.01"
                      value={acct.openingBalance}
                      onChange={(e) =>
                        onAccountChange(acct.id, {
                          openingBalance: e.target.value === "" ? 0 : parseFloat(e.target.value),
                        })
                      }
                      data-testid="input-account-balance"
                      placeholder="0.00"
                    />

                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-danger-600"
                        onClick={() => handleDeleteRequest(acct)}
                        icon={Trash2}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select
                label="Residual account"
                value={residualAccountId || ""}
                onChange={(e) => onResidualChange(e.target.value)}
                className="min-w-[160px]"
              >
                <option value="">None</option>
                {accounts.map((acct) => (
                  <option key={acct.id} value={acct.id}>
                    {acct.name}
                  </option>
                ))}
              </Select>
            </div>

            {dirtyAccounts && (
              <Button
                type="button"
                onClick={handleSaveAccountsClick}
                data-testid="btn-save-accounts"
                variant="primary"
                size="sm"
                icon={CheckCircle2}
              >
                Save accounts
              </Button>
            )}
          </div>

          {/* Bulk import: accounts + bills from CSV template */}
          <BulkImportSpreadsheet onImport={onBulkImport} />
        </CardBody>
      </Card>

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
