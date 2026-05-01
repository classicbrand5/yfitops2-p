
// ─────────────────────────────────────────────────────────
// WebContainer Process API — YFitOps AI Agent
//
// Spawn processes inside the WebContainer sandbox.
// Non-terminal spawns are guarded by isDangerousCommand.
// Terminal spawns (jsh) are always permitted.
// ─────────────────────────────────────────────────────────

import type { WebContainer } from '@webcontainer/api';
import { isDangerousCommand } from '@/lib/utils';

// ── Non-interactive process spawn ─────────────────────────

export interface SpawnResult {
  exitCode: number;
  stdout: string[];
  stderr: string[];
}

export async function spawnProcess(
  container: WebContainer,
  command: string,
  args: string[] = [],
): Promise<SpawnResult> {
  // Safety gate — block destructive commands from non-terminal paths
  const fullCmd = `${command} ${args.join(' ')}`.trim();
  if (isDangerousCommand(fullCmd)) {
    throw new Error(
      `[Safety Gate] Command blocked: ${fullCmd}`,
    );
  }

  console.log(`[Process] spawn: ${command} ${args.join(' ')}`);

  const proc = await container.spawn(command, args);

  const stdout: string[] = [];
  const stderr: string[] = [];

  // Collect output streams
  const outputDone = proc.output.pipeTo(
    new WritableStream({
      write(chunk) {
        stdout.push(chunk);
      },
    }),
  );

  const exitCode = await proc.exit;
  await outputDone.catch(() => {}); // Ignore pipe errors after exit

  return { exitCode, stdout, stderr };
}

// ── Interactive terminal shell ────────────────────────────

export interface ShellHandle {
  // The raw WebContainer process — used to call .resize()
  process: any;
  // Writer for sending keystrokes into the shell
  inputWriter: WritableStreamDefaultWriter<string>;
  // The exit promise (resolves to exit code)
  exitPromise: Promise<number>;
}

export async function spawnTerminalShell(
  container: WebContainer,
  cols: number,
  rows: number,
): Promise<ShellHandle> {
  console.log(`[Process] Spawning jsh terminal (${cols}x${rows})`);

  const shellProcess = await container.spawn('jsh', {
    terminal: { cols, rows },
  });

  const inputWriter = shellProcess.input.getWriter();

  return {
    process: shellProcess,
    inputWriter,
    exitPromise: shellProcess.exit,
  };
}
