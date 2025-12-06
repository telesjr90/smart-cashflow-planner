import React from 'react';

export function Badge({ children, variant = 'neutral', className = '' }) {
  const variants = {
    neutral: "bg-surface-100 text-surface-900",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
    danger: "bg-danger-50 text-danger-700",
    primary: "bg-primary-50 text-primary-700",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-tiny font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

