import React from "react";

export function ModalShell({
  title,
  description,
  children,
  footer,
  className = "",
  hideHeader = false,
}) {
  const baseClasses =
    "w-full max-w-md bg-surface-100 border border-surface-200 rounded-2xl shadow-soft p-4 md:p-6 space-y-4";
  const classes = [baseClasses, className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {!hideHeader && (title || description) && (
        <div className="space-y-1">
          {title && <h2 className="text-title-xl font-bold text-surface-900">{title}</h2>}
          {description && <p className="text-caption text-surface-500">{description}</p>}
        </div>
      )}

      <div>{children}</div>

      {footer && <div className="pt-2">{footer}</div>}
    </div>
  );
}
