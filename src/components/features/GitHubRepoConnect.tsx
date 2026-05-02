// ─────────────────────────────────────────────────────────
// GitHubRepoConnect — Phase 9
//
// Shows a GitHub connection status card on the Dashboard.
// If a GitHub token exists: shows a "Clone Repository"
// input form. If not: shows an OAuth connect button.
//
// Clone flow: runs `git clone` in the WebContainer terminal
// via window.__yfitops_container and then refreshes the
// file tree.
// ─────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { Github, GitBranch, Loader2, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase, withAuthRefresh } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { buildFileTree } from '@/core/webcontainer/fs';
import { toast } from 'sonner';
import type { FileNode } from '@/types/dev.types';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined;
const GITHUB_REDIRECT_URI = `${window.location.origin}/auth/github/callback`;

// ── Helpers ───────────────────────────────────────────────
function getContainer() {
  return (window as any).__yfitops_container ?? null;
}

// Parse owner/repo from various GitHub URL formats
function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim().replace(/\.git$/, '');
  const patterns = [
    /github\.com[:/]([^/]+)\/([^/]+)/,
    /^([^/]+)\/([^/]+)$/,
  ];
  for (const p of patterns) {
    const m = cleaned.match(p);
    if (m) return { owner: m[1], repo: m[2] };
  }
  return null;
}

// ═════════════════════════════════════════════════════════
// GitHubRepoConnect
// ═════════════════════════════════════════════════════════
interface GitHubRepoConnectProps {
  githubToken: string | null;
  onTokenStored?: () => void;
}

export function GitHubRepoConnect({ githubToken, onTokenStored }: GitHubRepoConnectProps) {
  const { user, setFileTree } = useAppStore();
  const [repoUrl, setRepoUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneSuccess, setCloneSuccess] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  // ── Start GitHub OAuth ────────────────────────────────
  const handleConnectGitHub = useCallback(() => {
    if (!GITHUB_CLIENT_ID) {
      toast.error('VITE_GITHUB_CLIENT_ID is not set. Add it to your .env file.');
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem('github_oauth_state', state);

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_REDIRECT_URI,
      scope: 'repo,user:email,read:user',
      state,
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  }, []);

  // ── Clone repository ──────────────────────────────────
  const handleClone = useCallback(async () => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      toast.error('Invalid GitHub URL. Use format: owner/repo or https://github.com/owner/repo');
      return;
    }

    const wc = getContainer();
    if (!wc) {
      toast.error('Workspace not ready. Open the Workspace first.');
      return;
    }

    if (!githubToken) {
      toast.error('No GitHub token found. Please connect GitHub first.');
      return;
    }

    setIsCloning(true);
    setCloneError(null);
    setCloneSuccess(false);

    try {
      const { owner, repo } = parsed;
      const cloneUrl = `https://${githubToken}@github.com/${owner}/${repo}.git`;

      // Run git clone in the WebContainer
      const process = await wc.spawn('git', ['clone', cloneUrl, `/${repo}`]);

      // Stream output to console (terminal picks it up separately)
      const decoder = new TextDecoder();
      process.output.pipeTo(
        new WritableStream({
          write(chunk) {
            console.log('[clone]', decoder.decode(chunk));
          },
        }),
      );

      const exitCode = await process.exit;

      if (exitCode !== 0) {
        throw new Error(`git clone exited with code ${exitCode}`);
      }

      // Refresh file tree
      const tree = await buildFileTree(wc, '/');
      setFileTree(tree as FileNode[]);

      // Save connected repo to Supabase
      if (user) {
        await withAuthRefresh(() =>
          supabase.from('connected_repos').upsert(
            {
              user_id: user.id,
              repo_owner: owner,
              repo_name: repo,
              repo_url: `https://github.com/${owner}/${repo}`,
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,repo_owner,repo_name' }
          )
        );
      }

      setCloneSuccess(true);
      toast.success(`Cloned ${owner}/${repo} successfully!`);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      setCloneError(msg);
      toast.error(`Clone failed: ${msg}`);
    } finally {
      setIsCloning(false);
    }
  }, [repoUrl, githubToken, user, setFileTree]);

  // ── Render ────────────────────────────────────────────
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Github className="w-4 h-4" style={{ color: '#EEEEFF' }} />
        <h2 className="text-sm font-semibold" style={{ color: '#EEEEFF' }}>GitHub</h2>
        {githubToken && (
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: 'rgba(0,245,160,0.08)', color: '#00F5A0', border: '1px solid rgba(0,245,160,0.15)' }}
          >
            <CheckCircle className="w-3 h-3" /> Connected
          </span>
        )}
      </div>

      {!githubToken ? (
        /* Not connected */
        <div className="text-center py-4">
          <p className="text-xs mb-4" style={{ color: '#5C5C7A' }}>
            Connect your GitHub account to clone repositories into the workspace.
          </p>
          <button
            type="button"
            onClick={handleConnectGitHub}
            className="flex items-center gap-2 mx-auto px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#EEEEFF',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            <Github className="w-4 h-4" />
            Connect GitHub
          </button>
          {!GITHUB_CLIENT_ID && (
            <p className="text-xs mt-3" style={{ color: '#FF4D6D' }}>
              ⚠ VITE_GITHUB_CLIENT_ID not set in environment.
            </p>
          )}
        </div>
      ) : (
        /* Connected — show clone form */
        <div>
          {cloneSuccess ? (
            <div
              className="flex items-center gap-2 p-3 rounded-xl mb-3"
              style={{ background: 'rgba(0,245,160,0.06)', border: '1px solid rgba(0,245,160,0.15)' }}
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#00F5A0' }} />
              <p className="text-xs" style={{ color: '#00F5A0' }}>Repository cloned! Open the Workspace to start coding.</p>
            </div>
          ) : null}

          {cloneError && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl mb-3"
              style={{ background: 'rgba(255,77,109,0.06)', border: '1px solid rgba(255,77,109,0.15)' }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#FF4D6D' }} />
              <p className="text-xs" style={{ color: '#FF4D6D' }}>{cloneError}</p>
            </div>
          )}

          <p className="text-xs mb-3" style={{ color: '#5C5C7A' }}>
            Enter a GitHub repository URL to clone into the workspace.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <GitBranch
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: '#5C5C7A' }}
              />
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleClone(); }}
                placeholder="owner/repo or https://github.com/owner/repo"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none"
                style={{
                  background: '#0D0D14',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#EEEEFF',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleClone}
              disabled={isCloning || !repoUrl.trim()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 flex-shrink-0"
              style={{
                background: isCloning || !repoUrl.trim() ? 'rgba(0,245,160,0.04)' : 'rgba(0,245,160,0.1)',
                border: '1px solid rgba(0,245,160,0.2)',
                color: isCloning || !repoUrl.trim() ? '#3A3A52' : '#00F5A0',
                cursor: isCloning || !repoUrl.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isCloning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
              {isCloning ? 'Cloning…' : 'Clone'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
