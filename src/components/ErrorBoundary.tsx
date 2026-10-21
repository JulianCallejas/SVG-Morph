import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Check } from 'lucide-react';
import { Button } from './ui/Button';

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
    if (import.meta.env.DEV) {
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
        <div className="min-h-screen bg-canvas text-content flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface p-6">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-canvas mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-danger" />
            </div>

            {/* Error Title */}
            <h1 className="text-xl font-semibold text-center mb-2">
              {level === 'critical' ? 'Critical Error' : 'Something went wrong'}
            </h1>

            {/* Error Message */}
            <p className="text-muted text-center mb-6">
              {level === 'critical' 
                ? 'A critical error occurred that requires reloading the application.'
                : 'We encountered an unexpected error. You can try again or reload the page.'
              }
            </p>

            {/* Error Details (Development) */}
            {import.meta.env.DEV && error && (
              <div className="mb-6 p-4 bg-canvas">
                <h3 className="font-medium mb-2">Error Details:</h3>
                <p className="text-sm text-danger font-mono break-all">
                  {error.message}
                </p>
                <details className="mt-2">
                  <summary className="text-sm text-muted cursor-pointer">
                    Stack Trace
                  </summary>
                  <pre className="text-sm text-muted mt-2 overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </details>
              </div>
            )}

            {/* Error ID */}
            <div className="mb-6 p-3 bg-canvas">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted">Error ID:</p>
                  <p className="text-sm font-mono break-all">{errorId}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={this.copyErrorDetails}
                  className="shrink-0 px-3 text-sm text-muted"
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
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {canRetry && level !== 'critical' && (
                <Button variant="primary" onClick={this.handleRetry} className="w-full justify-center">
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again ({this.maxRetries - this.retryCount} attempts left)</span>
                </Button>
              )}

              <Button onClick={this.handleReload} className="w-full justify-center">
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </Button>

              <Button variant="ghost" onClick={this.handleGoHome} className="w-full justify-center">
                <Home className="w-4 h-4" />
                <span>Go to Home</span>
              </Button>
            </div>

            {/* Report Bug Link */}
            <div className="mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  window.open('mailto:jc.develop.co@gmail.com?subject=SVG%20Morph%20error%20report&body=' + encodeURIComponent(`Error ID: ${errorId}
Please describe what you were doing when this error occurred.`));
                }}
                className="w-full justify-center text-sm text-muted"
              >
                <Bug className="w-4 h-4" />
                <span>Report this issue</span>
              </Button>
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
      <div className="p-4 bg-surface text-content">
        <div className="flex items-center space-x-2 text-danger">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">
            {name ? `${name} Error` : 'Component Error'}
          </span>
        </div>
        <p className="text-muted text-sm mt-1">
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
