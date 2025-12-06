import React from 'react';

export function Badge({ children, variant = 'neutral', className = '' }) {
  const variants = {
    neutral: "bg-surface-100 text-surface-500",
    success: "bg-success-500/10 text-success-500",
    warning: "bg-warning-500/10 text-warning-500",
    danger: "bg-danger-500/10 text-danger-500",
    primary: "bg-primary-500/10 text-primary-600",
  };

  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-tiny font-bold uppercase tracking-wide ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

