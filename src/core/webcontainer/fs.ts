// ─────────────────────────────────────────────────────────
// WebContainer FS API — YFitOps AI Agent
//
// Thin wrappers over WebContainer.fs that adapt the API
// to the shapes expected by the rest of the app.
// ─────────────────────────────────────────────────────────

import type { WebContainer, FileSystemTree } from '@webcontainer/api';
import type { FileNode } from '@/types/dev.types';

// ── Primitive FS ops ──────────────────────────────────────

export async function readFile(
  container: WebContainer,
  path: string,
): Promise<string> {
  return container.fs.readFile(path, 'utf-8');
}

export async function writeFile(
  container: WebContainer,
  path: string,
  content: string,
): Promise<void> {
  await container.fs.writeFile(path, content);
}

export async function readDir(
  container: WebContainer,
  path: string,
): Promise<string[]> {
  // withFileTypes: false returns string[]
  return container.fs.readdir(path) as unknown as string[];
}

export async function mkdir(
  container: WebContainer,
  path: string,
): Promise<void> {
  await container.fs.mkdir(path, { recursive: true });
}

export async function unlink(
  container: WebContainer,
  path: string,
): Promise<void> {
  await container.fs.rm(path, { recursive: true });
}

export async function exists(
  container: WebContainer,
  path: string,
): Promise<boolean> {
  try {
    await container.fs.stat(path);
    return true;
  } catch {
    return false;
  }
}

// ── Recursive file tree builder ───────────────────────────

export async function buildFileTree(
  container: WebContainer,
  dir = '/',
): Promise<FileNode[]> {
  let entries: Awaited<ReturnType<typeof container.fs.readdir>>;

  try {
    entries = await container.fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: FileNode[] = [];

  for (const entry of entries) {
    // Skip hidden files and node_modules for performance
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = dir === '/' ? `/${entry.name}` : `${dir}/${entry.name}`;

    if (entry.isDirectory()) {
      const children = await buildFileTree(container, fullPath);
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: 'directory',
        children,
      });
    } else {
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: 'file',
      });
    }
  }

  // Directories first, then files — both alphabetical
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ── Starter workspace ─────────────────────────────────────

const STARTER_FILES: FileSystemTree = {
  'package.json': {
    file: {
      contents: JSON.stringify(
        {
          name: 'yfitops-workspace',
          version: '1.0.0',
          type: 'module',
          scripts: {
            start: 'node index.js',
            dev: 'node --watch index.js',
          },
        },
        null,
        2,
      ),
    },
  },
  'index.js': {
    file: {
      contents: `// Welcome to YFitOps Workspace
// This browser-sandboxed environment runs real Node.js code.

const name = 'YFitOps';
const greeting = \`Hello from \${name} WebContainer!\`;
console.log(greeting);
`,
    },
  },
  'README.md': {
    file: {
      contents: `# YFitOps Workspace

This is a live WebContainer environment running in your browser.
- Run \`node index.js\` to execute code
- All files persist during your session
- Use the terminal to install packages with \`npm install\`
`,
    },
  },
  src: {
    directory: {
      'hello.js': {
        file: {
          contents: `export function greet(name) {
  return \`Hello, \${name}!\`;
}
`,
        },
      },
    },
  },
};

export async function mountStarterFiles(container: WebContainer): Promise<void> {
  await container.mount(STARTER_FILES);
  console.log('[FS] Starter files mounted');
}
