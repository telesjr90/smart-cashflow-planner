import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import ConfirmModal from "../components/ui/modals/ConfirmModal";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
  });

  const resolver = useRef(null);

  const confirm = useCallback(({ 
    title = "Are you sure?", 
    message = "This action cannot be undone.", 
    confirmLabel = "Confirm", 
    cancelLabel = "Cancel" 
  }) => {
    setOptions({ title, message, confirmLabel, cancelLabel });
    setIsOpen(true);

    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolver.current) {
      resolver.current(true);
      resolver.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolver.current) {
      resolver.current(false);
      resolver.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal
        open={isOpen}
        title={options.title}
        message={options.message}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}