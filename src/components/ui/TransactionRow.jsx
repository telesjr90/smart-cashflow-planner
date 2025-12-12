import React from "react";
import { formatCurrency } from "../../lib/cashflow/formatters";
import { formatDateShort } from "../../utils/dateFormat";
import { Trash2 } from "lucide-react";

export function TransactionRow({
  title,
  subtitle,
  amount,
  date,
  category,
  icon: Icon,
  variant = "expense", // 'expense' | 'income'
  status, // 'paid' | 'overdue' | 'pending' | null
  onClick,
  onDelete, // New prop for delete action
  actions, // New slot for custom actions
  className = "",
}) {
  const isIncome = variant === "income";
  const amountClass = isIncome ? "text-success-500" : "text-danger-500";
  const sign = isIncome ? "+" : "-";
  const clickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.(e);
              }
            }
          : undefined
      }
      className={`group flex items-center justify-between p-4 bg-surface-100 border border-surface-200/60 rounded-3xl shadow-soft transition-all duration-200 ${
        clickable
          ? "cursor-pointer hover:shadow-soft hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50"
          : ""
      } ${className}`}
    >
      <div className="flex items-center gap-4 overflow-hidden">
        {/* Icon Container */}
        <div
          className={`p-3 rounded-2xl flex-shrink-0 ${
            isIncome ? "bg-success-500/10 text-success-500" : "bg-surface-200/60 text-surface-600"
          }`}
        >
          {Icon ? (
            <Icon size={20} weight="duotone" aria-hidden="true" />
          ) : (
            <div className="w-5 h-5 bg-current rounded-full opacity-20" />
          )}
        </div>

        {/* Text Details */}
        <div className="flex flex-col overflow-hidden min-w-0">
          <span className="font-semibold text-surface-900 text-body group-hover:text-primary-600 transition-colors truncate">
            {title}
          </span>
          <div className="flex items-center gap-2 text-caption text-surface-500 truncate">
            {date && <span>{formatDateShort(date)}</span>}
            {date && subtitle && <span>-</span>}
            {subtitle && <span>{subtitle}</span>}
          </div>
        </div>
      </div>

      {/* Right Side: Amount, Status, Actions */}
      <div className="flex items-center gap-3 pl-2 flex-shrink-0">
        <div className="flex flex-col items-end gap-1">
          <span className={`font-bold text-body ${amountClass}`}>
            {sign}
            {formatCurrency(amount)}
          </span>
          {status && (
            <span
              className={`rounded-pill px-2 py-0.5 text-tiny font-semibold ${
                status === "paid"
                  ? "bg-success-500/10 text-success-500"
                  : status === "overdue"
                  ? "bg-danger-500/10 text-danger-500"
                  : "bg-warning-500/10 text-warning-500"
              }`}
              role="status"
            >
              {status}
            </span>
          )}
        </div>

        {/* Delete Action (visible on hover on desktop, or if explicitly passed) */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-surface-400 hover:text-danger-500 hover:bg-danger-50 rounded-pill transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 mobile:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50"
            aria-label="Delete"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        )}

        {/* Custom Actions Slot */}
        {actions && <div onClick={(e) => e.stopPropagation()}>{actions}</div>}
      </div>
    </div>
  );
}
