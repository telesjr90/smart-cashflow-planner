import React, { useMemo, useState, useEffect } from "react";
import { X } from "lucide-react";
import TransactionForm, {
  buildDefaultFormValues,
  transactionToFormValues,
} from "../transactions/TransactionForm";
import { useCashflowStore } from "../../store/useCashflowStore";
import { useToast } from "../ui/toast/useToast";
import { ModalShell } from "../ui/modals/ModalShell.jsx";

export default function ExpenseFormSheet({
  open,
  expense,
  accounts: accountsProp = [],
  categories: categoriesProp = [],
  isSaving = false,
  onSave,
  onCancel,
}) {
  const accountsFromStore = useCashflowStore((state) => state.accounts || []);
  const categoryBudgets = useCashflowStore((state) => state.categoryBudgets || {});
  const updateExpenses = useCashflowStore((state) => state.updateExpenses);
  const expenses = useCashflowStore((state) => state.expenses || []);
  const { showToast } = useToast();

  const accounts = accountsProp.length ? accountsProp : accountsFromStore;
  const categories = useMemo(() => {
    if (categoriesProp.length) return categoriesProp;
    const entries = Object.entries(categoryBudgets).map(([id, cfg]) => ({
      id,
      name: cfg?.label || id,
    }));
    return entries.length ? entries : [];
  }, [categoriesProp, categoryBudgets]);

  const [formValues, setFormValues] = useState(() =>
    expense
      ? transactionToFormValues(expense)
      : buildDefaultFormValues({
          categoryId: categories[0]?.id || "",
          accountId: accounts[0]?.id || "",
        })
  );

  useEffect(() => {
    if (!open) return;
    setFormValues(() =>
      expense
        ? transactionToFormValues(expense)
        : buildDefaultFormValues({
            categoryId: categories[0]?.id || "",
            accountId: accounts[0]?.id || "",
          })
    );
  }, [open, expense, categories, accounts]);

  if (!open) return null;

  const handleSubmit = (payload) => {
    const isEdit = Boolean(expense?.id);
    const next = isEdit
      ? expenses.map((tx) => (tx.id === expense.id ? { ...payload, id: expense.id } : tx))
      : [...expenses, payload];

    updateExpenses(next);
    onSave?.(payload);
    showToast({ type: "success", message: isEdit ? "Transaction updated." : "Transaction added." });
    onCancel?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity animate-in fade-in duration-200"
        onClick={onCancel}
      />

      <ModalShell
        title={expense ? "Edit Transaction" : "New Transaction"}
        className="pointer-events-auto relative w-full max-w-md overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[100dvh] sm:max-h-[90vh] flex flex-col sm:m-4"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h2 className="text-title-l font-bold text-surface-900">
            {expense ? "Edit Transaction" : "New Transaction"}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-full text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <TransactionForm
            values={formValues}
            onChange={setFormValues}
            onSubmit={handleSubmit}
            onCancel={onCancel}
            accounts={accounts}
            categories={categories}
            isOnline
            isSaving={isSaving}
          />
        </div>
      </ModalShell>
    </div>
  );
}
