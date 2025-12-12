import { useContext } from "react";
import { ToastContext } from "./ToastProvider";

/**
 * Toast hook for consistent, tokenized notifications.
 *
 * API: showToast(options)
 * @param {Object} options
 * @param {'success' | 'error' | 'warning' | 'info'} options.type - Drives status tokens/icons.
 * @param {string} options.message - Single-line body text.
 * @param {number} [options.timeout] - ms before auto-dismiss (default 4000).
 * @param {string} [options.id] - Optional deduplication key (identical ids can be ignored/overwritten).
 *
 * Example:
 *   showToast({ type: "success", message: "Bill saved." });
 *
 * Accessibility: ToastProvider renders an aria-live polite region and focusable dismiss buttons;
 * consumers only need to call `showToast`/`dismissToast` from UI events.
 */
export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return {
    showToast: context.showToast,
    dismissToast: context.removeToast,
  };
}
