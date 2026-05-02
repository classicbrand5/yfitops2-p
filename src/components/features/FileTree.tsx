// ─────────────────────────────────────────────────────────
// FileTree — Real filesystem explorer
//
// Reads from Zustand store (fileTree + expandedFolders).
// Expand/collapse directories via toggleFolder.
// Double-click a file → openFile → creates an editor tab.
// Right-click → context menu (New File, New Folder, Rename, Delete)
// ─────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { FileNode } from '@/types/dev.types';
import { getLanguageFromPath, getFileColor } from '@/lib/utils';
import {
  Folder, FolderOpen, File, ChevronRight, ChevronDown,
  FileText, FileCode, FileJson, FileType,
  FilePlus, FolderPlus, Pencil, Trash2,
} from 'lucide-react';
import { buildFileTree } from '@/core/webcontainer/fs';
import { ContextMenu, type ContextMenuPosition, type ContextMenuItem } from '@/components/ui/ContextMenu';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';

// ── Helpers ───────────────────────────────────────────────

function getContainer() {
  return (window as any).__yfitops_container ?? null;
}

async function refreshTree(setFileTree: (tree: FileNode[]) => void) {
  const wc = getContainer();
  if (!wc) return;
  try {
    const tree = await buildFileTree(wc, '/');
    setFileTree(tree);
  } catch (err) {
    console.error('[FileTree] Refresh failed:', err);
  }
}

// ── File icon resolver ────────────────────────────────────
function FileIcon({ name, className }: { name: string; className?: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const color = getFileColor(name);
  const iconProps = { className: className ?? 'w-3.5 h-3.5', style: { color }, 'aria-hidden': true as const };

  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) return <FileCode {...iconProps} />;
  if (['json', 'jsonc'].includes(ext)) return <FileJson {...iconProps} />;
  if (['md', 'mdx', 'txt', 'rst'].includes(ext)) return <FileText {...iconProps} />;
  if (['css', 'scss', 'sass', 'less', 'html', 'htm', 'svg', 'xml'].includes(ext)) return <FileType {...iconProps} />;
  return <File {...iconProps} />;
}

