import React, { useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';

// Hooks & Libs
import { useCashflowStore } from '../store/useCashflowStore';
import useCashflowData from '../hooks/useCashflowData';
import { getCategory } from '../lib/categories';
import { useConfirm } from '../hooks/useConfirm';

// Components
import { TransactionRow } from '../components/ui/TransactionRow';
import ExpenseFormSheet from '../components/expenses/ExpenseFormSheet';

export default function Expenses() {
  
  // 1. Connect to Store
  const expenses = useCashflowStore((state) => state.expenses || []);
  const accounts = useCashflowStore((state) => state.accounts || []);
  const { handleUpdateExpenses } = useCashflowData();
  const confirm = useConfirm();

  // 2. UI State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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
          createdAt: new Date().toISOString()
        };
        nextExpenses = [...expenses, newExpense];
      } else {
        // Update
        nextExpenses = expenses.map(e => 
          e.id === editingExpense.id ? { ...draft, id: e.id } : e
        );
      }

      // Persist
      handleUpdateExpenses(nextExpenses);
      handleSheetClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
        title: "Delete Transaction",
        message: "Are you sure you want to delete this transaction?",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
    });

    if (ok) {
      const next = expenses.filter((e) => e.id !== id);
      handleUpdateExpenses(next);
      
      // If we deleted the one currently being edited (rare but possible), close sheet
      if (editingExpense && editingExpense.id === id) {
        handleSheetClose();
      }
    }
  };

  const formatDateHeader = (dateStr) => {
    if (dateStr === 'Unknown Date') return dateStr;
    const date = new Date(dateStr + 'T00:00:00'); 
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-l font-bold text-surface-900">Transactions</h2>
          <p className="text-caption text-surface-500">
            {expenses.length} Total items
          </p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 bg-white border border-surface-200 text-surface-400 rounded-xl shadow-sm">
            <Search size={20} />
          </button>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center justify-center h-10 w-10 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 bg-surface-100 rounded-full flex items-center justify-center text-surface-400 mb-4">
            <Search size={32} />
          </div>
          <h3 className="text-body font-semibold text-surface-900">No transactions yet</h3>
          <p className="text-caption text-surface-500 max-w-xs mt-1 mb-4">
            Add your first expense or income to start tracking.
          </p>
          <button 
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-full shadow-sm hover:bg-indigo-700"
          >
            Add Transaction
          </button>
        </div>
      ) : (
        /* Transaction List */
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <h3 className="text-tiny font-bold text-surface-400 uppercase tracking-wider pl-1">
                {formatDateHeader(date)}
              </h3>
              
              <div className="bg-white rounded-3xl shadow-soft border border-surface-100 overflow-hidden">
                {groupedExpenses[date].map((expense, index) => {
                  const category = getCategory(expense.category);
                  const isIncome = expense.type === 'income';

                  return (
                    <div key={expense.id} className={index !== groupedExpenses[date].length - 1 ? 'border-b border-surface-100' : ''}>
                      <TransactionRow 
                        title={category.label}
                        subtitle={expense.description}
                        amount={expense.amount}
                        category={category}
                        icon={category.icon}
                        variant={isIncome ? 'income' : 'expense'}
                        className="shadow-none rounded-none border-none hover:bg-surface-50 cursor-pointer"
                        onClick={() => handleOpenEdit(expense)}
                        onDelete={() => handleDelete(expense.id)}
                      />
                    </div>
                  );
                })}
              </div>
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
    </div>
  );
}