// ─────────────────────────────────────────────────────────
// Typed Error Hierarchy — YFitOps AI Agent (Section A3)
// ─────────────────────────────────────────────────────────

export class YFitOpsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'YFitOpsError';
  }
}

export class WebContainerError extends YFitOpsError {
  constructor(message: string) {
    super(message, 'WC_ERROR');
    this.name = 'WebContainerError';
  }
}

export class FilesystemError extends YFitOpsError {
  constructor(
    message: string,
    public readonly path: string,
  ) {
    super(message, 'FS_ERROR');
    this.name = 'FilesystemError';
  }
}

export class AgentExecutionError extends YFitOpsError {
  constructor(
    message: string,
    public readonly actionType: string,
  ) {
    super(message, 'AGENT_EXEC_ERROR');
    this.name = 'AgentExecutionError';
  }
}

export class BackendUnavailableError extends YFitOpsError {
  constructor() {
    super('Supabase not configured', 'BACKEND_UNAVAILABLE');
    this.name = 'BackendUnavailableError';
  }
}

export class AuthError extends YFitOpsError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

export class DangerousCommandError extends YFitOpsError {
  constructor(cmd: string) {
    super(`Blocked dangerous command: ${cmd}`, 'DANGEROUS_CMD');
    this.name = 'DangerousCommandError';
  }
}

export class RateLimitError extends YFitOpsError {
  constructor(public readonly retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends YFitOpsError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}
