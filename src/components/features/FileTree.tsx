// ─────────────────────────────────────────────────────────
// FileTree — Real filesystem explorer
//
// Reads from Zustand store (fileTree + expandedFolders).
// Expand/collapse directories via toggleFolder.
// Double-click a file → openFile → creates an editor tab.
// ─────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { FileNode } from '@/types/dev.types';
import { getLanguageFromPath, getFileColor } from '@/lib/utils';
import {
  Folder, FolderOpen, File, ChevronRight, ChevronDown,
  FileText, FileCode, FileJson, FileType,
} from 'lucide-react';

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

// ── Tree node ─────────────────────────────────────────────
function TreeNode({
  node,
  depth,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  onSelect: (path: string, name: string) => void;
}) {
  const expandedFolders = useAppStore((s) => s.expandedFolders);
  const toggleFolder = useAppStore((s) => s.toggleFolder);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const openTabs = useAppStore((s) => s.openTabs);

  const isOpen = expandedFolders.includes(node.path);
  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const isActive = node.type === 'file' && activeTab?.path === node.path;

  const handleClick = useCallback(() => {
    if (node.type === 'directory') {
      toggleFolder(node.path);
    }
  }, [node.path, node.type, toggleFolder]);

  const handleDoubleClick = useCallback(() => {
    if (node.type === 'file') {
      onSelect(node.path, node.name);
    }
  }, [node.path, node.name, node.type, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (node.type === 'directory') toggleFolder(node.path);
      else onSelect(node.path, node.name);
    }
  }, [node, toggleFolder, onSelect]);

  const indent = depth * 12 + 8;

  return (
    <>
      <button
        type="button"
        className="flex items-center gap-1.5 w-full text-left py-[3px] pr-2 rounded transition-colors duration-100 group"
        style={{
          paddingLeft: `${indent}px`,
          background: isActive ? 'rgba(0,245,160,0.08)' : 'transparent',
          color: isActive ? '#00F5A0' : node.type === 'directory' ? '#C8C8E8' : '#9494B8',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        aria-expanded={node.type === 'directory' ? isOpen : undefined}
        aria-label={node.name}
      >
        {/* Chevron for directories */}
        {node.type === 'directory' ? (
          isOpen ? (
            <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: '#5C5C7A' }} aria-hidden="true" />
          ) : (
            <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: '#5C5C7A' }} aria-hidden="true" />
          )
        ) : (
          <span className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
        )}

        {/* Icon */}
        {node.type === 'directory' ? (
          isOpen ? (
            <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9B6EF5' }} aria-hidden="true" />
          ) : (
            <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#7C3AED' }} aria-hidden="true" />
          )
        ) : (
          <FileIcon name={node.name} />
        )}

        {/* Name */}
        <span className="truncate flex-1" style={{ color: isActive ? '#00F5A0' : undefined }}>
          {node.name}
        </span>
      </button>

      {/* Children */}
      {node.type === 'directory' && isOpen && node.children && node.children.length > 0 && (
        <div role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
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
  const fileTree = useAppStore((s) => s.fileTree);
  const openFile = useAppStore((s) => s.openFile);
  const workspaceReady = useAppStore((s) => s.workspaceReady);

  const handleSelect = useCallback(
    (path: string, name: string) => {
      const language = getLanguageFromPath(path);
      openFile(path, language);
    },
    [openFile],
  );

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
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Folder className="w-8 h-8 mb-2 opacity-20" style={{ color: '#9B6EF5' }} />
        <p className="text-xs" style={{ color: '#5C5C7A', fontFamily: 'var(--font-mono)' }}>
          Empty workspace
        </p>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto py-1"
      role="tree"
      aria-label="File explorer"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A35 transparent' }}
    >
      {fileTree.map((node) => (
        <TreeNode key={node.path} node={node} depth={0} onSelect={handleSelect} />
      ))}
    </div>
  );
}
