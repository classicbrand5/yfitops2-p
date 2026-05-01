// ─────────────────────────────────────────────────────────
// executeAction — Phase 7: Agent Action Execution
//
// Bridges AgentAction objects (from edge function) to the
// real WebContainer filesystem and process API.
//
// Action type mapping (agent.types.ts ↔ WebContainer):
//   read_file    → fs.readFile
//   write_file   → fs.writeFile  (creates if not exists)
//   edit_file    → fs.writeFile  (overwrites)
//   delete_file  → fs.rm (recursive)
//   create_dir   → fs.mkdir (recursive)
//   run_command  → container.spawn
//   search_files → fs.readdir + content search (best-effort)
//   open_pr      → not executable client-side (informational)
// ─────────────────────────────────────────────────────────

import type { WebContainer } from '@webcontainer/api';
import {
  writeFile,
  readFile,
  mkdir,
  unlink,
  buildFileTree,
} from '../core/webcontainer/fs';
import { spawnProcess } from '../core/webcontainer/process';
import type { AgentAction, ActionResult } from '../types/agent.types';

// ── Public API ────────────────────────────────────────────

export async function executeAction(
  container: WebContainer,
  action: AgentAction,
): Promise<ActionResult> {
  try {
    switch (action.type) {
      case 'write_file':
        return await execWriteFile(container, action);

      case 'edit_file':
        return await execEditFile(container, action);

      case 'read_file':
        return await execReadFile(container, action);

      case 'delete_file':
        return await execDeleteFile(container, action);

      case 'create_dir':
        return await execCreateDir(container, action);

      case 'run_command':
        return await execRunCommand(container, action);

      case 'search_files':
        return await execSearchFiles(container, action);

      case 'open_pr':
        return {
          success: false,
          error: 'open_pr cannot be executed from the browser IDE. Use the GitHub UI.',
        };

      default: {
        const exhaustive: never = action.type;
        return { success: false, error: `Unknown action type: ${exhaustive}` };
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[executeAction] Error:', message, action);
    return { success: false, error: message };
  }
}

// ── Returns true if the action touches the filesystem ─────
// Used by callers to decide whether to refresh the file tree.
export function isFileSystemAction(type: AgentAction['type']): boolean {
  return ['write_file', 'edit_file', 'delete_file', 'create_dir'].includes(type);
}

// ─────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────

async function execWriteFile(
  container: WebContainer,
  action: AgentAction,
): Promise<ActionResult> {
  if (!action.path) {
    return { success: false, error: 'write_file requires a path' };
  }
  if (action.content === undefined) {
    return { success: false, error: 'write_file requires content' };
  }

  // Ensure parent directory exists
  await ensureParentDir(container, action.path);
  await writeFile(container, action.path, action.content);

  return {
    success: true,
    output: `Created ${action.path}`,
    changedPaths: [action.path],
  };
}

async function execEditFile(
  container: WebContainer,
  action: AgentAction,
): Promise<ActionResult> {
  if (!action.path) {
    return { success: false, error: 'edit_file requires a path' };
  }

  let finalContent: string;

  if (action.content !== undefined) {
    // Full replacement: agent provided the complete new content
    finalContent = action.content;
  } else if (action.diff) {
    // Diff-based: apply a unified diff
    // We do a simple find-and-replace approach since we can't run `patch` in browser
    let current = '';
    try {
      current = await readFile(container, action.path);
    } catch {
      return { success: false, error: `edit_file: file not found at ${action.path}` };
    }
    finalContent = applyDiff(current, action.diff);
  } else {
    return { success: false, error: 'edit_file requires either content or diff' };
  }

  await ensureParentDir(container, action.path);
  await writeFile(container, action.path, finalContent);

  return {
    success: true,
    output: `Edited ${action.path}`,
    changedPaths: [action.path],
  };
}

async function execReadFile(
  container: WebContainer,
  action: AgentAction,
): Promise<ActionResult> {
  if (!action.path) {
    return { success: false, error: 'read_file requires a path' };
  }
  try {
    const content = await readFile(container, action.path);
    return {
      success: true,
      output: content,
      changedPaths: [],
    };
  } catch {
    return { success: false, error: `File not found: ${action.path}` };
  }
}

async function execDeleteFile(
  container: WebContainer,
  action: AgentAction,
): Promise<ActionResult> {
  if (!action.path) {
    return { success: false, error: 'delete_file requires a path' };
  }
  await unlink(container, action.path);
  return {
    success: true,
    output: `Deleted ${action.path}`,
    changedPaths: [action.path],
  };
}

async function execCreateDir(
  container: WebContainer,
  action: AgentAction,
): Promise<ActionResult> {
  if (!action.path) {
    return { success: false, error: 'create_dir requires a path' };
  }
  await mkdir(container, action.path);
  return {
    success: true,
    output: `Directory created: ${action.path}`,
    changedPaths: [action.path],
  };
}

async function execRunCommand(
  container: WebContainer,
  action: AgentAction,
): Promise<ActionResult> {
  if (!action.command) {
    return { success: false, error: 'run_command requires a command' };
  }

  // Parse command into binary + args if args array is not provided
  let bin = action.command;
  let args = action.args ?? [];

  if (args.length === 0 && action.command.includes(' ')) {
    const parts = action.command.split(/\s+/);
    bin = parts[0];
    args = parts.slice(1);
  }

  const result = await spawnProcess(container, bin, args);

  const output = [
    ...result.stdout,
    ...(result.stderr.length ? ['--- stderr ---', ...result.stderr] : []),
  ].join('').trim();

  return {
    success: result.exitCode === 0,
    output: output || (result.exitCode === 0 ? '(no output)' : `Exit code: ${result.exitCode}`),
    exitCode: result.exitCode,
    changedPaths: [],
  };
}

async function execSearchFiles(
  container: WebContainer,
  action: AgentAction,
): Promise<ActionResult> {
  const query = action.query ?? action.explanation ?? '';
  if (!query) {
    return { success: false, error: 'search_files requires a query' };
  }

  try {
    // Walk the file tree and check filenames + content
    const tree = await buildFileTree(container, '/');
    const matches: string[] = [];

    const walk = (nodes: typeof tree) => {
      for (const node of nodes) {
        if (node.name.toLowerCase().includes(query.toLowerCase())) {
          matches.push(node.path);
        }
        if (node.children) walk(node.children);
      }
    };

    walk(tree);

    const output = matches.length
      ? `Found ${matches.length} match(es):\n${matches.join('\n')}`
      : `No files matched "${query}"`;

    return { success: true, output, changedPaths: [] };
  } catch (err: unknown) {
    return { success: false, error: `Search failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/**
 * Ensure all parent directories exist for a given file path.
 * Uses mkdir with { recursive: true } so it's a no-op if they exist.
 */
async function ensureParentDir(container: WebContainer, filePath: string): Promise<void> {
  const parts = filePath.split('/').filter(Boolean);
  if (parts.length <= 1) return; // file is in root

  const dir = '/' + parts.slice(0, -1).join('/');
  await mkdir(container, dir);
}

/**
 * Minimal unified diff applicator.
 *
 * Handles simple +/- hunks produced by the AI (not a full patch implementation).
 * Lines starting with '-' are removed, lines starting with '+' are added,
 * context lines (starting with ' ') are used for anchoring.
 *
 * For complex diffs the agent should supply full `content` instead.
 */
function applyDiff(original: string, diff: string): string {
  const originalLines = original.split('\n');
  const result: string[] = [];
  let origIdx = 0;

  const diffLines = diff.split('\n');

  for (const line of diffLines) {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
      continue; // skip header lines
    }

    if (line.startsWith('+')) {
      result.push(line.slice(1)); // add new line
    } else if (line.startsWith('-')) {
      origIdx++; // skip original line
    } else {
      // Context line — emit original
      if (origIdx < originalLines.length) {
        result.push(originalLines[origIdx]);
        origIdx++;
      }
    }
  }

  // Append any remaining original lines not covered by the diff
  while (origIdx < originalLines.length) {
    result.push(originalLines[origIdx]);
    origIdx++;
  }

  return result.join('\n');
}
