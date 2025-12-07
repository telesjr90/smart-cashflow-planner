import React from 'react';
import { ChevronDown } from 'lucide-react';

export function Select({ 
  label, 
  className = "", 
  containerClassName = "",
  children, 
  ...props 
}) {
  return (
    <label className={`block w-full ${containerClassName}`}>
      {label && (
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
          {label}
        </span>
      )}
      <div className="relative">
        <select
          className={`
            w-full appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white 
            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 
            transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </label>
  );
}