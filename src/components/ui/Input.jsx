import React from "react";

/**
 * Input
 * Prefer size="md" for primary form fields (best for mobile tap targets); reserve size="sm" for compact filters/search.
 */
export function Input({
  label,
  icon: Icon,
  prefix,
  rightElement,
  className = "",
  containerClassName = "",
  variant = "outline", // outline | filled
  size = "md", // sm | md
  ...props
}) {
  const isInvalid = props["aria-invalid"] === true || props["aria-invalid"] === "true";
  const isDisabled = props.disabled;

  const variants = {
    outline:
      "bg-surface-50 border border-surface-200 focus:border-primary-600 focus:ring-primary-600 focus:ring-offset-surface-50",
    filled:
      "bg-surface-50 border border-surface-200 focus:border-primary-600 focus:ring-primary-600 focus:ring-offset-surface-50",
  };

  const sizes = {
    sm: {
      // Keep compact height but avoid tiny text on mobile.
      input: "h-10 text-body",
      left: "pl-9",
      padding: "px-3",
    },
    md: {
      input: "h-11 text-body",
      left: "pl-10",
      padding: "px-4",
    },
  };

  const sizeStyles = sizes[size] || sizes.md;

  return (
    <label className={`block w-full space-y-1 ${containerClassName}`}>
      {label && (
        <span className="block text-tiny font-semibold uppercase tracking-wide text-surface-500">
          {label}
        </span>
      )}
      <div className="relative">
        {(Icon || prefix) && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 flex items-center gap-2 pointer-events-none">
            {Icon && <Icon size={18} aria-hidden="true" />}
            {prefix && <span className="text-caption font-semibold text-surface-900">{prefix}</span>}
          </div>
        )}

        <input
          className={`
            w-full rounded-2xl ${sizeStyles.input} text-surface-900 placeholder:text-surface-300 transition-all
            ${variants[variant] || variants.outline}
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50
            disabled:bg-surface-100 disabled:text-surface-500 disabled:cursor-not-allowed disabled:border-surface-200
            ${isInvalid ? "border-danger-500 text-danger-500 placeholder:text-danger-500/60 focus-visible:ring-danger-500 focus-visible:border-danger-500" : ""}
            ${(Icon || prefix) ? sizeStyles.left : sizeStyles.padding}
            ${rightElement ? "pr-14" : sizeStyles.padding}
            ${className}
          `}
          aria-invalid={isInvalid || undefined}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-caption text-surface-500">
            {rightElement}
          </div>
        )}
      </div>
    </label>
  );
}
