import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0d0f17] text-white p-6 font-sans">
          <div className="max-w-md w-full bg-[#161b22] border border-[#30363d] rounded-xl p-8 shadow-2xl text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
              <p className="text-gray-400 text-sm">
                The IDE encountered an unexpected error and had to stop rendering.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-black/40 rounded-lg p-4 font-mono text-xs text-red-400/80 overflow-auto max-h-32 border border-red-500/20">
                <p className="font-bold underline mb-1">Error Trace:</p>
                {this.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-none h-11"
              >
                <RefreshCcw className="w-4 h-4" />
                Reload IDE
              </Button>
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                className="flex items-center justify-center gap-2 border-[#30363d] text-gray-300 hover:bg-[#21262d] h-11"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>

            <p className="text-[10px] text-gray-500 pt-4">
              If this keeps happening, please clear your browser cache or report the issue.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
