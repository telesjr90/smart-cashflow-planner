import React from 'react';

export function Input({ 
  label, 
  icon: Icon, 
  prefix, 
  rightElement, 
  className = "", 
  containerClassName = "",
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
        {(Icon || prefix) && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
            {Icon && <Icon size={18} />}
            {prefix && <span className="text-sm font-medium">{prefix}</span>}
          </div>
        )}
        
        <input
          className={`
            w-full border border-slate-200 rounded-xl py-2 text-sm text-slate-900 
            placeholder:text-slate-300 
            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 
            transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${(Icon || prefix) ? 'pl-9' : 'px-3'}
            ${rightElement ? 'pr-20' : 'pr-3'}
            ${className}
          `}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
            {rightElement}
          </div>
        )}
      </div>
    </label>
  );
}