// ─────────────────────────────────────────────────────────
// PanelErrorBoundary — Phase 2
//
// Class-based React Error Boundary that wraps individual
// workspace panels. On crash: shows a recovery card with
// Retry + Copy error buttons. Logs to Supabase events table
// (fire-and-forget). Other panels are unaffected.
// ─────────────────────────────────────────────────────────

import React from 'react';
import { RefreshCw, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface Props {
  panelName: string;
  children: React.ReactNode;
}

export class PanelErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ errorInfo: info });
    console.error(`[PanelErrorBoundary:${this.props.panelName}]`, error, info);

    // Fire-and-forget to Supabase events table — Phase 2 fix: panel crash analytics
    const supabaseUrl  = (import.meta as Record<string, any>).env?.VITE_SUPABASE_URL  as string | undefined;
    const supabaseAnon = (import.meta as Record<string, any>).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

    if (supabaseUrl && supabaseAnon) {
      fetch(`${supabaseUrl}/rest/v1/events`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnon,
          Authorization: `Bearer ${supabaseAnon}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          event_type: 'client_error',
          payload: {
            panel: this.props.panelName,
            message: error.message,
            stack: error.stack?.slice(0, 500) ?? '',
            componentStack: info.componentStack?.slice(0, 500) ?? '',
          },
        }),
      }).catch(() => {
        // Swallow — error reporting must never cause another error
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleCopy = () => {
    const text = [
      `Panel: ${this.props.panelName}`,
      `Error: ${this.state.error?.message ?? 'Unknown'}`,
      '',
      this.state.error?.stack ?? '',
      '',
      this.state.errorInfo?.componentStack ?? '',
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      toast.success('Error details copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy — check clipboard permissions');
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const truncatedMessage = this.state.error?.message?.slice(0, 200) ?? 'Unknown error';
    const hasMore = (this.state.error?.message?.length ?? 0) > 200;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          gap: '12px',
          padding: '24px',
          background: 'rgba(13,13,20,0.97)',
          boxSizing: 'border-box',
        }}
        role="alert"
        aria-live="assertive"
      >
        {/* Icon */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,77,109,0.10)',
            border: '1px solid rgba(255,77,109,0.25)',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={22} color="#FF4D6D" />
        </div>

        {/* Panel name + headline */}
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              color: '#EEEEFF',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'Space Grotesk, var(--font-display), sans-serif',
              margin: 0,
              marginBottom: 4,
            }}
          >
            {this.props.panelName} crashed
          </p>
          <p
            style={{
              color: '#5C5C7A',
              fontSize: '10px',
              fontFamily: 'Space Grotesk, sans-serif',
              margin: 0,
            }}
          >
            This panel threw an unhandled error
          </p>
        </div>

        {/* Error message */}
        <div
          style={{
            background: 'rgba(255,77,109,0.06)',
            border: '1px solid rgba(255,77,109,0.15)',
            borderRadius: 8,
            padding: '8px 12px',
            maxWidth: 320,
            width: '100%',
          }}
        >
          <p
            style={{
              color: '#FF8FA0',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, var(--font-mono), monospace',
              margin: 0,
              wordBreak: 'break-all',
              lineHeight: 1.55,
            }}
          >
            {truncatedMessage}
            {hasMore && (
              <span style={{ color: '#5C5C7A', fontStyle: 'italic' }}> …(use Copy for full stack)</span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Retry — mint */}
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid rgba(0,245,160,0.3)',
              background: 'rgba(0,245,160,0.08)',
              color: '#00F5A0',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'Space Grotesk, sans-serif',
              cursor: 'pointer',
              transition: 'background 150ms ease',
              minWidth: 44,
              minHeight: 44,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,245,160,0.14)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,245,160,0.08)';
            }}
            aria-label="Retry this panel"
          >
            <RefreshCw size={12} />
            Retry
          </button>

          {/* Copy error — ghost */}
          <button
            type="button"
            onClick={this.handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: '#9494B8',
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: 'Space Grotesk, sans-serif',
              cursor: 'pointer',
              transition: 'background 150ms ease',
              minWidth: 44,
              minHeight: 44,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
            }}
            aria-label="Copy error details to clipboard"
          >
            <Copy size={12} />
            Copy error
          </button>
        </div>
      </div>
    );
  }
}
