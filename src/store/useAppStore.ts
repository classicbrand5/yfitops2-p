// ─────────────────────────────────────────────────────────
// YFitOps AI Agent — Zustand Store (Fully Typed)
// Single source of truth for all application state.
// ─────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { generateId } from '@/lib/utils';
import type {
  FileNode,
  EditorTab,
  TerminalSession,
  ProcessRecord,
  ProcessStatus,
  Notification,
  LayoutMode,
  PanelId,
  Theme,
  UserProfile,
} from '@/types/dev.types';
import type {
  AgentAction,
  AgentMessage,
  ActionResult,
  ConversationMeta,
} from '@/types/agent.types';

// ── Re-export types for convenience ──────────────────────
export type {
  FileNode,
  EditorTab,
  TerminalSession,
  ProcessRecord,
  ProcessStatus,
  Notification,
  LayoutMode,
  PanelId,
  Theme,
  UserProfile,
  AgentAction,
  AgentMessage,
  ActionResult,
  ConversationMeta,
};

// ── Store Interface ───────────────────────────────────────
export interface AppState {
  // ── Auth ─────────────────────────────────────────────
  user: UserProfile | null;
  isAuthLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setAuthLoading: (loading: boolean) => void;

  // ── Layout ───────────────────────────────────────────
  layoutMode: LayoutMode;
  splitRatio: number;
  activePanelIds: PanelId[];
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  rightPanelWidth: number;
  theme: Theme;
  expertMode: boolean;
  commandPaletteOpen: boolean;
  focusedPanel: PanelId | null;

  setLayoutMode: (mode: LayoutMode) => void;
  setSplitRatio: (ratio: number) => void;
  togglePanel: (panel: PanelId) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setSidebarWidth: (w: number) => void;
  setRightPanelWidth: (w: number) => void;
  toggleTheme: () => void;
  setExpertMode: (v: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  setFocusedPanel: (panel: PanelId | null) => void;

  // ── Workspace / File System ───────────────────────────
  workspaceReady: boolean;
  workspaceError: string | null;
  fileTree: FileNode[];
  openTabs: EditorTab[];
  activeTabId: string | null;
  dirtyFiles: string[];
  expandedFolders: string[];
  selectedFilePath: string | null;

  setWorkspaceReady: (ready: boolean, error?: string) => void;
  setFileTree: (tree: FileNode[]) => void;
  openFile: (path: string, language: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  markTabDirty: (tabId: string, dirty: boolean) => void;
  setCursorPosition: (tabId: string, line: number, col: number) => void;
  toggleFolder: (path: string) => void;
  setSelectedFile: (path: string | null) => void;
  removeFileFromTree: (path: string) => void;
  addFileToTree: (file: FileNode) => void;

  // ── Terminal ─────────────────────────────────────────
  terminalSessions: Record<string, TerminalSession>;
  activeTerminalId: string | null;

  createTerminalSession: (id: string, cwd?: string) => void;
  removeTerminalSession: (id: string) => void;
  setActiveTerminal: (id: string) => void;
  appendTerminalOutput: (sessionId: string, line: string) => void;
  setTerminalRunning: (sessionId: string, running: boolean) => void;
  setTerminalExitCode: (sessionId: string, code: number) => void;
  updateTerminalTitle: (sessionId: string, title: string) => void;

  // ── Processes ────────────────────────────────────────
  processes: Record<string, ProcessRecord>;

  registerProcess: (p: ProcessRecord) => void;
  updateProcessStatus: (id: string, status: ProcessStatus, exitCode?: number) => void;
  appendProcessOutput: (id: string, line: string) => void;

  // ── Agent / Chat ─────────────────────────────────────
  conversations: ConversationMeta[];
  activeConversationId: string | null;
  messages: Record<string, AgentMessage[]>;
  isThinking: boolean;
  streamingMessageId: string | null;
  pendingActions: AgentAction[];
  agentAutonomy: 'ask' | 'auto-safe' | 'full-auto';
  agentContext: {
    includeGitHistory: boolean;
    includeOpenFiles: boolean;
    includeBuildStatus: boolean;
    includeTerminalOutput: boolean;
    maxContextLines: number;
  };

  setConversations: (convs: ConversationMeta[]) => void;
  setActiveConversation: (id: string | null) => void;
  addConversation: (conv: ConversationMeta) => void;
  addMessage: (convId: string, msg: AgentMessage) => void;
  updateMessage: (convId: string, msgId: string, patch: Partial<AgentMessage>) => void;
  setIsThinking: (v: boolean) => void;
  setStreamingMessageId: (id: string | null) => void;
  setPendingActions: (actions: AgentAction[]) => void;
  updateActionStatus: (
    msgId: string,
    actionIdx: number,
    status: AgentAction['status'],
    result?: ActionResult
  ) => void;
  setAgentAutonomy: (level: 'ask' | 'auto-safe' | 'full-auto') => void;
  updateAgentContext: (patch: Partial<AppState['agentContext']>) => void;
  clearChat: (convId: string) => void;
  createNewConversation: () => string;

  // ── Notifications ────────────────────────────────────
  notifications: Notification[];
  unreadNotificationCount: number;

  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  // ── Build Monitor ────────────────────────────────────
  activeBuildId: string | null;
  setActiveBuildId: (id: string | null) => void;
}

// ── Store Implementation ──────────────────────────────────
export const useAppStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // ── Auth ───────────────────────────────────────
        user: null,
        isAuthLoading: true,

        setUser: (user) =>
          set((state) => {
            state.user = user;
            state.isAuthLoading = false;
          }),

        setAuthLoading: (loading) =>
          set((state) => {
            state.isAuthLoading = loading;
          }),

        // ── Layout ────────────────────────────────────
        layoutMode: 'split-horizontal',
        splitRatio: 0.5,
        activePanelIds: ['explorer', 'editor', 'terminal', 'chat'],
        sidebarCollapsed: false,
        sidebarWidth: 220,
        rightPanelWidth: 380,
        theme: 'dark',
        expertMode: false,
        commandPaletteOpen: false,
        focusedPanel: null,

        setLayoutMode: (mode) =>
          set((state) => {
            state.layoutMode = mode;
          }),

        setSplitRatio: (ratio) =>
          set((state) => {
            state.splitRatio = Math.max(0.2, Math.min(0.8, ratio));
          }),

        togglePanel: (panel) =>
          set((state) => {
            const idx = state.activePanelIds.indexOf(panel);
            if (idx >= 0) {
              state.activePanelIds.splice(idx, 1);
            } else {
              state.activePanelIds.push(panel);
            }
          }),

        setSidebarCollapsed: (v) =>
          set((state) => {
            state.sidebarCollapsed = v;
          }),

        setSidebarWidth: (w) =>
          set((state) => {
            state.sidebarWidth = Math.max(200, Math.min(400, w));
          }),

        setRightPanelWidth: (w) =>
          set((state) => {
            state.rightPanelWidth = Math.max(280, Math.min(600, w));
          }),

        toggleTheme: () =>
          set((state) => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
          }),

