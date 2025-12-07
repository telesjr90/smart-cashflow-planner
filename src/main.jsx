import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { ToastProvider } from "./components/ui/toast/ToastProvider";
import { ConfirmProvider } from "./hooks/useConfirm"; // Import the provider

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(rootEl).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>
);