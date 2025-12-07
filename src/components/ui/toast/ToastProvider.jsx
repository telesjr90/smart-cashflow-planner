import React, { createContext, useState, useCallback } from "react";
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from "lucide-react";

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ type = "info", message, timeout = 4000 }) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    setToasts((prev) => [...prev, { id, type, message }]);

    if (timeout) {
      setTimeout(() => {
        removeToast(id);
      }, timeout);
    }
  }, [removeToast]);

  const contextValue = { showToast, removeToast };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Individual Toast Component
function ToastItem({ toast, onRemove }) {
  // Styles based on type
  const variants = {
    success: {
      bg: "bg-white",
      border: "border-emerald-100",
      icon: <CheckCircle2 size={20} className="text-emerald-500" />,
      text: "text-slate-800"
    },
    error: {
      bg: "bg-white",
      border: "border-rose-100",
      icon: <AlertCircle size={20} className="text-rose-500" />,
      text: "text-slate-800"
    },
    warning: {
      bg: "bg-white",
      border: "border-amber-100",
      icon: <AlertTriangle size={20} className="text-amber-500" />,
      text: "text-slate-800"
    },
    info: {
      bg: "bg-slate-900",
      border: "border-slate-800",
      icon: <Info size={20} className="text-slate-400" />,
      text: "text-white"
    }
  };

  const style = variants[toast.type] || variants.info;

  return (
    <div 
      className={`
        pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border 
        ${style.bg} ${style.border} 
        animate-in slide-in-from-bottom-2 fade-in duration-300
      `}
      role="alert"
    >
      <div className="mt-0.5 shrink-0">{style.icon}</div>
      <p className={`text-sm font-medium flex-1 ${style.text}`}>
        {toast.message}
      </p>
      <button 
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-1 rounded-full opacity-50 hover:opacity-100 hover:bg-black/5 transition-opacity"
      >
        <X size={16} className={toast.type === 'info' ? "text-white" : "text-slate-500"} />
      </button>
    </div>
  );
}