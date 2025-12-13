import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import TransactionForm, { buildDefaultFormValues } from "./transactions/TransactionForm";
import { useCashflowStore } from "../store/useCashflowStore";
import { useToast } from "./ui/toast/useToast";
import { ModalShell } from "./ui/modals/ModalShell.jsx";

export default function AddTransactionModal({ isOpen, onClose, onSave, isOnline = true }) {
  const accounts = useCashflowStore((state) => state.accounts || []);
  const categoryBudgets = useCashflowStore((state) => state.categoryBudgets || {});
  const updateExpenses = useCashflowStore((state) => state.updateExpenses);
  const expenses = useCashflowStore((state) => state.expenses || []);
  const { showToast } = useToast();

  const categories = useMemo(() => {
    const entries = Object.entries(categoryBudgets).map(([id, cfg]) => ({
      id,
      name: cfg?.label || id,
    }));
    return entries.length ? entries : [];
  }, [categoryBudgets]);

  const [formValues, setFormValues] = useState(() =>
    buildDefaultFormValues({
      categoryId: categories[0]?.id || "",
      accountId: accounts[0]?.id || "",
    })
  );

  useEffect(() => {
    if (!isOpen) return;
    setFormValues((prev) =>
      buildDefaultFormValues({
        ...prev,
        categoryId: prev.categoryId || categories[0]?.id || "",
        accountId: prev.accountId || accounts[0]?.id || "",
      })
    );
  }, [isOpen, categories, accounts]);

  if (!isOpen) return null;

  const handleSubmit = (payload) => {
    const next = [...expenses, payload];
    updateExpenses(next);
    onSave?.(payload);
    showToast({ type: "success", message: "Transaction added." });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      {/** Use ModalShell for surface + spacing; hide built-in header to inject a header row with aligned close button */}
      <ModalShell
        title="Add Transaction"
        className="relative w-full max-w-md overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[100dvh] sm:max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h2 className="text-title-l font-bold text-surface-900">Add Transaction</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto">
          <TransactionForm
            values={formValues}
            onChange={setFormValues}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            accounts={accounts}
            categories={categories}
            isOnline={isOnline}
          />
        </div>
      </ModalShell>
    </div>
  );
}
