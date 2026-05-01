// ─────────────────────────────────────────────────────────
// Development / Workspace Types — YFitOps AI Agent
// ─────────────────────────────────────────────────────────

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  lastModified?: number;
}

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  isDirty: boolean;
  language: string;
  cursorLine?: number;
  cursorCol?: number;
}

export interface TerminalSession {
  id: string;
  title: string;
  isRunning: boolean;
  exitCode?: number;
  pid?: number;
  output: string[];
  cwd: string;
  createdAt: number;
}

export type ProcessStatus = 'running' | 'exited' | 'killed' | 'errored';

export interface ProcessRecord {
  id: string;
  command: string;
  status: ProcessStatus;
  exitCode?: number;
  startedAt: number;
  endedAt?: number;
  output: string[];
}

export interface ConnectedRepo {
  id: string;
  userId: string;
  repoOwner: string;
  repoName: string;
  repoUrl?: string;
  description?: string;
  language?: string;
  stars: number;
  defaultBranch: string;
  isPrivate: boolean;
  githubRepoId?: number;
  lastSyncedAt?: string;
  createdAt: string;
}

export interface BuildRecord {
  id: string;
  repoId: string;
  branch: string;
  commitSha?: string;
  commitMessage?: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  logUrl?: string;
  startedAt?: string;
  finishedAt?: string;
  durationSeconds?: number;
  triggeredBy: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionLabel?: string;
  actionHref?: string;
}

export type LayoutMode =
  | 'editor-only'
  | 'split-horizontal'
  | 'split-vertical'
  | 'terminal-only'
  | 'chat-only'
  | 'ide-full';

export type PanelId = 'chat' | 'editor' | 'terminal' | 'explorer' | 'builds' | 'analytics';

export type Theme = 'dark' | 'light';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: 'developer' | 'tech_lead' | 'engineering_manager';
  avatarUrl?: string;
  githubUsername?: string;
  plan: 'starter' | 'pro' | 'team';
  aiRequestsUsed: number;
  aiRequestsLimit: number;
  expertMode: boolean;
  agentAutonomy: 'ask' | 'auto-safe' | 'full-auto';
  onboarded: boolean;
}
