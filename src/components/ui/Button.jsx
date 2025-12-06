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
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-pill";
  
  const variants = {
    primary: "bg-primary-600 text-white shadow-glow hover:bg-primary-700",
    secondary: "bg-surface-200 text-surface-900 hover:bg-surface-300",
    outline: "border-2 border-surface-200 text-surface-900 hover:border-primary-600 hover:text-primary-600",
    ghost: "bg-transparent text-primary-600 hover:bg-primary-50",
    danger: "bg-danger-500 text-white shadow-sm hover:bg-danger-600",
  };

  const sizes = {
    sm: "px-4 py-2 text-caption",
    md: "px-6 py-3.5 text-body",
    lg: "px-8 py-4 text-title-l",
    icon: "p-3",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
      {!isLoading && Icon && <Icon size={20} className={children ? "mr-2" : ""} weight="bold" />}
      {children}
    </button>
  );
}

