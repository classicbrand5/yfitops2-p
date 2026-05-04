// Monaco worker environment — MUST be first before any monaco import
import './editor/monacoEnv';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ── Phase 2 fix: Global error handlers ───────────────────
// Logs unhandled errors to console for debugging.
// PanelErrorBoundary handles React component errors;
// these handlers catch truly global (non-React) failures.
window.onerror = (message, source, line, col, error) => {
  console.error('[global error]', { message, source, line, col, error });
  // Return false so the browser still logs the error normally
  return false;
};

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  console.error('[unhandled rejection]', event.reason);
};

createRoot(document.getElementById('root')!).render(<App />);
