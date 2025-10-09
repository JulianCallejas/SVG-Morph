import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log error to external service in production
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you would send this to an error tracking service
    // like Sentry, LogRocket, or Bugsnag
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: this.props.level || 'component'
    };

    // For now, just log to localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('svg-morph-errors') || '[]');
      existingErrors.push(errorData);
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      localStorage.setItem('svg-morph-errors', JSON.stringify(existingErrors));
    } catch (e) {
      console.error('Failed to log error to localStorage:', e);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: ''
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = async () => {
    const { error, errorInfo, errorId } = this.state;
    const errorDetails = `
Error ID: ${errorId}
Message: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.error('Failed to copy error details:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId } = this.state;
      const { level = 'component' } = this.props;
      const canRetry = this.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            {/* Error Title */}
            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
              {level === 'critical' ? 'Critical Error' : 'Something went wrong'}
            </h1>

            {/* Error Message */}
            <p className="text-gray-600 text-center mb-6">
              {level === 'critical' 
                ? 'A critical error occurred that requires reloading the application.'
                : 'We encountered an unexpected error. You can try again or reload the page.'
              }
            </p>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === 'development' && error && (
              <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Error Details:</h3>
                <p className="text-sm text-red-600 font-mono break-all">
                  {error.message}
                </p>
                <details className="mt-2">
                  <summary className="text-sm text-gray-600 cursor-pointer">
                    Stack Trace
                  </summary>
                  <pre className="text-xs text-gray-600 mt-2 overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </details>
              </div>
            )}

            {/* Error ID */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Error ID:</p>
                  <p className="text-sm font-mono text-gray-900">{errorId}</p>
                </div>
                <button
                  onClick={this.copyErrorDetails}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  title="Copy error details"
                >
                  {this.state.copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {canRetry && level !== 'critical' && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again ({this.maxRetries - this.retryCount} attempts left)</span>
                </button>
              )}

              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Go to Home</span>
              </button>
            </div>

            {/* Report Bug Link */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  // In a real app, this would open a bug report form or email
                  window.open('mailto:support@example.com?subject=SVG Morph Error Report&body=' + encodeURIComponent(`Error ID: ${errorId}\nPlease describe what you were doing when this error occurred.`));
                }}
                className="w-full flex items-center justify-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <Bug className="w-4 h-4" />
                <span>Report this issue</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different contexts
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page">
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode; 
  fallback?: ReactNode;
  name?: string;
}> = ({ children, fallback, name }) => (
  <ErrorBoundary 
    level="component"
    fallback={fallback || (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">
            {name ? `${name} Error` : 'Component Error'}
          </span>
        </div>
        <p className="text-red-600 text-sm mt-1">
          This component encountered an error and couldn't render properly.
        </p>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export const CriticalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="critical">
    {children}
  </ErrorBoundary>
);

// Hook for programmatic error handling
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context || 'unknown context'}:`, error);
    
    // Log to the same error tracking system
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    try {
      const existingErrors = JSON.parse(localStorage.getItem('svg-morph-errors') || '[]');
      existingErrors.push(errorData);
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      localStorage.setItem('svg-morph-errors', JSON.stringify(existingErrors));
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  };

  return { handleError };
};
