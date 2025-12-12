import React, { useId } from "react";
import { Select } from "./Select";

const AUTO_CHIP_THRESHOLD = 4;

export function AccountSelect({
  accounts = [],
  value,
  onChange,
  label,
  variant = "auto", // auto | chips | select
  required = false,
  error,
  helperText,
  disabled = false,
  placeholder = "Select an account",
  className = "",
  containerClassName = "",
}) {
  const generatedId = useId();
  const controlId = generatedId;
  const labelId = label ? `${controlId}-label` : undefined;
  const helperId = helperText ? `${controlId}-helper` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;
  const isInvalid = Boolean(error);

  const resolvedVariant =
    variant === "auto" ? (accounts?.length || 0) <= AUTO_CHIP_THRESHOLD ? "chips" : "select" : variant;

  const handleChange = (next) => {
    if (disabled) return;
    onChange?.(next);
  };

  if (!accounts || accounts.length === 0) {
    return (
      <label className={`block w-full space-y-1 ${containerClassName}`} htmlFor={controlId}>
        {label && (
          <span id={labelId} className="block text-tiny font-semibold uppercase tracking-wide text-surface-500">
            {label}
          </span>
        )}
        <div
          id={controlId}
          className={`w-full h-11 px-4 rounded-2xl border border-surface-200 bg-surface-100 text-surface-400 text-body flex items-center ${className}`}
          aria-disabled="true"
        >
          No accounts available
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

  if (resolvedVariant === "chips") {
    return (
      <div className={`block w-full space-y-1 ${containerClassName}`}>
        {label && (
          <span id={labelId} className="block text-tiny font-semibold uppercase tracking-wide text-surface-500">
            {label}
          </span>
        )}
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          aria-invalid={isInvalid || undefined}
          className="flex flex-wrap gap-2"
        >
          {accounts.map((account) => {
            const selected = account.id === value;
            return (
              <button
                key={account.id}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => handleChange(account.id)}
                disabled={disabled}
                className={`rounded-pill border px-3 py-2 text-sm transition-colors ${
                  selected
                    ? "bg-primary-50 border-primary-500 text-primary-700"
                    : "bg-surface-100 border-surface-200 text-surface-800 hover:border-primary-400"
                } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${className}`}
              >
                {account.name}
              </button>
            );
          })}
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
      </div>
    );
  }

  return (
    <Select
      id={controlId}
      label={label}
      variant="outline"
      size="md"
      value={value || ""}
      onChange={(e) => handleChange(e.target.value || null)}
      aria-describedby={describedBy}
      aria-invalid={isInvalid || undefined}
      required={required}
      disabled={disabled}
      error={error}
      helperText={helperText}
      containerClassName={containerClassName}
      className={className}
    >
      <option value="" disabled={required}>
        {placeholder}
      </option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </Select>
  );
}
