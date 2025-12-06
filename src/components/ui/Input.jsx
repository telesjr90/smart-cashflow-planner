import React from 'react';

export function Input({ label, error, icon: Icon, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-caption font-semibold text-surface-900 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400">
            <Icon size={20} />
          </div>
        )}
        <input
          className={`
            flex w-full rounded-2xl border bg-surface-50 px-4 py-3.5 text-body text-surface-900
            transition-all duration-200
            placeholder:text-surface-400 
            focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
            disabled:cursor-not-allowed disabled:bg-surface-100
            ${Icon ? 'pl-11' : ''}
            ${error ? 'border-danger-500 focus:ring-danger-500/20' : 'border-surface-200'}
          `}
          {...props}
        />
      </div>
      {error && <span className="text-tiny text-danger-500 ml-1">{error}</span>}
    </div>
  );
}

