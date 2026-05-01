// ─────────────────────────────────────────────────────────
// useWebContainer — WebContainer lifecycle hook
//
// Boots the singleton, mounts starter files, builds the
// initial file tree, and exposes typed FS + process APIs.
//
// Design: boot happens once per app lifetime via the
// singleton promise in webcontainer.ts. The hook just
// awaits that promise and populates React state.
// ─────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import type { WebContainer } from '@webcontainer/api';
import { bootWebContainer } from '@/core/webcontainer/webcontainer';
import {
  buildFileTree,
  readFile,
  writeFile,
  readDir,
  mkdir,
  unlink,
  exists,
  mountStarterFiles,
} from '@/core/webcontainer/fs';
import { spawnProcess, spawnTerminalShell } from '@/core/webcontainer/process';
import { useAppStore } from '@/store/useAppStore';

export function useWebContainer() {
  const [container, setContainer] = useState<WebContainer | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  const setFileTree = useAppStore((s) => s.setFileTree);
  const setWorkspaceReady = useAppStore((s) => s.setWorkspaceReady);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        setIsBooting(true);
        const wc = await bootWebContainer();
        if (cancelled) return;

        // Mount starter files — idempotent via fs.writeFile
        await mountStarterFiles(wc);
        if (cancelled) return;

        setContainer(wc);
        // Expose singleton for components that can't use the hook (AgentChat action executor)
        (window as any).__yfitops_container = wc;

        // Build and store the initial file tree
        const tree = await buildFileTree(wc, '/');
        if (!cancelled) {
          setFileTree(tree);
          setWorkspaceReady(true);
          setIsBooting(false);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'WebContainer boot failed';
          console.error('[useWebContainer] Boot error:', err);
          setBootError(message);
          setWorkspaceReady(false, message);
          setIsBooting(false);
        }
      }
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, [setFileTree, setWorkspaceReady]);

  // ── Refresh file tree (call after FS mutations) ────────
  const refreshFileTree = useCallback(async () => {
    if (!container) return;
    const tree = await buildFileTree(container, '/');
    setFileTree(tree);
  }, [container, setFileTree]);

  // ── FS API facade ──────────────────────────────────────
  const fs = {
    readFile: (path: string) =>
      container
        ? readFile(container, path)
        : Promise.reject(new Error('WebContainer not ready')),

    writeFile: (path: string, content: string) =>
      container
        ? writeFile(container, path, content)
        : Promise.reject(new Error('WebContainer not ready')),

    readDir: (path: string) =>
      container
        ? readDir(container, path)
        : Promise.reject(new Error('WebContainer not ready')),

    mkdir: (path: string) =>
      container
        ? mkdir(container, path)
        : Promise.reject(new Error('WebContainer not ready')),

    unlink: (path: string) =>
      container
        ? unlink(container, path)
        : Promise.reject(new Error('WebContainer not ready')),

    exists: (path: string) =>
      container
        ? exists(container, path)
        : Promise.reject(new Error('WebContainer not ready')),

    buildFileTree: (dir?: string) =>
      container
        ? buildFileTree(container, dir ?? '/')
        : Promise.reject(new Error('WebContainer not ready')),
  };

  // ── Process API facade ─────────────────────────────────
  const process = {
    spawn: (cmd: string, args?: string[]) =>
      container
        ? spawnProcess(container, cmd, args)
        : Promise.reject(new Error('WebContainer not ready')),

    spawnTerminalShell: (cols: number, rows: number) =>
      container
        ? spawnTerminalShell(container, cols, rows)
        : Promise.reject(new Error('WebContainer not ready')),
  };

  return {
    container,
    bootError,
    isBooting,
    fs,
    process,
    refreshFileTree,
  };
}
