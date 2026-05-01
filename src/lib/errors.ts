// ─────────────────────────────────────────────────────────
// Error Class Hierarchy — YFitOps AI Agent
// ─────────────────────────────────────────────────────────

import type { AgentAction } from '@/types/agent.types';

export class YFitOpsError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'YFitOpsError';
  }
}

export class WebContainerError extends YFitOpsError {
  constructor(message: string, details?: unknown) {
    super(message, 'WEBCONTAINER_ERROR', details);
    this.name = 'WebContainerError';
  }
}

export class FilesystemError extends YFitOpsError {
  constructor(message: string, path: string) {
    super(message, 'FILESYSTEM_ERROR', { path });
    this.name = 'FilesystemError';
  }
}

export class AgentExecutionError extends YFitOpsError {
  constructor(message: string, action: AgentAction) {
    super(message, 'AGENT_EXECUTION_ERROR', { action });
    this.name = 'AgentExecutionError';
  }
}

export class BackendUnavailableError extends YFitOpsError {
  constructor(url: string) {
    super(`Backend unavailable: ${url}`, 'BACKEND_UNAVAILABLE', { url });
    this.name = 'BackendUnavailableError';
  }
}

export class AuthenticationError extends YFitOpsError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class DangerousCommandError extends YFitOpsError {
  constructor(command: string) {
    super(`Blocked dangerous command: ${command}`, 'DANGEROUS_COMMAND', { command });
    this.name = 'DangerousCommandError';
  }
}

export class AgentResponseError extends YFitOpsError {
  constructor(message: string, rawResponse?: string) {
    super(message, 'AGENT_RESPONSE_ERROR', { rawResponse });
    this.name = 'AgentResponseError';
  }
}

/** Format any error to a user-readable string */
export function formatError(err: unknown): string {
  if (err instanceof YFitOpsError) {
    return `[${err.code}] ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
