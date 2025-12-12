import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  fullWidth = false,
  icon: Icon,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-pill transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50';

  const variants = {
    primary: 'bg-primary-600 text-white shadow-glow hover:bg-primary-700 disabled:shadow-none',
    secondary: 'bg-surface-100 text-surface-900 shadow-soft hover:bg-surface-200 disabled:shadow-none',
    outline:
      'border border-surface-200 text-surface-900 bg-transparent hover:border-primary-600 hover:text-primary-600 hover:bg-primary-50/40',
    ghost: 'bg-transparent text-primary-600 hover:bg-primary-50',
    danger:
      'bg-danger-600 text-white shadow-soft hover:bg-danger-700 active:bg-danger-800 disabled:shadow-none focus-visible:ring-danger-500 focus-visible:ring-offset-danger-50',
  };

  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-body',
    lg: 'h-12 px-5 text-body',
    icon: 'h-10 w-10 p-0',
  };

  const variantClass = variants[variant] || variants.primary;
  const sizeClass = sizes[size] || sizes.md;
  const iconMargin = children ? 'mr-1.5' : '';

  return (
    <button
      className={`${baseStyles} ${variantClass} ${sizeClass} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && (
        <span
          className={`inline-block animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full ${
            children ? 'mr-2' : ''
          }`}
          aria-hidden="true"
        />
      )}
      {!isLoading && Icon && <Icon size={20} className={iconMargin} aria-hidden="true" />}
      {children}
    </button>
  );
}
