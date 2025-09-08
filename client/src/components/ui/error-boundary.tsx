import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log actual errors, not network connectivity issues
    if (error.message.includes('Failed to fetch')) {
      console.log('[ERROR-BOUNDARY] Network connectivity issue caught, not logging as error');
      return;
    }
    
    console.error('[ERROR-BOUNDARY] Unexpected error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Don't show error UI for network issues
      if (this.state.error?.message.includes('Failed to fetch')) {
        console.log('[ERROR-BOUNDARY] Network error detected, continuing normal render');
        return this.props.children;
      }

      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.resetError}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error) => {
    // Ignore network connectivity issues
    if (error.message.includes('Failed to fetch')) {
      console.log('[ERROR-HANDLER] Network issue ignored to prevent overlay spam');
      return;
    }
    
    // Log other errors
    console.error('[ERROR-HANDLER] Error caught:', error);
    throw error;
  };
}