        setExpertMode: (v) =>
          set((state) => {
            state.expertMode = v;
          }),

        openCommandPalette: () =>
          set((state) => {
            state.commandPaletteOpen = true;
          }),

        closeCommandPalette: () =>
          set((state) => {
            state.commandPaletteOpen = false;
          }),

        setFocusedPanel: (panel) =>
          set((state) => {
            state.focusedPanel = panel;
          }),

        // ── File System ───────────────────────────────
        workspaceReady: false,
        workspaceError: null,
        fileTree: [],
        openTabs: [],
        activeTabId: null,
        dirtyFiles: [],
        expandedFolders: [],
        selectedFilePath: null,

        setWorkspaceReady: (ready, error) =>
          set((state) => {
            state.workspaceReady = ready;
            state.workspaceError = error ?? null;
          }),

        setFileTree: (tree) =>
          set((state) => {
            state.fileTree = tree;
          }),

        openFile: (path, language) =>
          set((state) => {
            const existing = state.openTabs.find((t) => t.path === path);
            if (existing) {
              state.activeTabId = existing.id;
            } else {
              const tab: EditorTab = {
                id: generateId(),
                path,
                name: path.split('/').pop() ?? path,
                isDirty: false,
                language,
              };
              state.openTabs.push(tab);
              state.activeTabId = tab.id;
            }
            state.selectedFilePath = path;
          }),

        closeTab: (tabId) =>
          set((state) => {
            const idx = state.openTabs.findIndex((t) => t.id === tabId);
            if (idx === -1) return;
            state.openTabs.splice(idx, 1);
            if (state.activeTabId === tabId) {
              const next = state.openTabs[idx] ?? state.openTabs[idx - 1];
              state.activeTabId = next?.id ?? null;
              state.selectedFilePath = next?.path ?? null;
            }
          }),

