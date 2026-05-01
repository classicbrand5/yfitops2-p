import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bot,
  FolderOpen,
  Terminal,
  BarChart2,
  Hammer,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  accent?: boolean;
}

const TOP_NAV: NavItem[] = [
  { id: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard, href: '/dashboard' },
  { id: 'agent',      label: 'AI Agent',     icon: Bot,             href: '/workspace', accent: true },
  { id: 'explorer',   label: 'Explorer',     icon: FolderOpen,      href: '/workspace?panel=explorer' },
  { id: 'terminal',   label: 'Terminal',     icon: Terminal,        href: '/workspace?panel=terminal' },
  { id: 'builds',     label: 'Build Monitor',icon: Hammer,          href: '/builds' },
  { id: 'analytics',  label: 'Analytics',    icon: BarChart2,       href: '/analytics' },
];

const BOTTOM_NAV: NavItem[] = [
  { id: 'billing',  label: 'Billing',  icon: CreditCard, href: '/billing' },
  { id: 'settings', label: 'Settings', icon: Settings,   href: '/settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, setSidebarCollapsed, sidebarWidth } = useAppStore();

  const isActive = (href: string) => {
    const base = href.split('?')[0];
    return location.pathname === base;
  };

  const navItemClass = (item: NavItem) =>
    cn(
      'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 select-none',
      isActive(item.href)
        ? 'text-[#00F5A0] bg-[rgba(0,245,160,0.08)]'
        : 'text-[#5C5C7A] hover:text-[#9494B8] hover:bg-[rgba(255,255,255,0.04)]',
      item.accent && !isActive(item.href) && 'hover:text-[#00F5A0] hover:bg-[rgba(0,245,160,0.06)]'
    );

  const collapsed = sidebarCollapsed;
  const width = collapsed ? 56 : sidebarWidth;

  const renderNav = (items: NavItem[]) =>
    items.map((item) => (
      <div
        key={item.id}
        className={navItemClass(item)}
        onClick={() => navigate(item.href.split('?')[0])}
        role="button"
        aria-label={item.label}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate(item.href.split('?')[0])}
      >
        {/* Active indicator */}
        {isActive(item.href) && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
            style={{ background: '#00F5A0', boxShadow: '0 0 8px #00F5A0' }}
          />
        )}

        <item.icon
          className={cn(
            'flex-shrink-0 transition-all duration-200',
            collapsed ? 'w-5 h-5' : 'w-4 h-4',
            isActive(item.href) ? 'text-[#00F5A0]' : ''
          )}
        />

        {!collapsed && (
          <span
            className="text-sm font-medium truncate transition-all duration-200"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {item.label}
          </span>
        )}

        {/* Tooltip for collapsed state */}
        {collapsed && (
          <div
            className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
            style={{
              background: '#16161F',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#EEEEFF',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            {item.label}
          </div>
        )}

        {/* Active dot for agent when thinking */}
        {item.accent && (
          <div
            className={cn(
              'flex-shrink-0 w-1.5 h-1.5 rounded-full transition-all',
              isActive(item.href) ? 'bg-[#00F5A0] animate-pulse-glow' : 'bg-transparent',
              collapsed ? 'absolute top-2 right-2' : 'ml-auto'
            )}
          />
        )}
      </div>
    ));

  return (
    <aside
      className="flex flex-col h-full transition-all duration-200 ease-smooth flex-shrink-0 relative"
      style={{
        width,
        minWidth: width,
        background: '#0C0C12',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-3 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0,245,160,0.2) 0%, rgba(124,58,237,0.2) 100%)',
            border: '1px solid rgba(0,245,160,0.2)',
          }}
        >
          <Zap className="w-4 h-4 text-[#00F5A0]" />
        </div>
        {!collapsed && (
          <div>
            <div
              className="text-xs font-bold tracking-wide leading-none"
              style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF', letterSpacing: '0.05em' }}
            >
              YFitOps
            </div>
            <div className="text-2xs mt-0.5" style={{ color: '#5C5C7A' }}>
              AI Agent
            </div>
          </div>
        )}
      </div>

      {/* Top navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {renderNav(TOP_NAV)}
      </nav>

      {/* Bottom navigation */}
      <div
        className="px-2 py-3 space-y-0.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        {renderNav(BOTTOM_NAV)}

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="group flex items-center gap-3 px-3 py-2.5 w-full rounded-lg transition-all duration-200"
          style={{ color: '#3A3A52' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#5C5C7A')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#3A3A52')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                Collapse
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
