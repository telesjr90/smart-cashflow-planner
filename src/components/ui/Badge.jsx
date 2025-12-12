import React from 'react';

export function Badge({ children, variant = 'neutral', className = '' }) {
  const variants = {
    neutral: 'bg-surface-100 text-surface-500',
    primary: 'bg-primary-500/10 text-primary-600',
    secondary: 'bg-secondary-500/10 text-secondary-500',
    success: 'bg-success-500/10 text-success-500',
    warning: 'bg-warning-500/10 text-warning-500',
    danger: 'bg-danger-500/10 text-danger-500',
    outline: 'border border-surface-200 text-surface-900 bg-transparent',
    ghost: 'text-surface-900 bg-transparent',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-tiny font-semibold',
    md: 'px-2.5 py-1 text-tiny font-bold',
  };

  const variantClass = variants[variant] || variants.neutral;
  const sizeClass = sizes[variant === 'ghost' || variant === 'outline' ? 'md' : 'md'];

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1 rounded-pill ${sizeClass} ${variantClass} ${className}`}
    >
      {children}
    </span>
  );
}
