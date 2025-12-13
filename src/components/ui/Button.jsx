import React from "react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  isLoading = false,
  fullWidth = false,
  icon: Icon,
  disabled = false,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

  const variants = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white border border-transparent",
    secondary:
      "bg-surface-100 text-surface-900 border border-surface-200 hover:bg-surface-200",
    destructive: "bg-danger-500 hover:bg-danger-600 text-white border border-transparent",
    ghost: "bg-transparent text-surface-900 border border-transparent hover:bg-surface-50",
    link: "bg-transparent text-primary-600 hover:text-primary-700 underline underline-offset-4 border border-transparent shadow-none",
  };

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-body",
    lg: "h-12 px-5 text-body",
  };

  const classes = [
    baseStyles,
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const showSpinner = isLoading;
  const isDisabled = disabled || isLoading;

  return (
    <button className={classes} disabled={isDisabled} aria-busy={showSpinner} {...props}>
      {showSpinner && (
        <span
          className="inline-block animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"
          aria-hidden="true"
        />
      )}
      {!showSpinner && Icon && <Icon size={20} aria-hidden="true" />}
      {children}
    </button>
  );
}
