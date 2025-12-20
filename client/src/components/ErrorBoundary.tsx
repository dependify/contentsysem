// Error Boundary component with retry
import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({ errorInfo });

        // Could send to error tracking service here
        // e.g., Sentry.captureException(error, { extra: errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
                        <p className="text-gray-400 mb-6">
                            An unexpected error occurred. The error has been logged and we'll look into it.
                        </p>

                        {this.state.error && (
                            <div className="mb-6 p-4 bg-gray-800 rounded-lg text-left">
                                <p className="text-red-400 text-sm font-mono mb-2">
                                    {this.state.error.name}: {this.state.error.message}
                                </p>
                                {this.state.errorInfo && (
                                    <details className="text-gray-500 text-xs">
                                        <summary className="cursor-pointer hover:text-gray-300">Stack trace</summary>
                                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-3">
                            <Button variant="ghost" onClick={this.handleGoHome}>
                                <Home size={16} /> Go Home
                            </Button>
                            <Button onClick={this.handleRetry}>
                                <RefreshCw size={16} /> Try Again
                            </Button>
                        </div>
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
        console.error('Error:', error);
        // Could add toast notification or redirect
    };
}

export default ErrorBoundary;
