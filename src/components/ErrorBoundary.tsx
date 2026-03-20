import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 rounded-2xl border border-red-500/30">
            <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <div className="bg-black/40 p-3 rounded-lg border border-white/10 overflow-auto max-h-40 mb-4">
              <code className="text-xs text-red-300 font-mono">
                {this.state.error?.message}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-dark-bg font-bold py-2 rounded-xl hover:brightness-110 transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
