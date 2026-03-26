import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorDetails = this.state.error?.message;
      try {
        if (errorDetails && errorDetails.startsWith('{')) {
          const parsed = JSON.parse(errorDetails);
          errorDetails = JSON.stringify(parsed, null, 2);
        }
      } catch (e) {
        // Ignore parse error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm text-gray-800 whitespace-pre-wrap">
              {errorDetails || "Unknown error"}
            </pre>
            <button
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
