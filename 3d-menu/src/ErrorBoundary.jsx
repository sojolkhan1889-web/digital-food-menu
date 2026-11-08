import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = window.location.pathname.includes('/admin') ? '/admin' : '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#111827] border border-red-500/30 p-6 rounded-[5px] shadow-xl text-center">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-400 mb-4">
              An unexpected error occurred while rendering the page.
            </p>
            {this.state.error && (
              <pre className="text-[11px] text-red-300 bg-red-950/40 p-3 rounded-[5px] mb-4 text-left overflow-x-auto font-mono max-h-40">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Customer Menu</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

