// src/components/ui/TransactionRow.jsx
import React from 'react';
import { formatCurrency } from '../../lib/cashflow/formatters';

export function TransactionRow({ 
  title, 
  subtitle, 
  amount, 
  date, 
  category, 
  icon: Icon,
  variant = 'expense', // 'expense' | 'income'
  status, // 'paid' | 'overdue' | 'pending' | null
  onClick,
  className = ''
}) {
  const isIncome = variant === 'income';
  const amountClass = isIncome ? 'text-success-500' : 'text-surface-900';
  const sign = isIncome ? '+' : '-';

  return (
    <div 
      onClick={onClick}
      className={`group flex items-center justify-between p-4 bg-white border border-surface-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${className}`}
    >
      <div className="flex items-center gap-4">
        {/* Icon Container */}
        <div className={`p-3 rounded-xl ${isIncome ? 'bg-success-500/10 text-success-500' : 'bg-surface-100 text-surface-600'}`}>
          {Icon ? <Icon size={20} weight="duotone" /> : <div className="w-5 h-5 bg-current rounded-full opacity-20" />}
        </div>

        {/* Text Details */}
        <div className="flex flex-col">
          <span className="font-semibold text-surface-900 text-body group-hover:text-primary-600 transition-colors">
            {title}
          </span>
          <div className="flex items-center gap-2 text-caption text-surface-500">
            {date && <span>{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
            {date && subtitle && <span>•</span>}
            {subtitle && <span>{subtitle}</span>}
          </div>
        </div>
      </div>

      {/* Amount & Status */}
      <div className="flex flex-col items-end gap-1">
        <span className={`font-bold text-body ${amountClass}`}>
          {sign}{formatCurrency(amount)}
        </span>
        {status && (
          <span className={`text-tiny px-2 py-0.5 rounded-full ${
            status === 'paid' ? 'bg-success-500/10 text-success-500' :
            status === 'overdue' ? 'bg-danger-500/10 text-danger-500' :
            'bg-warning-500/10 text-warning-500'
          }`}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
}