        setActiveTab: (tabId) =>
          set((state) => {
            state.activeTabId = tabId;
            const tab = state.openTabs.find((t) => t.id === tabId);
            if (tab) state.selectedFilePath = tab.path;
          }),

        markTabDirty: (tabId, dirty) =>
          set((state) => {
            const tab = state.openTabs.find((t) => t.id === tabId);
            if (tab) {
              tab.isDirty = dirty;
              if (dirty && !state.dirtyFiles.includes(tab.path)) {
                state.dirtyFiles.push(tab.path);
              } else if (!dirty) {
                state.dirtyFiles = state.dirtyFiles.filter((p) => p !== tab.path);
              }
            }
          }),

        setCursorPosition: (tabId, line, col) =>
          set((state) => {
            const tab = state.openTabs.find((t) => t.id === tabId);
            if (tab) {
              tab.cursorLine = line;
              tab.cursorCol = col;
            }
          }),

        toggleFolder: (path) =>
          set((state) => {
            const idx = state.expandedFolders.indexOf(path);
            if (idx >= 0) {
              state.expandedFolders.splice(idx, 1);
            } else {
              state.expandedFolders.push(path);
            }
          }),

        setSelectedFile: (path) =>
          set((state) => {
            state.selectedFilePath = path;
          }),

        removeFileFromTree: (_path) =>
          set((state) => {
            // Shallow removal — deep tree mutation handled by refreshFileTree
            state.fileTree = state.fileTree.filter((n) => n.path !== _path);
          }),

        addFileToTree: (file) =>
          set((state) => {
            state.fileTree.push(file);
          }),

        // ── Terminal ──────────────────────────────────
        terminalSessions: {},
        activeTerminalId: null,

        createTerminalSession: (id, cwd = '/') =>
          set((state) => {
            state.terminalSessions[id] = {
              id,
              title: 'bash',
              isRunning: false,
              output: [],
              cwd,
              createdAt: Date.now(),
            };
            state.activeTerminalId = id;
          }),

        removeTerminalSession: (id) =>
          set((state) => {
            delete state.terminalSessions[id];
            if (state.activeTerminalId === id) {
              const ids = Object.keys(state.terminalSessions);
              state.activeTerminalId = ids[ids.length - 1] ?? null;
            }
          }),

        setActiveTerminal: (id) =>
          set((state) => {
            state.activeTerminalId = id;
          }),

        appendTerminalOutput: (sessionId, line) =>
          set((state) => {
            const session = state.terminalSessions[sessionId];
            if (session) {
              session.output.push(line);
              // Keep last 5000 lines
              if (session.output.length > 5000) {
                session.output = session.output.slice(-5000);
              }
            }
          }),

        setTerminalRunning: (sessionId, running) =>
          set((state) => {
            const session = state.terminalSessions[sessionId];
            if (session) session.isRunning = running;
          }),

        setTerminalExitCode: (sessionId, code) =>
          set((state) => {
            const session = state.terminalSessions[sessionId];
            if (session) {
              session.exitCode = code;
              session.isRunning = false;
            }
          }),

        updateTerminalTitle: (sessionId, title) =>
          set((state) => {
            const session = state.terminalSessions[sessionId];
            if (session) session.title = title;
          }),

        // ── Processes ─────────────────────────────────
        processes: {},

        registerProcess: (p) =>
          set((state) => {
            state.processes[p.id] = p;
          }),

        updateProcessStatus: (id, status, exitCode) =>
          set((state) => {
            const p = state.processes[id];
            if (p) {
              p.status = status;
              if (exitCode !== undefined) p.exitCode = exitCode;
              if (status !== 'running') p.endedAt = Date.now();
            }
          }),

        appendProcessOutput: (id, line) =>
          set((state) => {
            const p = state.processes[id];
            if (p) {
              p.output.push(line);
              if (p.output.length > 5000) {
                p.output = p.output.slice(-5000);
              }
            }
          }),

        // ── Agent ─────────────────────────────────────
        conversations: [],
        activeConversationId: null,
        messages: {},
        isThinking: false,
        streamingMessageId: null,
        pendingActions: [],
        agentAutonomy: 'ask',
        agentContext: {
          includeGitHistory: true,
          includeOpenFiles: true,
          includeBuildStatus: true,
          includeTerminalOutput: true,
          maxContextLines: 200,
        },

