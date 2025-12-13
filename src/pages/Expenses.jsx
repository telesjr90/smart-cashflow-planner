import React, { useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';

// Hooks & Libs
import { useCashflowStore } from '../store/useCashflowStore';
import useCashflowData from '../hooks/useCashflowData';
import { getCategory } from '../lib/categories';
import { formatDateLong } from '../utils/dateFormat';
import { formatCurrency } from '../lib/cashflow/formatters';
import ConfirmModal from '../components/ui/modals/ConfirmModal';
import { useToast } from '../components/ui/toast/useToast';

// Components
import { TransactionRow } from '../components/ui/TransactionRow';
import ExpenseFormSheet from '../components/expenses/ExpenseFormSheet';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Expenses() {
  // 1. Connect to Store
  const expenses = useCashflowStore((state) => state.expenses || []);
  const accounts = useCashflowStore((state) => state.accounts || []);
  const { handleUpdateExpenses } = useCashflowData();
  const { showToast } = useToast();

  // 2. UI State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeletingId, setIsDeletingId] = useState(null);

  // 3. Group expenses by Date
  const groupedExpenses = useMemo(() => {
    return expenses.reduce((acc, expense) => {
      const date = expense.date || 'Unknown Date';
      if (!acc[date]) acc[date] = [];
      acc[date].push(expense);
      return acc;
    }, {});
  }, [expenses]);

  // 4. Sort dates descending
  const sortedDates = useMemo(() => {
    return Object.keys(groupedExpenses).sort((a, b) => {
      if (a === 'Unknown Date') return 1;
      if (b === 'Unknown Date') return -1;
      return new Date(b) - new Date(a);
    });
  }, [groupedExpenses]);

  // Actions
  const handleOpenAdd = () => {
    setEditingExpense(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (expense) => {
    setEditingExpense(expense);
    setSheetOpen(true);
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    setEditingExpense(null);
  };

  const handleSaveExpense = async (draft) => {
    setIsSaving(true);
    try {
      let nextExpenses;

      if (!editingExpense) {
        // Create
        const newExpense = {
          ...draft,
          id: crypto.randomUUID(), // Generate client-side ID
          createdAt: new Date().toISOString(),
        };
        nextExpenses = [...expenses, newExpense];
      } else {
        // Update
        nextExpenses = expenses.map((e) => (e.id === editingExpense.id ? { ...draft, id: e.id } : e));
      }

      // Persist
      handleUpdateExpenses(nextExpenses);
      handleSheetClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (expense) => {
    setPendingDelete(expense);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || isDeletingId) return;
    const targetId = pendingDelete.id;
    setIsDeletingId(targetId);

    const prevExpenses = expenses;
    const next = expenses.filter((e) => e.id !== targetId);

    try {
      await Promise.resolve(handleUpdateExpenses(next));
      if (editingExpense && editingExpense.id === targetId) {
        handleSheetClose();
      }
      showToast({ type: "success", message: "Transaction deleted." });
    } catch (err) {
      console.error("Failed to delete transaction", err);
      handleUpdateExpenses(prevExpenses);
      showToast({ type: "error", message: "Failed to delete transaction. Please try again." });
    } finally {
      setIsDeletingId(null);
      setPendingDelete(null);
    }
  };

  const handleCancelDelete = () => {
    if (isDeletingId) return;
    setPendingDelete(null);
  };

  const formatDateHeader = (dateStr) => {
    if (dateStr === 'Unknown Date') return dateStr;
    return formatDateLong(dateStr);
  };

  return (
    <div className="space-y-6 pb-24 px-4">
      {/* Page Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-title-l font-semibold text-surface-900">Transactions</h2>
          <p className="text-caption text-surface-500">{expenses.length} Total items</p>
        </div>
        <Button variant="primary" size="icon" onClick={handleOpenAdd} aria-label="Add transaction">
          <Plus size={20} />
        </Button>
      </div>

      {/* Empty State */}
      {expenses.length === 0 ? (
        <Card variant="flat" className="bg-surface-100 border border-surface-200 rounded-2xl shadow-soft">
          <CardBody className="flex flex-col items-center justify-center text-center space-y-3 p-6 md:p-6">
            <div className="h-16 w-16 bg-surface-100 rounded-3xl flex items-center justify-center text-surface-400">
              <Search size={32} />
            </div>
            <div className="text-body font-semibold text-surface-900">No transactions yet</div>
            <p className="text-caption text-surface-500 max-w-xs">
              Add your first expense or income to start tracking.
            </p>
            <Button onClick={handleOpenAdd} size="sm" variant="primary">
              Add Transaction
            </Button>
          </CardBody>
        </Card>
      ) : (
        /* Transaction List */
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <h3 className="text-tiny font-semibold text-surface-500 uppercase tracking-wide pl-1">
                {formatDateHeader(date)}
              </h3>

              <Card variant="flat">
                <CardBody className="p-0 divide-y divide-surface-200/60">
                  {groupedExpenses[date].map((expense) => {
                    const category = getCategory(expense.category);
                    const isIncome = expense.type === 'income';

                    return (
                      <TransactionRow
                        key={expense.id}
                        title={category.label}
                        subtitle={expense.description}
                        amount={expense.amount}
                        category={category}
                        icon={category.icon}
                        variant={isIncome ? 'income' : 'expense'}
                        className="hover:bg-surface-50 px-3 py-2"
                        onClick={() => handleOpenEdit(expense)}
                        onDelete={() => handleDelete(expense)}
                      />
                    );
                  })}
                </CardBody>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Expense Form Sheet */}
      <ExpenseFormSheet
        open={sheetOpen}
        expense={editingExpense}
        accounts={accounts}
        isSaving={isSaving}
        onSave={handleSaveExpense}
        onCancel={handleSheetClose}
      />

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete this transaction?"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.description || getCategory(pendingDelete.category)?.label || "this transaction"}" for ${formatCurrency(pendingDelete.amount)}?`
            : ""
        }
        confirmLabel={isDeletingId ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        variant="danger"
      />
    </div>
  );
}
