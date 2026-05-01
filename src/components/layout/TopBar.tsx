import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { cn, getInitials, formatRelativeTime } from '@/lib/utils';
import {
  Search,
  Bell,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  CreditCard,
  Check,
  X,
  AlertTriangle,
  Info,
  CheckCircle,
} from 'lucide-react';

function NotificationIcon({ type }: { type: string }) {
  if (type === 'success') return <CheckCircle className="w-3.5 h-3.5 text-[#00F5A0]" />;
  if (type === 'error') return <X className="w-3.5 h-3.5 text-[#FF4D6D]" />;
  if (type === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-[#FBBF24]" />;
  return <Info className="w-3.5 h-3.5 text-[#38BDF8]" />;
}

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    theme,
    toggleTheme,
    openCommandPalette,
    notifications,
    unreadNotificationCount,
    markAllNotificationsRead,
    selectedFilePath,
  } = useAppStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Build breadcrumb
  const pathMap: Record<string, string> = {
    '/': 'Home',
    '/dashboard': 'Dashboard',
    '/workspace': 'Workspace',
    '/builds': 'Build Monitor',
    '/analytics': 'Analytics',
    '/settings': 'Settings',
    '/billing': 'Billing',
    '/auth': 'Auth',
  };

  const currentPage = pathMap[location.pathname] ?? 'YFitOps';
  const breadcrumbs = ['YFitOps', currentPage];
  if (selectedFilePath && location.pathname === '/workspace') {
    breadcrumbs.push(selectedFilePath.split('/').pop() ?? selectedFilePath);
  }

  return (
    <header
      className="flex items-center justify-between px-4 h-11 flex-shrink-0 relative z-10"
      style={{
        background: '#0C0C12',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 min-w-0" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: '#3A3A52' }} />
            )}
            <span
              className={cn(
                'text-xs font-medium truncate',
                i === breadcrumbs.length - 1 ? 'text-[#9494B8]' : 'text-[#3A3A52]'
              )}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {crumb}
            </span>
          </div>
        ))}
      </nav>

      {/* Center — Search trigger */}
      <button
        onClick={openCommandPalette}
        className="flex items-center gap-2 px-3 h-7 rounded-md transition-all duration-200 mx-4"
        style={{
          background: '#13131C',
          border: '1px solid rgba(255,255,255,0.07)',
          color: '#5C5C7A',
          minWidth: '220px',
          maxWidth: '320px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)';
          e.currentTarget.style.color = '#9494B8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
          e.currentTarget.style.color = '#5C5C7A';
        }}
        aria-label="Open command palette (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-xs flex-1 text-left" style={{ fontFamily: 'var(--font-body)' }}>
          Search commands…
        </span>
        <kbd
          className="text-2xs px-1.5 py-0.5 rounded flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: 'var(--font-mono)',
            color: '#5C5C7A',
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Right controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-all duration-200"
          style={{ color: '#5C5C7A' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = '#9494B8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#5C5C7A';
          }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
              if (!showNotifications && unreadNotificationCount > 0) {
                markAllNotificationsRead();
              }
            }}
            className="relative w-7 h-7 flex items-center justify-center rounded-md transition-all duration-200"
            style={{ color: '#5C5C7A' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.color = '#9494B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#5C5C7A';
            }}
            aria-label={`Notifications${unreadNotificationCount > 0 ? ` (${unreadNotificationCount} unread)` : ''}`}
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-2xs font-bold"
                style={{ background: '#FF4D6D', color: '#EEEEFF' }}
              >
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowNotifications(false)}
              />
              <div
                className="absolute right-0 top-9 w-80 rounded-xl z-40 overflow-hidden"
                style={{
                  background: '#16161F',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <span className="text-sm font-semibold" style={{ color: '#EEEEFF' }}>
                    Notifications
                  </span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="w-5 h-5 flex items-center justify-center rounded"
                    style={{ color: '#5C5C7A' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: '#3A3A52' }} />
                      <p className="text-xs" style={{ color: '#5C5C7A' }}>
                        No notifications yet
                      </p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 transition-colors duration-150"
                        style={{
                          background: n.read ? 'transparent' : 'rgba(255,255,255,0.02)',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = n.read
                            ? 'transparent'
                            : 'rgba(255,255,255,0.02)')
                        }
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <NotificationIcon type={n.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs font-medium truncate"
                            style={{ color: '#EEEEFF' }}
                          >
                            {n.title}
                          </p>
                          <p
                            className="text-xs mt-0.5 line-clamp-2"
                            style={{ color: '#5C5C7A' }}
                          >
                            {n.message}
                          </p>
                          <p className="text-2xs mt-1" style={{ color: '#3A3A52' }}>
                            {formatRelativeTime(n.timestamp)}
                          </p>
                        </div>
                        {!n.read && (
                          <div
                            className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
                            style={{ background: '#00F5A0' }}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile avatar */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-1 pr-2 h-7 rounded-md transition-all duration-200"
            style={{ color: '#9494B8' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            aria-label="Profile menu"
            aria-expanded={showProfile}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-2xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00F5A0, #7C3AED)', color: '#060609' }}
            >
              {user ? getInitials(user.fullName) : 'U'}
            </div>
            {user && (
              <span className="text-xs font-medium hidden sm:block truncate max-w-[100px]" style={{ color: '#9494B8' }}>
                {user.fullName.split(' ')[0]}
              </span>
            )}
          </button>

          {showProfile && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowProfile(false)}
              />
              <div
                className="absolute right-0 top-9 w-52 rounded-xl z-40 overflow-hidden"
                style={{
                  background: '#16161F',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}
              >
                {/* User info */}
                <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <p className="text-sm font-semibold truncate" style={{ color: '#EEEEFF' }}>
                    {user?.fullName ?? 'Developer'}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#5C5C7A' }}>
                    {user?.email ?? 'No email'}
                  </p>
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium mt-1.5"
                    style={{
                      background: 'rgba(0,245,160,0.1)',
                      color: '#00F5A0',
                      border: '1px solid rgba(0,245,160,0.2)',
                    }}
                  >
                    {user?.plan?.toUpperCase() ?? 'STARTER'}
                  </span>
                </div>

                {/* Menu items */}
                {[
                  { label: 'Profile', icon: User, href: '/settings' },
                  { label: 'Settings', icon: Settings, href: '/settings' },
                  { label: 'Billing', icon: CreditCard, href: '/billing' },
                  { label: toggleTheme ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : 'Toggle Theme', icon: theme === 'dark' ? Sun : Moon, action: toggleTheme },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.action) item.action();
                      else if (item.href) navigate(item.href);
                      setShowProfile(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors duration-150"
                    style={{ color: '#9494B8' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.color = '#EEEEFF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#9494B8';
                    }}
                  >
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                ))}

                {/* Sign out */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <button
                    onClick={() => {
                      navigate('/auth');
                      setShowProfile(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors duration-150"
                    style={{ color: '#FF4D6D' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,77,109,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
