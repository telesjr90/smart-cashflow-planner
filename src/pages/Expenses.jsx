import React from 'react';
import { Trash2 } from 'lucide-react';
import { getCategory } from '../lib/categories';
import { Card } from '../components/ui/Card';

export default function Expenses({ expenses = [], onUpdateExpenses }) {
  
  // Group expenses by Date
  const groupedExpenses = expenses.reduce((acc, expense) => {
    const date = expense.date || 'Unknown Date';
    if (!acc[date]) acc[date] = [];
    acc[date].push(expense);
    return acc;
  }, {});

  // Sort dates descending
  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => 
    new Date(b) - new Date(a)
  );

  const handleDelete = (id) => {
    if (confirm('Delete this transaction?')) {
      const next = expenses.filter((e) => e.id !== id);
      onUpdateExpenses(next);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-title-l font-bold text-surface-900">Recent Transactions</h2>
        <span className="text-caption text-surface-500 bg-surface-100 px-3 py-1 rounded-full">
          {expenses.length} Items
        </span>
      </div>

      {expenses.length === 0 ? (
        <Card className="p-8 text-center text-surface-500">
          No transactions yet. Tap the <span className="font-bold text-primary-600">+</span> button to add one!
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-3">
              {/* Date Header */}
              <h3 className="text-caption font-bold text-surface-400 uppercase tracking-wider pl-1">
                {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </h3>
              
              {/* Transactions Card Group */}
              <div className="bg-white rounded-3xl shadow-soft border border-surface-100 overflow-hidden">
                {groupedExpenses[date].map((expense, index) => {
                  const category = getCategory(expense.category);
                  const Icon = category.icon;
                  const isIncome = expense.type === 'income';

                  return (
                    <div 
                      key={expense.id}
                      className={`
                        flex items-center justify-between p-4 hover:bg-surface-50 transition-colors
                        ${index !== groupedExpenses[date].length - 1 ? 'border-b border-surface-100' : ''}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${category.color}`}>
                          <Icon size={20} />
                        </div>
                        
                        {/* Text */}
                        <div className="flex flex-col">
                          <span className="text-body font-bold text-surface-900">
                            {category.label}
                          </span>
                          <span className="text-tiny font-medium text-surface-500 truncate max-w-[150px]">
                            {expense.description || 'No description'}
                          </span>
                        </div>
                      </div>

                      {/* Amount & Actions */}
                      <div className="flex items-center gap-4">
                        <span className={`text-body font-bold ${isIncome ? 'text-success-500' : 'text-surface-900'}`}>
                          {isIncome ? '+' : '-'}${Number(expense.amount).toFixed(2)}
                        </span>
                        
                        <button 
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 text-surface-300 hover:text-danger-500 hover:bg-danger-50 rounded-full transition-colors"
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
