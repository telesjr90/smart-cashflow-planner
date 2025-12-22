import React, { useEffect, useRef, useId } from "react";

export default function ConfirmModal({
  open,
  title,
  message,
  subtitle,
  helperText,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default", // default | danger
}) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const dialogRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  const subtitleId = useId();
  const helperId = useId();

  useEffect(() => {
    if (open) {
      // Prefer focusing the confirm button so planner prompts are one-key accessible
      if (confirmRef.current) {
        confirmRef.current.focus();
        firstFocusableRef.current = confirmRef.current;
        return;
      }

      // Fallback: focus the first focusable element inside the dialog
      const focusableSelectors =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusables = dialogRef.current?.querySelectorAll(focusableSelectors);
      const first = focusables?.[0];
      firstFocusableRef.current = first;
      first?.focus();
    }
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel?.();
    }

    if (e.key === "Tab") {
      const focusableSelectors =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusables = dialogRef.current?.querySelectorAll(focusableSelectors);
      const focusable = Array.from(focusables || []).filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
      );
      if (!focusable.length) return;

      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= focusable.length) {
        e.preventDefault();
        const target = e.shiftKey ? focusable[focusable.length - 1] : focusable[0];
        target?.focus();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role={variant === "danger" ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={
        [
          descId,
          subtitle ? subtitleId : null,
          helperText ? helperId : null,
        ]
          .filter(Boolean)
          .join(" ") || undefined
      }
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Modal Card */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-sm max-h-[100dvh] bg-surface-100 rounded-3xl shadow-soft border border-surface-200/60 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="p-6 space-y-2 overflow-y-auto">
          <h3
            id={titleId}
            className={`text-title-l ${variant === "danger" ? "text-danger-600" : "text-surface-900"}`}
          >
            {title}
          </h3>
          {subtitle && (
            <p id={subtitleId} className="text-caption font-semibold text-surface-700">
              {subtitle}
            </p>
          )}
          <p id={descId} className="text-body text-surface-500 leading-relaxed">
            {message}
          </p>
          {helperText && (
            <p id={helperId} className="text-caption text-surface-400 leading-relaxed">
              {helperText}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 bg-surface-50 px-6 py-4 border-t border-surface-200/60">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-surface-200 bg-surface-100 px-4 py-2.5 text-body font-semibold text-surface-900 hover:bg-surface-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            autoFocus
            className={`flex-1 rounded-2xl px-4 py-2.5 text-body font-semibold text-white shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 ${
              variant === "danger"
                ? "bg-danger-600 hover:bg-danger-700 focus-visible:ring-danger-500"
                : "bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
