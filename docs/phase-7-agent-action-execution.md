# Phase 7 — Agent Action Execution

**Status:** ✅ Complete  
**Deployed:** https://yfitops2.pages.dev

---

## Goal

Make agent `AgentAction` items actually execute inside the workspace. Bridge the action cards in `AgentChat.tsx` to the WebContainer filesystem and process API, with a confirmation modal for destructive operations.

---

## What Was Built

### Files Created

| File | Purpose |
|------|---------|
| `src/agent/executeAction.ts` | Action execution engine — maps every AgentActionType to WebContainer calls |
| `src/components/ui/ConfirmModal.tsx` | Glassmorphism confirmation dialog for destructive / requires-confirmation actions |

### Files Modified

| File | Change |
|------|--------|
| `src/components/features/AgentChat.tsx` | Added Apply/Review buttons to ActionCards, execution flow, ConfirmModal integration, file tree refresh |

---

## Architecture

### Execution Flow

```
ActionCard "Apply" button clicked
  → isDestructive or requiresConfirmation?
      Yes → setPendingAction({ action, msgId, actionIdx })
              → ConfirmModal opens
              → User clicks "Confirm"
              → runAction(action, msgId, actionIdx)
      No  → runAction(action, msgId, actionIdx) directly

runAction:
  1. setExecutingActionId(`${msgId}-${actionIdx}`)  ← shows spinner on button
  2. updateActionStatus(msgId, idx, 'executing')    ← status badge updates
  3. result = await executeAction(container, action)
  4. updateActionStatus(msgId, idx, result.success ? 'done' : 'failed', result)
  5. setExecutingActionId(null)
  6. toast.success / toast.error
  7. if isFileSystemAction(action.type) → refreshTree() → setFileTree(newTree)
```

### Container Acquisition

`AgentChat` cannot call `useWebContainer()` (it's a feature component, not a page). The WebContainer singleton is accessed via `window.__yfitops_container` — set by `useWebContainer` after boot. `AgentChat` polls this every 500ms via `setInterval`, storing the reference in `containerRef`.

---

## executeAction.ts

### Action Type Routing

| Type | Implementation |
|------|---------------|
| `write_file` | `ensureParentDir()` + `writeFile(container, path, content)` |
| `edit_file` | If `content` provided: full replace. If `diff` provided: `applyDiff(current, diff)` → write |
| `read_file` | `readFile(container, path)` — returns content in `result.output` |
| `delete_file` | `unlink(container, path)` — uses `fs.rm({ recursive: true })` |
| `create_dir` | `mkdir(container, path)` — uses `fs.mkdir({ recursive: true })` |
| `run_command` | Parses binary + args, calls `spawnProcess()`, collects stdout/stderr |
| `search_files` | Walks file tree, matches filenames against `action.query` |
| `open_pr` | Returns informational error — not executable from browser |

### Diff Applicator

`applyDiff(original, diff)` is a minimal unified diff parser:
- Skips `+++`, `---`, `@@` header lines
- `+` lines → added to output
- `-` lines → original line skipped
- Context lines → copied from original

For complex multi-hunk diffs, the agent should provide full `content` instead.

### `ensureParentDir`

Before writing a file, `ensureParentDir` extracts the directory path and calls `mkdir({ recursive: true })` to ensure it exists. This prevents `ENOENT` errors when the agent creates files in new subdirectories.

---

## ConfirmModal

### Design

- **Glassmorphism card** on a blurred (`backdrop-filter: blur(6px)`) semi-transparent backdrop
- `rgba(0,0,0,0.65)` overlay
- Card: `rgba(13,13,20,0.97)` background + subtle white border + inset glow
- Auto-focus on confirm button (`setTimeout(80ms)`) for keyboard accessibility
- Escape key closes (cancels) via `document.addEventListener('keydown')`
- Click outside (on backdrop) also cancels

### Variants

**Destructive:**
- `AlertTriangle` icon in `#FF4D6D`
- Confirm button: red tint background + red border
- Default label: "Confirm"

**Approve:**
- `CheckCircle2` icon in `#00F5A0`
- Confirm button: mint tint background + mint border
- Default label: "Approve"

### Props

```ts
{
  open: boolean;
  title: string;
  description: string;
  detail?: string;           // optional monospace code block (file content preview)
  isDestructive?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

---

## ActionCard Updates

Each `ActionCard` now receives:
- `onApply: (action) => void` — triggers immediate execution (no confirmation)
- `onReview: (action) => void` — triggers confirmation modal
- `isExecuting: boolean` — shows spinner on button while action runs

### Button Logic

```
action.status === 'pending' && action.type !== 'open_pr':
  isDestructive or requiresConfirmation?
    → "Review" button (warning yellow)
  else:
    → "Apply" button (mint)
```

Button is hidden after the action leaves `pending` state (transitions to `executing → done | failed`).

### Status Badge Progression

`pending` (no badge) → `executing` (yellow badge) → `done` (mint badge) | `failed` (red badge)

---

## File Tree Refresh

After any action where `isFileSystemAction(action.type) === true`, `refreshTree()` is called:

```ts
const tree = await buildFileTree(container, '/');
setFileTree(tree);
```

This is the same function used by `useWebContainer`'s `refreshFileTree`. It rebuilds the entire tree from the WebContainer FS and updates Zustand, causing `FileTree` to re-render with the new structure.

---

## Destructive Action Classification

```ts
const DESTRUCTIVE_TYPES: AgentAction['type'][] = ['delete_file', 'open_pr'];
```

Additionally, any action with `action.requiresConfirmation === true` shows the Review button (even if not in this list), respecting what the AI decided.

---

## Error Handling

All execution errors are caught in `executeAction.ts`'s outer `try/catch` and returned as `{ success: false, error: string }`. The `runAction` handler then:
1. Updates the action status to `'failed'` in the store
2. Shows a `toast.error(result.error)` to the user

The action card shows the error in a red inline result block.

---

## Known Limitations

- **WebContainer acquisition via `window.__yfitops_container`** — this is a side-channel singleton pattern. A React Context would be cleaner but requires refactoring WorkspacePage to provide it.
- **Diff applicator** — minimal implementation. Multi-hunk diffs with line number anchors are not supported. For best results, the AI should return full `content` for `edit_file`.
- **`run_command` args parsing** — if the agent returns `command: "npm install react"` with no `args` array, the parser splits on whitespace. Commands with quoted arguments (e.g., `echo "hello world"`) may not parse correctly.
- **No rollback** — no pre-action file snapshots are taken. Failed actions cannot be automatically undone. Manual undo via Cmd+Z in Monaco is available for in-editor changes but not for WebContainer FS writes.
- **`search_files` is filename-only** — current implementation matches filenames, not file content. Full-text search would require reading each file.
