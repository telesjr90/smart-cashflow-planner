import React, { useId } from "react";

/**
 * Controlled date input styled to match the UI kit.
 * label is optional; prefer providing one for accessibility.
 */
export function DateInput({
  label,
  value,
  onChange,
  min,
  max,
  required,
  error,
  helperText,
  disabled,
  id,
  className = "",
  containerClassName = "",
  ...props
}) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const isInvalid = Boolean(error);

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
        <input
          id={controlId}
          type="date"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          min={min}
          max={max}
          required={required}
          disabled={disabled}
          className={`
            w-full h-11 px-4 pr-11 rounded-2xl bg-white border border-surface-200 text-body text-surface-900 placeholder:text-surface-300 transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 focus:border-primary-600
            disabled:opacity-50 disabled:cursor-not-allowed read-only:bg-surface-100
            ${isInvalid ? "border-danger-500 focus-visible:ring-danger-500 focus-visible:border-danger-500" : ""}
            ${className}
          `}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          {...props}
        />
      </div>

      {helperText && !error && (
        <p id={helperId} className="text-caption text-surface-500">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption text-danger-500">
          {error}
        </p>
      )}
    </label>
  );
}
