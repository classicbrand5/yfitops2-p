// ─────────────────────────────────────────────────────────
// WorkspaceErrorBoundary — Section E1
//
// Catches any React render errors in the workspace,
// shows a branded crash screen, and offers reload.
// ─────────────────────────────────────────────────────────

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class WorkspaceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[WorkspaceErrorBoundary] Caught error:', error, info);
    this.setState({ errorInfo: info.componentStack ?? null });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-6 p-8"
        style={{ background: 'var(--bg-void, #060609)', fontFamily: 'var(--font-body)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(255,77,109,0.1)',
            border: '1px solid rgba(255,77,109,0.25)',
          }}
        >
          <AlertTriangle
            className="w-8 h-8"
            style={{ color: '#FF4D6D' }}
          />
        </div>

        <div className="text-center max-w-md">
          <h2
            className="text-xl font-bold mb-2"
            style={{
              color: '#EEEEFF',
              fontFamily: 'var(--font-display)',
            }}
          >
            Workspace crashed
          </h2>
          <p
            className="text-sm mb-4 leading-relaxed"
            style={{ color: '#9494B8' }}
          >
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          {this.state.errorInfo && (
            <details className="text-left mb-4">
              <summary
                className="text-xs cursor-pointer mb-2"
                style={{ color: '#5C5C7A' }}
              >
                View stack trace
              </summary>
              <pre
                className="text-xs p-3 rounded-lg overflow-auto max-h-40"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#5C5C7A',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {this.state.errorInfo}
              </pre>
            </details>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#9494B8',
            }}
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={this.handleReload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              background: 'rgba(0,245,160,0.1)',
              border: '1px solid rgba(0,245,160,0.25)',
              color: '#00F5A0',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Reload Workspace
          </button>
        </div>
      </div>
    );
  }
}
