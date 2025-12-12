import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { ToastProvider } from "./components/ui/toast/ToastProvider";
import { ConfirmProvider } from "./hooks/useConfirm"; // Import the provider
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <div className="min-h-screen bg-surface-50 text-surface-900">
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </div>
    </ErrorBoundary>
  </React.StrictMode>
);
