import React from "react";

/**
 * ErrorBoundary component to catch runtime errors and prevent the entire app
 * from unmounting or showing a blank screen. When an error is caught it
 * displays a friendly message along with the error string. This is useful
 * especially in an SPA where exceptions thrown from deeply nested
 * components (e.g. date helpers on undefined values) would otherwise
 * propagate and crash the React tree.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log the error for debugging; in production this could be sent to a
    // monitoring service.
    console.error("ErrorBoundary caught an error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-sm text-red-600">
          <p>Something went wrong:</p>
          <pre className="whitespace-pre-wrap break-all">
            {String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;