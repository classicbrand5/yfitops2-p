// ─────────────────────────────────────────────────────────
// WebContainer Singleton — YFitOps AI Agent
//
// Boots exactly one WebContainer instance per page load.
// All callers share the same Promise so concurrent boot()
// calls resolve to the same container.
// ─────────────────────────────────────────────────────────

import { WebContainer } from '@webcontainer/api';

let instancePromise: Promise<WebContainer> | null = null;

/**
 * Returns the shared WebContainer boot promise.
 * Safe to call multiple times — boots only once.
 */
export function getWebContainer(): Promise<WebContainer> {
  if (!instancePromise) {
    console.log('[WebContainer] Booting singleton instance…');
    instancePromise = WebContainer.boot().then((wc) => {
      console.log('[WebContainer] Boot successful');
      return wc;
    });
  }
  return instancePromise;
}

export async function bootWebContainer(): Promise<WebContainer> {
  return getWebContainer();
}