        setConversations: (convs) =>
          set((state) => {
            state.conversations = convs;
          }),

        setActiveConversation: (id) =>
          set((state) => {
            state.activeConversationId = id;
          }),

        addConversation: (conv) =>
          set((state) => {
            state.conversations.unshift(conv);
          }),

        addMessage: (convId, msg) =>
          set((state) => {
            if (!state.messages[convId]) {
              state.messages[convId] = [];
            }
            state.messages[convId].push(msg);
            // Update conversation metadata
            const conv = state.conversations.find((c) => c.id === convId);
            if (conv) {
              conv.messageCount += 1;
              conv.updatedAt = Date.now();
            }
          }),

        updateMessage: (convId, msgId, patch) =>
          set((state) => {
            const msgs = state.messages[convId];
            if (!msgs) return;
            const idx = msgs.findIndex((m) => m.id === msgId);
            if (idx >= 0) {
              Object.assign(msgs[idx], patch);
            }
          }),

        setIsThinking: (v) =>
          set((state) => {
            state.isThinking = v;
          }),

        setStreamingMessageId: (id) =>
          set((state) => {
            state.streamingMessageId = id;
          }),

        setPendingActions: (actions) =>
          set((state) => {
            state.pendingActions = actions;
          }),

        updateActionStatus: (msgId, actionIdx, status, result) =>
          set((state) => {
            // Find the message across all conversations
            for (const convId of Object.keys(state.messages)) {
              const msgs = state.messages[convId];
              const msg = msgs?.find((m) => m.id === msgId);
              if (msg?.actions && msg.actions[actionIdx] !== undefined) {
                msg.actions[actionIdx].status = status;
                if (result) msg.actions[actionIdx].result = result;
                break;
              }
            }
          }),

        setAgentAutonomy: (level) =>
          set((state) => {
            state.agentAutonomy = level;
          }),

        updateAgentContext: (patch) =>
          set((state) => {
            Object.assign(state.agentContext, patch);
          }),

        clearChat: (convId) =>
          set((state) => {
            state.messages[convId] = [];
            const conv = state.conversations.find((c) => c.id === convId);
            if (conv) conv.messageCount = 0;
          }),

        createNewConversation: () => {
          const id = generateId();
          const conv: ConversationMeta = {
            id,
            title: 'New Task',
            category: 'general',
            messageCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          set((state) => {
            state.conversations.unshift(conv);
            state.messages[id] = [];
            state.activeConversationId = id;
          });
          return id;
        },

        // ── Notifications ─────────────────────────────
        notifications: [],
        unreadNotificationCount: 0,

        addNotification: (n) =>
          set((state) => {
            const notification: Notification = {
              ...n,
              id: generateId(),
              timestamp: Date.now(),
              read: false,
            };
            state.notifications.unshift(notification);
            state.unreadNotificationCount += 1;
            // Keep last 100 notifications
            if (state.notifications.length > 100) {
              state.notifications = state.notifications.slice(0, 100);
            }
          }),

        markNotificationRead: (id) =>
          set((state) => {
            const n = state.notifications.find((n) => n.id === id);
            if (n && !n.read) {
              n.read = true;
              state.unreadNotificationCount = Math.max(
                0,
                state.unreadNotificationCount - 1
              );
            }
          }),

        markAllNotificationsRead: () =>
          set((state) => {
            state.notifications.forEach((n) => {
              n.read = true;
            });
            state.unreadNotificationCount = 0;
          }),

        clearNotifications: () =>
          set((state) => {
            state.notifications = [];
            state.unreadNotificationCount = 0;
          }),

        // ── Build Monitor ─────────────────────────────
        activeBuildId: null,

        setActiveBuildId: (id) =>
          set((state) => {
            state.activeBuildId = id;
          }),
      })),
      {
        name: 'yfitops-app-store',
        partialize: (state) => ({
          layoutMode: state.layoutMode,
          splitRatio: state.splitRatio,
          sidebarCollapsed: state.sidebarCollapsed,
          sidebarWidth: state.sidebarWidth,
          rightPanelWidth: state.rightPanelWidth,
          theme: state.theme,
          expertMode: state.expertMode,
          agentAutonomy: state.agentAutonomy,
          agentContext: state.agentContext,
          expandedFolders: state.expandedFolders,
          activeConversationId: state.activeConversationId,
          conversations: state.conversations,
          messages: state.messages,
        }),
      }
    )
  )
);
