"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: "page" | "component" | "critical";
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export interface ErrorBoundaryFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  level: "page" | "component" | "critical";
  errorId: string | null;
}

/**
 * Production-grade error boundary with comprehensive error handling
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, level = "component" } = this.props;

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("🚨 Error Boundary Caught Error");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("Component Stack:", errorInfo.componentStack);
      console.groupEnd();
    }

    // Report error to monitoring service
    this.reportError(error, errorInfo, level);

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Auto-reset for component-level errors after delay
    if (level === "component") {
      this.scheduleAutoReset();
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private reportError = (
    error: Error,
    errorInfo: ErrorInfo,
    level: string,
  ): void => {
    // In production, this would send to error tracking service
    // like Sentry, Bugsnag, or custom logging endpoint
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level,
      timestamp: new Date().toISOString(),
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : "SSR",
      url: typeof window !== "undefined" ? window.location.href : "SSR",
      errorId: this.state.errorId,
    };

    // Send to error tracking service
    if (process.env.NODE_ENV === "production") {
      // Example: Send to monitoring service
      fetch("/api/errors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorReport),
      }).catch((reportError) => {
        console.error("Failed to report error:", reportError);
      });
    }

    // Log structured error for local development
    console.error("Error Report:", errorReport);
  };

  private scheduleAutoReset = (): void => {
    // Auto-reset component-level errors after 10 seconds
    this.resetTimeoutId = setTimeout(() => {
      this.resetError();
    }, 10000);
  };

  private resetError = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, errorId } = this.state;
    const {
      children,
      fallback: CustomFallback,
      level = "component",
    } = this.props;

    if (hasError) {
      if (CustomFallback) {
        return (
          <CustomFallback
            error={error}
            errorInfo={errorInfo}
            resetError={this.resetError}
            level={level}
            errorId={errorId}
          />
        );
      }

      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
          level={level}
          errorId={errorId}
        />
      );
    }

    return children;
  }
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({
  error,
  resetError,
  level,
  errorId,
}: ErrorBoundaryFallbackProps): React.ReactElement {
  const isComponentLevel = level === "component";
  const isCritical = level === "critical";

  return (
    <div
      className={`
        flex flex-col items-center justify-center p-8 text-center
        ${isComponentLevel ? "min-h-[200px] bg-red-50 border border-red-200 rounded-lg" : "min-h-screen bg-red-50"}
        ${isCritical ? "bg-red-100 border-red-300" : ""}
      `}
      data-testid="error-boundary"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center space-y-4 max-w-md">
        {/* Error Icon */}
        <div
          className={`p-4 rounded-full ${isCritical ? "bg-red-200" : "bg-red-100"}`}
        >
          {isCritical ? (
            <Bug className="h-8 w-8 text-red-600" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-red-600" />
          )}
        </div>

        {/* Error Title */}
        <h2 className="text-xl font-semibold text-red-800">
          {isCritical
            ? "Critical Error"
            : isComponentLevel
              ? "Component Error"
              : "Application Error"}
        </h2>

        {/* Error Message */}
        <div className="space-y-2">
          <p className="text-red-700">
            {isCritical
              ? "A critical error has occurred that requires immediate attention."
              : isComponentLevel
                ? "This component encountered an error and could not render properly."
                : "Something went wrong. Please try again or refresh the page."}
          </p>

          {process.env.NODE_ENV === "development" && error && (
            <details className="mt-4 p-4 bg-red-100 border border-red-200 rounded text-left">
              <summary className="cursor-pointer font-medium text-red-800">
                Technical Details (Development)
              </summary>
              <pre className="mt-2 text-sm text-red-700 whitespace-pre-wrap overflow-auto max-h-40">
                {error.message}
                {error.stack && `\n\nStack Trace:\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>

        {/* Error ID for support */}
        {errorId && (
          <p className="text-xs text-red-600 font-mono">Error ID: {errorId}</p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={resetError}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            data-testid="error-boundary-retry"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>

          {!isComponentLevel && (
            <button
              onClick={() => (window.location.href = "/")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              data-testid="error-boundary-home"
            >
              <Home className="h-4 w-4" />
              Go Home
            </button>
          )}
        </div>

        {/* Help Text */}
        <p className="text-sm text-red-600 mt-4">
          If this problem persists, please contact support with the error ID
          above.
        </p>
      </div>
    </div>
  );
}

/**
 * Convenience wrapper for page-level error boundaries
 */
export function PageErrorBoundary({
  children,
  ...props
}: Omit<Props, "level">): React.ReactElement {
  return (
    <ErrorBoundary level="page" {...props}>
      {children}
    </ErrorBoundary>
  );
}

/**
 * Convenience wrapper for component-level error boundaries
 */
export function ComponentErrorBoundary({
  children,
  ...props
}: Omit<Props, "level">): React.ReactElement {
  return (
    <ErrorBoundary level="component" {...props}>
      {children}
    </ErrorBoundary>
  );
}

/**
 * Convenience wrapper for critical error boundaries
 */
export function CriticalErrorBoundary({
  children,
  ...props
}: Omit<Props, "level">): React.ReactElement {
  return (
    <ErrorBoundary level="critical" {...props}>
      {children}
    </ErrorBoundary>
  );
}
