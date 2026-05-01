# Phase 6 — Agent Chat

**Status:** ✅ Complete  
**Deployed:** https://yfitops2.pages.dev

---

## Goal

Replace the Chat panel placeholder with a fully functional AI agent chat interface wired to the `agent-inference` Supabase Edge Function (Gemini 2.5 Flash via OnSpace AI).

---

## What Was Built

### Files Created

| File | Purpose |
|------|---------|
| `src/components/features/AgentChat.tsx` | Full agent chat UI with messages, actions, thinking state |

### Files Modified

| File | Change |
|------|--------|
| `src/pages/WorkspacePage.tsx` | Replaced `ChatBody` placeholder with `<AgentChat />` |

---

## Architecture

### Message Flow

```
User types → Enter key / Send button
→ addMessage(user) to Zustand
→ addMessage(assistant placeholder, content: '') to Zustand  [shows ThinkingDots]
→ setIsThinking(true)
→ supabase.functions.invoke('agent-inference', { messages, workspaceContext })
→ updateMessage(assistantId, { content, actions })
→ setIsThinking(false)
```

### Workspace Context Injected

The agent receives a `workspaceContext` object with every request:

```ts
{
  fileTree: FileNode[],       // up to 80 nodes
  openFiles: { path, language }[],
  activeFile: string | null,
  terminalOutput: string[],   // last 30 lines of active terminal
  expertMode: boolean,
}
```

This enables the agent to answer file-specific questions, suggest edits, and run contextually relevant commands.

### Edge Function Signature

```ts
// Request body
{
  messages: { role: 'user' | 'assistant'; content: string }[];
  workspaceContext: WorkspaceContext;
  expertMode?: boolean;
}

// Response
{
  final: string;              // Markdown-formatted answer
  actions?: AgentAction[];    // Structured actions to execute
  steps?: { draft?: string; critique?: string };
}
```

---

## Components

### `AgentChat`
Main stateful component. Manages:
- `input` state + auto-resize textarea
- `sendInFlightRef` to prevent concurrent sends
- Workspace context builder via `buildContext()`
- Reactive message subscription from Zustand

### `MessageBubble`
Renders a single message:
- **User**: mint-tinted card, right-aligned, user avatar
- **Assistant**: surface-tinted card, left-aligned, bot avatar
- Shows `ThinkingDots` when `content === ''` and role is `assistant`
- Renders `ActionCard[]` below content

### `ActionCard`
Renders a single `AgentAction`:
- Icon + color per action type (`read_file`, `write_file`, `edit_file`, `delete_file`, `create_dir`, `run_command`, `search_files`, `open_pr`)
- Shows `path`, `command`, and `explanation`
- Shows status badge (`pending`, `executing`, `done`, `failed`)
- Shows `needs approval` badge when `requiresConfirmation === true`
- Shows result output inline when `action.result` is set

### `ThinkingDots`
Three animated dots using `animate-thinking` keyframe (defined in `index.css`) with staggered delays — replaces the spinner for a more natural "typing" feel.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift+Enter` | Insert newline |

The textarea auto-resizes from 1 row up to 120px max-height as text grows.

---

## Error Handling

- Uses `FunctionsHttpError` from `@supabase/supabase-js` to extract the actual HTTP status + body from Edge Function errors (avoids generic "non-2xx status code" message)
- Errors are stored in `msg.error` and rendered with an `AlertCircle` icon inside the assistant bubble
- `sendInFlightRef` prevents duplicate requests on double-click or rapid Enter presses

---

## Action Type Reference

| Type | Icon | Color | `requiresConfirmation` |
|------|------|-------|------------------------|
| `read_file` | FileText | Info blue | false |
| `write_file` | FilePlus | Mint | false |
| `edit_file` | FileEdit | Violet | false |
| `delete_file` | Trash2 | Danger red | **true** |
| `create_dir` | FolderPlus | Warning yellow | false |
| `run_command` | Terminal | Cyan | depends |
| `search_files` | Search | Info blue | false |
| `open_pr` | GitPullRequest | Mint | **true** |

---

## State Used from Zustand

| Selector | Purpose |
|----------|---------|
| `conversations` | List of conversation metadata |
| `activeConversationId` | Which conversation is displayed |
| `messages[activeConversationId]` | Reactive message list |
| `isThinking` | Global thinking flag (disables input) |
| `expertMode` | Passed to edge function for extended reasoning |
| `fileTree`, `openTabs`, `activeTabId` | Workspace context for agent |
| `terminalSessions`, `activeTerminalId` | Terminal output context |

---

## Next Steps (Phase 7+)

- **Autonomous action execution**: Wire approved `AgentAction` items to WebContainer FS / process API
- **Streaming responses**: Convert edge function to SSE and stream `final` token-by-token into the message bubble
- **Conversation list**: Show past conversations in a sidebar with rename/delete
- **Confirmation flow**: When `requiresConfirmation === true`, show an approve/reject modal before executing
- **Rollback on failure**: Store pre-action file snapshots and restore on `action.status === 'failed'`
