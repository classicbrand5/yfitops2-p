// ─────────────────────────────────────────────────────────
// global.d.ts — Window type augmentation (Section E3)
//
// Types the global window extensions used across the IDE.
// ─────────────────────────────────────────────────────────

import type { WebContainer } from '@webcontainer/api';
import type * as monaco from 'monaco-editor';

declare global {
  interface Window {
    /** Singleton WebContainer instance exposed by useWebContainer */
    __yfitops_container?: WebContainer;
    /** Monaco editor global — set by @monaco-editor/react beforeMount */
    monaco?: typeof monaco;
  }
}

export {};
