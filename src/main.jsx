// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { ToastProvider } from "./components/ui/toast/ToastProvider";

// IMPORTANT: No service worker registration for this recovery deploy.
// If you had something like `import "../dist/registerSW.js"` or
// `navigator.serviceWorker.register(...)`, keep it removed for now.

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(rootEl).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);