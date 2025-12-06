import React from 'react';

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-caption font-medium text-surface-900">
          {label}
        </label>
      )}
      <input
        className={`
          flex h-10 w-full rounded-xl border px-3 py-2 text-body
          placeholder:text-surface-400 
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          disabled:cursor-not-allowed disabled:bg-surface-50
          ${error ? 'border-danger-500 focus:ring-danger-500' : 'border-surface-200'}
        `}
        {...props}
      />
      {error && <span className="text-tiny text-danger-500">{error}</span>}
    </div>
  );
}

