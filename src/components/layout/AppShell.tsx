import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import StatusBar from './StatusBar';
import { useAppStore } from '@/store/useAppStore';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function AppShell() {
  const { theme } = useAppStore();

  // Register global keyboard shortcuts (Cmd+K, Alt+H, etc.)
  useKeyboardShortcuts();

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-mesh"
      style={{ background: '#0C0C12' }}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <TopBar />

        {/* Page content */}
        <main
          className="flex-1 overflow-hidden relative"
          style={{ background: 'var(--bg-base)' }}
          role="main"
        >
          {/* Animated mesh overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 60% 40% at 80% 20%, rgba(0,245,160,0.03) 0%, transparent 50%), radial-gradient(ellipse 40% 60% at 20% 80%, rgba(124,58,237,0.03) 0%, transparent 50%)',
              zIndex: 0,
            }}
          />

          {/* Scan line effect */}
          <div
            className="absolute left-0 right-0 h-px pointer-events-none animate-scan-line"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,245,160,0.05), transparent)',
              zIndex: 1,
            }}
          />

          {/* Content */}
          <div className="relative h-full overflow-auto" style={{ zIndex: 2 }}>
            <Outlet />
          </div>
        </main>

        {/* Status bar */}
        <StatusBar />
      </div>

      {/* Command Palette — portal-like overlay, renders nothing when closed */}
      <CommandPalette />
    </div>
  );
}
