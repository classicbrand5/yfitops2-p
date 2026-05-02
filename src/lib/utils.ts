import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a unique ID — always RFC 4122 UUID so Supabase uuid columns accept it */
export function generateId(): string {
  return crypto.randomUUID();
}

/** Detect programming language from file extension */
export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    md: 'markdown',
    mdx: 'markdown',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    dockerfile: 'dockerfile',
    sql: 'sql',
    graphql: 'graphql',
    gql: 'graphql',
    xml: 'xml',
    svg: 'xml',
    env: 'plaintext',
    txt: 'plaintext',
  };
  return map[ext] ?? 'plaintext';
}

/** Get file icon color by language */
export function getFileColor(path: string): string {
  const lang = getLanguageFromPath(path);
  const map: Record<string, string> = {
    typescript: '#3b82f6',
    typescriptreact: '#06b6d4',
    javascript: '#eab308',
    javascriptreact: '#f97316',
    python: '#a855f7',
    css: '#a855f7',
    scss: '#ec4899',
    json: '#f59e0b',
    markdown: '#9ca3af',
    html: '#ef4444',
    yaml: '#64748b',
    shell: '#22c55e',
    sql: '#06b6d4',
    rust: '#f97316',
    go: '#06b6d4',
  };
  return map[lang] ?? '#6b7280';
}

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Format duration in seconds to mm:ss */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** Format relative time */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/** Debounce a function */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Check if a command is potentially dangerous */
export function isDangerousCommand(command: string): boolean {
  const dangerPatterns = [
    /rm\s+-rf?\s+[/~]/,
    /rm\s+-rf?\s+\*/,
    /dd\s+if=/,
    /mkfs\./,
    /format\s+[a-z]:/i,
    /fdisk/,
    /wipefs/,
    /shred/,
    /:(){ :|:& };:/,    // fork bomb
    /chmod\s+-R\s+777\s+[/]/,
    /chown\s+-R\s+.*\s+[/]/,
    /shutdown/,
    /reboot/,
    /init\s+0/,
    /poweroff/,
    /git\s+push.*--force\s+.*main/,
    /git\s+push.*--force\s+.*master/,
    /DROP\s+DATABASE/i,
    /DROP\s+TABLE/i,
    /TRUNCATE\s+TABLE/i,
    /DELETE\s+FROM\s+\w+\s*;/i,  // DELETE without WHERE
  ];
  return dangerPatterns.some((pattern) => pattern.test(command));
}

/** Get initials from a full name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

/** Truncate string with ellipsis */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}
