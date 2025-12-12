import React, { createContext, useState, useCallback } from "react";
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from "lucide-react";

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = "info", message, timeout = 4000, id: providedId }) => {
      const id = providedId || Date.now().toString(36) + Math.random().toString(36).substr(2);

      setToasts((prev) => {
        const next = [...prev.filter((t) => t.id !== id), { id, type, message }];
        return next.slice(-3); // cap visible toasts
      });

      if (timeout) {
        setTimeout(() => {
          removeToast(id);
        }, timeout);
      }
    },
    [removeToast]
  );

  const contextValue = { showToast, removeToast };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast Container */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 w-full max-w-sm px-4 pointer-events-none"
        style={{ bottom: "calc(24px + env(safe-area-inset-bottom))" }}
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Individual Toast Component
function ToastItem({ toast, onRemove }) {
  const variants = {
    success: {
      bg: "bg-surface-100",
      border: "border-surface-200",
      icon: <CheckCircle2 size={20} className="text-success-600" aria-hidden="true" />,
      text: "text-surface-900",
    },
    error: {
      bg: "bg-surface-100",
      border: "border-surface-200",
      icon: <AlertCircle size={20} className="text-danger-600" aria-hidden="true" />,
      text: "text-surface-900",
    },
    warning: {
      bg: "bg-surface-100",
      border: "border-surface-200",
      icon: <AlertTriangle size={20} className="text-warning-600" aria-hidden="true" />,
      text: "text-surface-900",
    },
    info: {
      bg: "bg-surface-100",
      border: "border-surface-200",
      icon: <Info size={20} className="text-primary-600" aria-hidden="true" />,
      text: "text-surface-900",
    },
  };

  const style = variants[toast.type] || variants.info;
  const isError = toast.type === "error";

  return (
    <div
      className={`
        pointer-events-auto flex items-start gap-3 p-4 rounded-3xl shadow-soft border bg-surface-100
        ${style.bg} ${style.border}
        animate-in slide-in-from-bottom-2 fade-in duration-300
      `}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <div className="mt-0.5 shrink-0">{style.icon}</div>
      <p className={`text-body font-semibold flex-1 ${style.text}`}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-2 rounded-pill text-surface-400 hover:text-surface-900 hover:bg-surface-200/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50"
        aria-label="Dismiss notification"
      >
        <X size={16} className="text-surface-500" aria-hidden="true" />
      </button>
    </div>
  );
}
