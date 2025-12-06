import React, { useMemo } from 'react';
import { Trash2, Search } from 'lucide-react';
import { getCategory } from '../lib/categories';
import { Card } from '../components/ui/Card';

export default function Expenses({ expenses = [], onUpdateExpenses }) {
  
  // 1. Group expenses by Date (YYYY-MM-DD)
  const groupedExpenses = useMemo(() => {
    return expenses.reduce((acc, expense) => {
      // Fallback for missing dates
      const date = expense.date || 'Unknown Date';
      if (!acc[date]) acc[date] = [];
      acc[date].push(expense);
      return acc;
    }, {});
  }, [expenses]);

  // 2. Sort dates descending (Newest first)
  const sortedDates = useMemo(() => {
    return Object.keys(groupedExpenses).sort((a, b) => {
      if (a === 'Unknown Date') return 1;
      if (b === 'Unknown Date') return -1;
      return new Date(b) - new Date(a);
    });
  }, [groupedExpenses]);

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      const next = expenses.filter((e) => e.id !== id);
      onUpdateExpenses(next);
    }
  };

  // Helper to format currency
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  // Helper to format date header
  const formatDateHeader = (dateStr) => {
    if (dateStr === 'Unknown Date') return dateStr;
    const date = new Date(dateStr + 'T00:00:00'); // Fix timezone offset issues
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
        {/* Placeholder for future search/filter */}
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
              {/* Date Header */}
              <h3 className="text-tiny font-bold text-surface-400 uppercase tracking-wider pl-1">
                {formatDateHeader(date)}
              </h3>
              
              {/* Card Group */}
              <div className="bg-white rounded-3xl shadow-soft border border-surface-100 overflow-hidden">
                {groupedExpenses[date].map((expense, index) => {
                  const category = getCategory(expense.category);
                  const Icon = category.icon;
                  const isIncome = expense.type === 'income';

                  return (
                    <div 
                      key={expense.id}
                      className={`
                        group flex items-center justify-between p-4 transition-colors hover:bg-surface-50
                        ${index !== groupedExpenses[date].length - 1 ? 'border-b border-surface-100' : ''}
                      `}
                    >
                      {/* Left: Icon & Details */}
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className={`h-12 w-12 flex-shrink-0 rounded-2xl flex items-center justify-center ${category.color}`}>
                          <Icon size={20} weight="fill" />
                        </div>
                        
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-body font-bold text-surface-900 truncate">
                            {category.label}
                          </span>
                          {expense.description && (
                            <span className="text-caption font-medium text-surface-400 truncate">
                              {expense.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount & Delete */}
                      <div className="flex items-center gap-3 pl-2 flex-shrink-0">
                        <span className={`text-body font-bold whitespace-nowrap ${isIncome ? 'text-success-500' : 'text-surface-900'}`}>
                          {isIncome ? '+' : '-'}{formatMoney(expense.amount)}
                        </span>
                        
                        {/* Delete Button (Visible on hover on desktop, always there but subtle) */}
                        <button 
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 text-surface-300 hover:text-danger-500 hover:bg-danger-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-label="Delete transaction"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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