// ── Inline rename input ───────────────────────────────────
function InlineRename({
  defaultValue,
  onConfirm,
  onCancel,
}: {
  defaultValue: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (value.trim()) onConfirm(value.trim());
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => {
        if (value.trim() && value.trim() !== defaultValue) {
          onConfirm(value.trim());
        } else {
          onCancel();
        }
      }}
      className="flex-1 min-w-0 px-1 rounded text-xs outline-none"
      style={{
        background: 'rgba(0,245,160,0.08)',
        border: '1px solid rgba(0,245,160,0.25)',
        color: '#00F5A0',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        lineHeight: '1.4',
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// ── Tree node ─────────────────────────────────────────────
function TreeNode({
  node,
  depth,
  onSelect,
  onContextMenu,
  renamingPath,
  onRenameConfirm,
  onRenameCancel,
}: {
  node: FileNode;
  depth: number;
  onSelect: (path: string, name: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  renamingPath: string | null;
  onRenameConfirm: (node: FileNode, newName: string) => void;
  onRenameCancel: () => void;
}) {
  const expandedFolders = useAppStore((s) => s.expandedFolders);
  const toggleFolder    = useAppStore((s) => s.toggleFolder);
  const activeTabId     = useAppStore((s) => s.activeTabId);
  const openTabs        = useAppStore((s) => s.openTabs);

  const isOpen   = expandedFolders.includes(node.path);
  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const isActive  = node.type === 'file' && activeTab?.path === node.path;
  const isRenaming = renamingPath === node.path;

  const handleClick = useCallback(() => {
    if (node.type === 'directory') toggleFolder(node.path);
  }, [node.path, node.type, toggleFolder]);

  const handleDoubleClick = useCallback(() => {
    if (node.type === 'file') onSelect(node.path, node.name);
  }, [node.path, node.name, node.type, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (node.type === 'directory') toggleFolder(node.path);
      else onSelect(node.path, node.name);
    }
  }, [node, toggleFolder, onSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  }, [node, onContextMenu]);

  const indent = depth * 12 + 8;

  return (
    <>
      <div
        className="flex items-center gap-1.5 w-full pr-2 rounded transition-colors duration-100 group"
        style={{
          paddingLeft: `${indent}px`,
          background: isActive ? 'rgba(0,245,160,0.08)' : 'transparent',
          minHeight: '24px',
        }}
        onContextMenu={handleContextMenu}
      >
        {isRenaming ? (
          <>
            {/* Icon */}
            {node.type === 'directory' ? (
              <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9B6EF5' }} />
            ) : (
              <FileIcon name={node.name} />
            )}
            <InlineRename
              defaultValue={node.name}
              onConfirm={(newName) => onRenameConfirm(node, newName)}
              onCancel={onRenameCancel}
            />
          </>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left py-[3px]"
            style={{
              color: isActive ? '#00F5A0' : node.type === 'directory' ? '#C8C8E8' : '#9494B8',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
            }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
            aria-expanded={node.type === 'directory' ? isOpen : undefined}
            aria-label={node.name}
          >
            {/* Chevron for directories */}
            {node.type === 'directory' ? (
              isOpen
                ? <ChevronDown  className="w-3 h-3 flex-shrink-0" style={{ color: '#5C5C7A' }} aria-hidden="true" />
                : <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: '#5C5C7A' }} aria-hidden="true" />
            ) : (
              <span className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            )}

            {/* Icon */}
            {node.type === 'directory' ? (
              isOpen
                ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9B6EF5' }} aria-hidden="true" />
                : <Folder     className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#7C3AED' }} aria-hidden="true" />
            ) : (
              <FileIcon name={node.name} />
            )}

            {/* Name */}
            <span className="truncate flex-1" style={{ color: isActive ? '#00F5A0' : undefined }}>
              {node.name}
            </span>
          </button>
        )}
      </div>

      {/* Children */}
      {node.type === 'directory' && isOpen && node.children && node.children.length > 0 && (
        <div role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              renamingPath={renamingPath}
              onRenameConfirm={onRenameConfirm}
              onRenameCancel={onRenameCancel}
            />
          ))}
        </div>
      )}

      {/* Empty directory hint */}
      {node.type === 'directory' && isOpen && (!node.children || node.children.length === 0) && (
        <div
          className="text-xs py-1"
          style={{ paddingLeft: `${indent + 24}px`, color: '#3A3A52', fontFamily: 'var(--font-mono)' }}
          aria-hidden="true"
        >
          empty
        </div>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════
// FileTree
// ═════════════════════════════════════════════════════════
export function FileTree() {
  const fileTree        = useAppStore((s) => s.fileTree);
  const setFileTree     = useAppStore((s) => s.setFileTree);
  const openFile        = useAppStore((s) => s.openFile);
  const workspaceReady  = useAppStore((s) => s.workspaceReady);

  // ── Context menu state ────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<{
    open: boolean;
    position: ContextMenuPosition;
    node: FileNode | null;
  }>({ open: false, position: { x: 0, y: 0 }, node: null });

  // ── Rename state ──────────────────────────────────────
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  // ── Delete confirm state ──────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null);

  const handleSelect = useCallback(
    (path: string, name: string) => {
      const language = getLanguageFromPath(path);
      openFile(path, language);
    },
    [openFile],
  );

  // ── Context menu open ─────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setCtxMenu({ open: true, position: { x: e.clientX, y: e.clientY }, node });
  }, []);

  const closeCtxMenu = useCallback(() => {
    setCtxMenu((prev) => ({ ...prev, open: false }));
  }, []);

  // ── New File ──────────────────────────────────────────
  const handleNewFile = useCallback(async () => {
    const wc = getContainer();
    if (!wc) { toast.error('Workspace not ready'); return; }

    const node = ctxMenu.node;
    const dir = node
      ? (node.type === 'directory' ? node.path : node.path.split('/').slice(0, -1).join('/') || '/')
      : '/';

    const name = window.prompt('New file name:', 'untitled.ts');
    if (!name?.trim()) return;

    const fullPath = `${dir}/${name.trim()}`.replace('//', '/');
    try {
      await wc.fs.writeFile(fullPath, '');
      toast.success(`Created ${fullPath}`);
      await refreshTree(setFileTree);
    } catch (err: any) {
      toast.error(`Failed to create file: ${err.message}`);
    }
  }, [ctxMenu.node, setFileTree]);

  // ── New Folder ────────────────────────────────────────
  const handleNewFolder = useCallback(async () => {
    const wc = getContainer();
    if (!wc) { toast.error('Workspace not ready'); return; }

    const node = ctxMenu.node;
    const dir = node
      ? (node.type === 'directory' ? node.path : node.path.split('/').slice(0, -1).join('/') || '/')
      : '/';

    const name = window.prompt('New folder name:', 'new-folder');
    if (!name?.trim()) return;

    const fullPath = `${dir}/${name.trim()}`.replace('//', '/');
    try {
      await wc.fs.mkdir(fullPath, { recursive: true });
      toast.success(`Created ${fullPath}`);
      await refreshTree(setFileTree);
    } catch (err: any) {
      toast.error(`Failed to create folder: ${err.message}`);
    }
  }, [ctxMenu.node, setFileTree]);

  // ── Rename ────────────────────────────────────────────
  const handleRenameStart = useCallback(() => {
    if (ctxMenu.node) setRenamingPath(ctxMenu.node.path);
  }, [ctxMenu.node]);

  const handleRenameConfirm = useCallback(async (node: FileNode, newName: string) => {
    setRenamingPath(null);
    if (newName === node.name) return;

    const wc = getContainer();
    if (!wc) { toast.error('Workspace not ready'); return; }

    const dir     = node.path.split('/').slice(0, -1).join('/') || '/';
    const newPath = `${dir}/${newName}`.replace('//', '/');

    try {
      // Read old content
      let content = '';
      if (node.type === 'file') {
        content = await wc.fs.readFile(node.path, 'utf-8');
      }

      if (node.type === 'file') {
        await wc.fs.writeFile(newPath, content);
        await wc.fs.rm(node.path, { recursive: false });
      } else {
        // For directories we can only recreate — limited support
        await wc.fs.mkdir(newPath, { recursive: true });
        await wc.fs.rm(node.path, { recursive: true });
      }
      toast.success(`Renamed to ${newName}`);
      await refreshTree(setFileTree);
    } catch (err: any) {
      toast.error(`Rename failed: ${err.message}`);
    }
  }, [setFileTree]);

  const handleRenameCancel = useCallback(() => {
    setRenamingPath(null);
  }, []);

  // ── Delete ────────────────────────────────────────────
  const handleDeleteStart = useCallback(() => {
    if (ctxMenu.node) setDeleteTarget(ctxMenu.node);
  }, [ctxMenu.node]);

  const handleDeleteConfirm = useCallback(async () => {
    const node = deleteTarget;
    setDeleteTarget(null);
    if (!node) return;

    const wc = getContainer();
    if (!wc) { toast.error('Workspace not ready'); return; }

    try {
      await wc.fs.rm(node.path, { recursive: true });
      toast.success(`Deleted ${node.name}`);
      await refreshTree(setFileTree);
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    }
  }, [deleteTarget, setFileTree]);

  // ── Context menu items ────────────────────────────────
  const contextMenuItems: ContextMenuItem[] = [
    {
      id: 'new-file',
      label: 'New File',
      Icon: FilePlus,
      color: '#00F5A0',
      action: handleNewFile,
    },
    {
      id: 'new-folder',
      label: 'New Folder',
      Icon: FolderPlus,
      color: '#9B6EF5',
      action: handleNewFolder,
    },
    {
      id: 'sep-1',
      label: '',
      separator: true,
      action: () => {},
    },
    {
      id: 'rename',
      label: 'Rename',
      Icon: Pencil,
      color: '#FBBF24',
      disabled: !ctxMenu.node,
      action: handleRenameStart,
    },
    {
      id: 'delete',
      label: 'Delete',
      Icon: Trash2,
      color: '#FF4D6D',
      disabled: !ctxMenu.node,
      action: handleDeleteStart,
    },
  ];

  // ── Right-click on empty space ────────────────────────
  const handleRootContextMenu = useCallback((e: React.MouseEvent) => {
    // Only trigger if the click wasn't on a node button (propagation stops there)
    e.preventDefault();
    setCtxMenu({ open: true, position: { x: e.clientX, y: e.clientY }, node: null });
  }, []);

  // ── Loading / empty states ────────────────────────────
  if (!workspaceReady) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div
          className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin mb-3"
          style={{ borderColor: '#00F5A0', borderTopColor: 'transparent' }}
          role="status"
          aria-label="Loading filesystem"
        />
        <p className="text-xs" style={{ color: '#3A3A52', fontFamily: 'var(--font-mono)' }}>
          Booting workspace…
        </p>
      </div>
    );
  }

  if (!fileTree || fileTree.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-4 text-center"
        onContextMenu={handleRootContextMenu}
      >
        <Folder className="w-8 h-8 mb-2 opacity-20" style={{ color: '#9B6EF5' }} />
        <p className="text-xs mb-3" style={{ color: '#5C5C7A', fontFamily: 'var(--font-mono)' }}>
          Empty workspace
        </p>
        <p className="text-xs" style={{ color: '#3A3A52' }}>Right-click to create files</p>

        <ContextMenu
          open={ctxMenu.open}
          position={ctxMenu.position}
          items={contextMenuItems}
          onClose={closeCtxMenu}
        />
      </div>
    );
  }

  return (
    <>
      <div
        className="h-full overflow-y-auto py-1"
        role="tree"
        aria-label="File explorer"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A35 transparent' }}
        onContextMenu={handleRootContextMenu}
      >
        {fileTree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            onSelect={handleSelect}
            onContextMenu={handleContextMenu}
            renamingPath={renamingPath}
            onRenameConfirm={handleRenameConfirm}
            onRenameCancel={handleRenameCancel}
          />
        ))}
      </div>

      {/* Context menu */}
      <ContextMenu
        open={ctxMenu.open}
        position={ctxMenu.position}
        items={contextMenuItems}
        onClose={closeCtxMenu}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete file"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        detail={deleteTarget?.path}
        isDestructive
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
