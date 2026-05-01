// ─────────────────────────────────────────────────────────
// Agent Types — YFitOps AI Agent
// ─────────────────────────────────────────────────────────

export type AgentActionType =
  | 'read_file'
  | 'write_file'
  | 'edit_file'
  | 'delete_file'
  | 'create_dir'
  | 'run_command'
  | 'search_files'
  | 'open_pr';

export interface AgentAction {
  type: AgentActionType;
  path?: string;
  content?: string;
  diff?: string;
  command?: string;
  args?: string[];
  query?: string;
  explanation: string;
  requiresConfirmation: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'done' | 'failed';
  result?: ActionResult;
}

export interface AgentStep {
  draft?: string;
  critique?: string;
}

export interface AgentResponse {
  final: string;
  actions?: AgentAction[];
  steps?: AgentStep;
}

export interface ActionResult {
  success: boolean;
  output?: string;
  error?: string;
  changedPaths?: string[];
  exitCode?: number;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  actions?: AgentAction[];
  executionResults?: ActionResult[];
  error?: string;
}

export interface ConversationMeta {
  id: string;
  title: string;
  category: string;
  repoId?: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

export function validateAgentResponse(raw: unknown): AgentResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Agent response is not an object');
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.final !== 'string') {
    throw new Error('Agent response missing "final" string');
  }
  if (r.actions !== undefined && !Array.isArray(r.actions)) {
    throw new Error('"actions" must be an array');
  }
  return r as unknown as AgentResponse;
}
