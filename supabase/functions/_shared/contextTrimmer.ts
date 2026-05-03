// ─────────────────────────────────────────────────────────
// contextTrimmer — shared Supabase Edge Function utility
// Trims workspace context to a budget of MAX_CONTEXT_CHARS.
// Priority order: pinnedContext > activeFile > openFiles
//                > terminalOutput > repoInfo > fileTree
// ─────────────────────────────────────────────────────────

const MAX_CONTEXT_CHARS = 12_000;

interface WorkspaceContext {
  openFiles?:     string[];
  activeFile?:    string;
  fileTree?:      unknown;
  terminalOutput?: string;
  pinnedContext?: Array<{ label: string; content: string; type: string }>;
  repoInfo?:      unknown;
  [key: string]:  unknown;
}

interface TrimResult {
  context: string;
  wasTrimmed: boolean;
  charCount: number;
}

export function trimWorkspaceContext(ctx: WorkspaceContext): TrimResult {
  const priority: Record<string, unknown> = {};

  // ── Highest priority: pinned items user explicitly marked ──
  if (ctx.pinnedContext?.length) {
    priority.pinnedContext = ctx.pinnedContext;
  }

  // ── Active file path (highest signal for edits) ────────────
  if (ctx.activeFile) priority.activeFile = ctx.activeFile;

  // ── Open tabs (just paths, capped at 10) ──────────────────
  if (ctx.openFiles?.length) {
    priority.openFiles = ctx.openFiles.slice(0, 10);
  }

  // ── Terminal output (tail 50 lines) ───────────────────────
  if (ctx.terminalOutput) {
    const lines = ctx.terminalOutput.split('\n');
    priority.terminalOutput = lines.slice(-50).join('\n');
  }

  // ── Repo info (branch, remote) ─────────────────────────────
  if (ctx.repoInfo) priority.repoInfo = ctx.repoInfo;

  // ── File tree (truncated if large) ────────────────────────
  if (ctx.fileTree) {
    const treeStr = JSON.stringify(ctx.fileTree);
    priority.fileTree = treeStr.length > 3_000
      ? treeStr.slice(0, 3_000) + '... [truncated]'
      : ctx.fileTree;
  }

  const full = JSON.stringify(priority, null, 2);
  if (full.length <= MAX_CONTEXT_CHARS) {
    return { context: full, wasTrimmed: false, charCount: full.length };
  }

  // ── Over budget — drop fileTree, truncate terminal further ─
  delete priority.fileTree;
  if (typeof priority.terminalOutput === 'string') {
    priority.terminalOutput = (priority.terminalOutput as string)
      .split('\n').slice(-20).join('\n');
  }

  const trimmed = JSON.stringify(priority, null, 2).slice(0, MAX_CONTEXT_CHARS)
    + '\n... [context truncated]';

  return { context: trimmed, wasTrimmed: true, charCount: trimmed.length };
}
