
// ─────────────────────────────────────────────────────────
// RealTerminalPanel — xterm.js + WebContainer jsh shell
//
// Spawns the WebContainer 'jsh' interactive shell and
// connects it to an xterm.js terminal with FitAddon.
//
// Uses the singleton container from useWebContainer hook.
// Each TerminalPanel instance creates its own shell process.
// ─────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import type { WebContainer } from '@webcontainer/api';

interface RealTerminalPanelProps {
  container: WebContainer;
  sessionId: string;
  onOutput?: (line: string) => void;
}

export function RealTerminalPanel({
  container,
  sessionId,
  onOutput,
}: RealTerminalPanelProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const shellRef = useRef<any>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const cleanedUpRef = useRef(false);

  const startShell = useCallback(async (term: Terminal) => {
    if (cleanedUpRef.current) return;

    try {
      const cols = term.cols || 80;
      const rows = term.rows || 30;

      const shellProcess = await container.spawn('jsh', {
        terminal: { cols, rows },
      });

      if (cleanedUpRef.current) {
        shellProcess.kill?.();
        return;
      }

      shellRef.current = shellProcess;
      const writer = shellProcess.input.getWriter();
      writerRef.current = writer;

      // Pipe shell output → xterm
      shellProcess.output.pipeTo(
        new WritableStream({
          write(chunk: string) {
            if (!cleanedUpRef.current) {
              term.write(chunk);
              onOutput?.(chunk);
            }
          },
        }),
      ).catch(() => {}); // Stream ends when shell exits

      // Pipe xterm keystrokes → shell input
      term.onData((data) => {
        if (!cleanedUpRef.current) {
          writer.write(data).catch(() => {});
        }
      });

      // Handle shell exit
      shellProcess.exit.then((code: number) => {
        if (!cleanedUpRef.current) {
          term.writeln(`\r\n\x1b[33m[Session ${sessionId} exited with code ${code}]\x1b[0m`);
          writer.close().catch(() => {});
        }
      });
    } catch (err) {
      if (!cleanedUpRef.current && termRef.current) {
        const msg = err instanceof Error ? err.message : String(err);
        term.writeln(`\r\n\x1b[31m[Error starting shell: ${msg}]\x1b[0m`);
      }
    }
  }, [container, sessionId, onOutput]);

  useEffect(() => {
    if (!mountRef.current) return;
    cleanedUpRef.current = false;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      lineHeight: 1.4,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: {
        background: '#080810',
        foreground: '#C8C8E8',
        cursor: '#00F5A0',
        cursorAccent: '#080810',
        selectionBackground: 'rgba(0,245,160,0.2)',
        black: '#1C1C27',
        red: '#FF4D6D',
        green: '#00F5A0',
        yellow: '#FBBF24',
        blue: '#38BDF8',
        magenta: '#9B6EF5',
        cyan: '#22D3EE',
        white: '#C8C8E8',
        brightBlack: '#3A3A52',
        brightRed: '#FF6B87',
        brightGreen: '#4FFFB8',
        brightYellow: '#FCD34D',
        brightBlue: '#67E3FF',
        brightMagenta: '#B794F6',
        brightCyan: '#67E8F9',
        brightWhite: '#EEEEFF',
      },
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(mountRef.current);

    // Initial fit — needs a tick for layout to settle
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    termRef.current = term;
    fitRef.current = fitAddon;

    // Boot the shell
    startShell(term);

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (!cleanedUpRef.current && fitAddon) {
        fitAddon.fit();
        // Resize the shell process to match
        if (shellRef.current?.resize) {
          shellRef.current.resize({ cols: term.cols, rows: term.rows });
        }
      }
    });

    if (mountRef.current) {
      resizeObserver.observe(mountRef.current);
    }

    return () => {
      cleanedUpRef.current = true;
      resizeObserver.disconnect();
      writerRef.current?.close().catch(() => {});
      shellRef.current?.kill?.();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [startShell]);

  return (
    <div
      ref={mountRef}
      className="h-full w-full"
      style={{ background: '#080810' }}
      aria-label={`Terminal session ${sessionId}`}
    />
  );
}
