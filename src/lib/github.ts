// ─────────────────────────────────────────────────────────
// GitHub REST API Client — YFitOps AI Agent (Section A5)
//
// Pure fetch-based GitHub REST v3 integration.
// No external dependencies — keeps bundle lean.
// ─────────────────────────────────────────────────────────

import { supabase } from './supabase';
import { AuthError } from './errors';

const GITHUB_API = 'https://api.github.com';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

// ── Token retrieval ───────────────────────────────────────
export async function getGitHubToken(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('github_access_token')
    .eq('id', user.id)
    .single();

  return data?.github_access_token ?? null;
}

// ── Token validation + persistence ───────────────────────
export async function saveGitHubToken(
  token: string,
): Promise<{ username: string }> {
  // Validate against GitHub
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    throw new AuthError(`Invalid GitHub token: ${res.status} ${res.statusText}`);
  }

  const githubUser = (await res.json()) as GitHubUser;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AuthError('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({
      github_access_token: token,
      github_username: githubUser.login,
    })
    .eq('id', user.id);

  if (error) throw new Error(error.message);

  return { username: githubUser.login };
}

// ── List repositories ─────────────────────────────────────
export async function listUserRepos(token?: string): Promise<GitHubRepo[]> {
  const t = token ?? (await getGitHubToken());
  if (!t) throw new AuthError('No GitHub token available');

  const res = await fetch(
    `${GITHUB_API}/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator`,
    {
      headers: {
        Authorization: `Bearer ${t}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json() as Promise<GitHubRepo[]>;
}

// ── Get authenticated GitHub user ─────────────────────────
export async function getGitHubUser(token?: string): Promise<GitHubUser> {
  const t = token ?? (await getGitHubToken());
  if (!t) throw new AuthError('No GitHub token available');

  const res = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${t}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json() as Promise<GitHubUser>;
}

// ── Connect selected repos to Supabase ────────────────────
export async function connectReposToSupabase(repos: GitHubRepo[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AuthError('Not authenticated');

  const rows = repos.map((r) => ({
    user_id: user.id,
    repo_owner: r.owner.login,
    repo_name: r.name,
    repo_url: r.html_url,
    description: r.description ?? '',
    language: r.language ?? '',
    stars: r.stargazers_count,
    default_branch: r.default_branch,
    is_private: r.private,
    github_repo_id: r.id,
    last_synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('connected_repos')
    .upsert(rows, { onConflict: 'user_id,repo_owner,repo_name' });

  if (error) throw new Error(error.message);
}

// ── Open Pull Request ─────────────────────────────────────
export async function createPullRequest(
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body: string,
): Promise<{ html_url: string; number: number }> {
  const token = await getGitHubToken();
  if (!token) throw new AuthError('No GitHub token available');

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ head, base, title, body }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(`GitHub PR error: ${err.message ?? res.status}`);
  }

  return res.json() as Promise<{ html_url: string; number: number }>;
}

// ── Get repo zip URL for cloning ─────────────────────────
export function getRepoZipUrl(
  owner: string,
  repo: string,
  branch = 'main',
): string {
  return `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`;
}
