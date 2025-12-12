import React, { useId } from "react";
import { ChevronDown } from "lucide-react";

export function Select({
  label,
  id,
  className = "",
  containerClassName = "",
  variant = "outline", // outline | filled
  size = "md", // sm | md
  error,
  helperText,
  children,
  ...props
}) {
  const fallbackId = useId();
  const controlId = id || fallbackId;
  const isInvalid = props["aria-invalid"] === true || props["aria-invalid"] === "true" || Boolean(error);

  const variants = {
    outline: "bg-white border border-surface-200 focus:border-primary-600",
    filled: "bg-surface-50 border border-surface-200 focus:border-primary-600",
  };

  const sizes = {
    sm: { control: "h-10 px-3 text-caption", icon: "h-4 w-4 right-3" },
    md: { control: "h-11 px-4 text-body", icon: "h-4 w-4 right-4" },
  };

  const activeVariant = variants[variant] || variants.outline;
  const activeSize = sizes[size] || sizes.md;

  const helperId = helperText ? `${controlId}-helper` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <label className={`block w-full space-y-1 ${containerClassName}`} htmlFor={controlId}>
      {label && (
        <span className="block text-tiny font-semibold uppercase tracking-wide text-surface-500">
          {label}
        </span>
      )}
      <div className="relative">
        <select
          id={controlId}
          className={`
            w-full appearance-none rounded-2xl text-surface-900 bg-white 
            transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${activeVariant}
            ${activeSize.control}
            ${isInvalid ? "border-danger-500 focus-visible:border-danger-500 focus-visible:ring-danger-500" : ""}
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50
            ${className}
          `}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className={`absolute top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none ${activeSize.icon}`}
          aria-hidden="true"
        />
        {helperText && !error && (
          <p id={helperId} className="mt-1 text-caption text-surface-500">
            {helperText}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1 text-caption text-danger-500">
            {error}
          </p>
        )}
      </div>
    </label>
  );
}
