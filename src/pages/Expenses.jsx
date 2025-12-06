import React, { useMemo } from 'react';
import { Search } from 'lucide-react';

// Hooks & Libs
import { useCashflowStore } from '../store/useCashflowStore';
import useCashflowData from '../hooks/useCashflowData'; // FIXED: Removed curly braces
import { getCategory } from '../lib/categories';

// Components
import { TransactionRow } from '../components/ui/TransactionRow';

export default function Expenses() {
  
  // 1. Connect to Store
  const expenses = useCashflowStore((state) => state.expenses || []);
  const { handleUpdateExpenses } = useCashflowData();

  // 2. Group expenses by Date
  const groupedExpenses = useMemo(() => {
    return expenses.reduce((acc, expense) => {
      const date = expense.date || 'Unknown Date';
      if (!acc[date]) acc[date] = [];
      acc[date].push(expense);
      return acc;
    }, {});
  }, [expenses]);

  // 3. Sort dates descending
  const sortedDates = useMemo(() => {
    return Object.keys(groupedExpenses).sort((a, b) => {
      if (a === 'Unknown Date') return 1;
      if (b === 'Unknown Date') return -1;
      return new Date(b) - new Date(a);
    });
  }, [groupedExpenses]);

  // Actions
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      const next = expenses.filter((e) => e.id !== id);
      handleUpdateExpenses(next);
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
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-l font-bold text-surface-900">Transactions</h2>
          <p className="text-caption text-surface-500">
            {expenses.length} Total items
          </p>
        </div>
        <button className="p-2 bg-white border border-surface-200 text-surface-400 rounded-xl shadow-sm">
          <Search size={20} />
        </button>
      </div>

      {/* Empty State */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 bg-surface-100 rounded-full flex items-center justify-center text-surface-400 mb-4">
            <Search size={32} />
          </div>
          <h3 className="text-body font-semibold text-surface-900">No transactions yet</h3>
          <p className="text-caption text-surface-500 max-w-xs mt-1">
            Tap the + button below to add your first expense or income.
          </p>
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
                  const isIncome = expense.type === 'income'; // Assuming unified schema eventually, but current data is just expenses

                  return (
                    <div key={expense.id} className={index !== groupedExpenses[date].length - 1 ? 'border-b border-surface-100' : ''}>
                      <TransactionRow 
                        title={category.label}
                        subtitle={expense.description}
                        amount={expense.amount}
                        category={category}
                        icon={category.icon}
                        variant={isIncome ? 'income' : 'expense'}
                        className="shadow-none rounded-none border-none hover:bg-surface-50"
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
    </div>
  );
}