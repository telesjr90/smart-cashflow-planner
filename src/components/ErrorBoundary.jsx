import React from "react";

/**
 * @typedef {Object} ErrorBoundaryProps
 * @property {React.ReactNode} children
 * @property {() => void} [onReset] - Optional reset handler invoked before clearing the error boundary.
 * @property {string | number} [resetKey] - Changing this key resets the boundary automatically.
 */

/**
 * ErrorBoundary component to catch runtime errors and prevent the entire app
 * from unmounting or showing a blank screen. When an error is caught it
 * displays a friendly message along with the error string. This is useful
 * especially in an SPA where exceptions thrown from deeply nested
 * components would otherwise propagate and crash the React tree.
 *
 * @extends React.Component<ErrorBoundaryProps, { hasError: boolean, error: Error | null, errorInfo: React.ErrorInfo | null }>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ errorInfo: info });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.resetBoundary();
    }
  }

  resetBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReset = () => {
    const { onReset } = this.props;
    if (typeof onReset === "function") {
      try {
        onReset();
      } finally {
        this.resetBoundary();
      }
      return;
    }

    if (typeof window !== "undefined" && window.location) {
      window.location.reload();
      return;
    }

    this.resetBoundary();
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const hasResetHandler = typeof this.props.onReset === "function";
      const buttonLabel = hasResetHandler ? "Try again" : "Reload app";

      return (
        <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-red-900">Something went wrong.</p>
              <p className="mt-1 text-red-700">
                Please {hasResetHandler ? "try again" : "reload the app"} to continue.
              </p>
              {error ? (
                <p className="mt-2 text-xs text-red-600">
                  Details: {String(error.message || error)}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-red-100"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
