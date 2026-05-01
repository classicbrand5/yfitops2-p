import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { formatRelativeTime } from '@/lib/utils';
import {
  Zap,
  GitBranch,
  Bot,
  Hammer,
  Terminal,
  Code2,
  FileText,
  RefreshCw,
  GitPullRequest,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
} from 'lucide-react';

// ── Mock data ─────────────────────────────────────────────
const STATS = [
  { label: 'Connected Repos', value: '12', trend: '+3', trendUp: true, icon: GitBranch, accent: '#00F5A0' },
  { label: 'AI Tasks Today', value: '47', trend: '+12', trendUp: true, icon: Bot, accent: '#9B6EF5' },
  { label: 'Builds This Month', value: '134', trend: '+28%', trendUp: true, icon: Hammer, accent: '#38BDF8' },
  { label: 'Terminal Sessions', value: '89', trend: '-5%', trendUp: false, icon: Terminal, accent: '#FBBF24' },
];

const QUICK_ACTIONS = [
  { label: 'Generate Code', icon: Zap, prompt: 'Generate a new feature', accent: '#00F5A0', href: '/workspace' },
  { label: 'Analyse Repo', icon: TrendingUp, prompt: 'Analyse repository', accent: '#9B6EF5', href: '/workspace' },
  { label: 'Write Docs', icon: FileText, prompt: 'Write documentation', accent: '#38BDF8', href: '/workspace' },
  { label: 'Open PR', icon: GitPullRequest, prompt: 'Open a pull request', accent: '#FBBF24', href: '/workspace' },
  { label: 'View Insights', icon: Activity, prompt: 'View analytics', accent: '#FF4D6D', href: '/analytics' },
  { label: 'Open Chat', icon: MessageSquare, prompt: 'Chat with AI', accent: '#00F5A0', href: '/workspace' },
];

const MOCK_EVENTS = [
  { type: 'success', icon: CheckCircle, label: 'Build #342 passed', detail: 'feature/auth-v2', time: Date.now() - 2 * 60_000, color: '#00F5A0' },
  { type: 'error', icon: XCircle, label: 'Build #341 failed', detail: 'hotfix/payments', time: Date.now() - 8 * 60_000, color: '#FF4D6D' },
  { type: 'info', icon: Bot, label: 'AI generated auth.ts', detail: 'workspace', time: Date.now() - 15 * 60_000, color: '#9B6EF5' },
  { type: 'info', icon: Terminal, label: 'Terminal: npm install', detail: 'workspace', time: Date.now() - 22 * 60_000, color: '#38BDF8' },
  { type: 'success', icon: GitPullRequest, label: 'PR #89 opened', detail: 'feature/auth-v2', time: Date.now() - 60 * 60_000, color: '#FBBF24' },
  { type: 'info', icon: RefreshCw, label: 'Repo synced: api-server', detail: 'main', time: Date.now() - 2 * 60 * 60_000, color: '#38BDF8' },
  { type: 'success', icon: CheckCircle, label: 'Build #340 passed', detail: 'main', time: Date.now() - 3 * 60 * 60_000, color: '#00F5A0' },
  { type: 'warning', icon: AlertTriangle, label: 'High token usage', detail: '90% of monthly limit', time: Date.now() - 5 * 60 * 60_000, color: '#FBBF24' },
];

// Sparkline data (6 points)
const SPARKLINES: Record<string, number[]> = {
  'Connected Repos': [8, 9, 10, 10, 11, 12],
  'AI Tasks Today': [30, 35, 28, 42, 38, 47],
  'Builds This Month': [90, 102, 115, 108, 124, 134],
  'Terminal Sessions': [95, 88, 92, 85, 91, 89],
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height,
  }));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${width} ${height} L 0 ${height} Z`}
        fill={`url(#grad-${color.slice(1)})`}
      />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Last dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, createNewConversation } = useAppStore();

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    if (action.href === '/workspace') {
      const id = createNewConversation();
      navigate('/workspace');
    } else {
      navigate(action.href);
    }
  };

  return (
    <div
      className="h-full overflow-y-auto px-6 py-6"
      style={{ fontFamily: 'var(--font-body)', color: '#EEEEFF' }}
    >
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}
        >
          Good morning, {user?.fullName?.split(' ')[0] ?? 'Dev'} 👋
        </h1>
        <p className="text-sm" style={{ color: '#5C5C7A' }}>
          Here's your engineering command centre. What are we building today?
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-xl p-5 animate-fade-up"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.06)',
              animationDelay: `${i * 60}ms`,
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5C5C7A' }}>
                  {stat.label}
                </p>
                <p
                  className="text-3xl font-bold leading-none"
                  style={{ fontFamily: 'var(--font-display)', color: stat.accent }}
                >
                  {stat.value}
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${stat.accent}12`, border: `1px solid ${stat.accent}20` }}
              >
                <stat.icon className="w-4 h-4" style={{ color: stat.accent }} />
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xs font-medium"
                  style={{ color: stat.trendUp ? '#00F5A0' : '#FF4D6D' }}
                >
                  {stat.trendUp ? '↑' : '↓'} {stat.trend}
                </span>
                <span className="text-xs" style={{ color: '#3A3A52' }}>vs last period</span>
              </div>
              <Sparkline data={SPARKLINES[stat.label] ?? [1, 2, 3]} color={stat.accent} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div
          className="rounded-xl p-5 animate-fade-up delay-200"
          style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#EEEEFF' }}>Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl transition-all duration-200 group"
                style={{
                  background: '#16161F',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${action.accent}08`;
                  e.currentTarget.style.borderColor = `${action.accent}25`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#16161F';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.transform = '';
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${action.accent}15`, border: `1px solid ${action.accent}25` }}
                >
                  <action.icon className="w-4 h-4" style={{ color: action.accent }} />
                </div>
                <span className="text-xs font-medium text-center" style={{ color: '#9494B8' }}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div
          className="xl:col-span-2 rounded-xl p-5 animate-fade-up delay-300"
          style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#EEEEFF' }}>
              Activity Feed
            </h2>
            <span className="text-xs" style={{ color: '#3A3A52' }}>Real-time</span>
          </div>

          <div className="space-y-1">
            {MOCK_EVENTS.map((event, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group cursor-default animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${event.color}12` }}
                >
                  <event.icon className="w-3.5 h-3.5" style={{ color: event.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium" style={{ color: '#EEEEFF' }}>
                    {event.label}
                  </span>
                  <span className="text-xs ml-2" style={{ color: '#5C5C7A' }}>
                    {event.detail}
                  </span>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: '#3A3A52' }}>
                  {formatRelativeTime(event.time)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage summary */}
      <div
        className="mt-6 rounded-xl p-5 animate-fade-up delay-400"
        style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: '#EEEEFF' }}>
            Plan Usage
          </h2>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{ background: 'rgba(0,245,160,0.08)', color: '#00F5A0', border: '1px solid rgba(0,245,160,0.15)' }}
          >
            {user?.plan?.toUpperCase() ?? 'STARTER'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'AI Requests', used: user?.aiRequestsUsed ?? 247, limit: user?.aiRequestsLimit ?? 1000, color: '#9B6EF5' },
            { label: 'Repos Connected', used: 12, limit: 100, color: '#00F5A0' },
            { label: 'Terminal Sessions', used: 89, limit: 500, color: '#38BDF8' },
          ].map((item) => {
            const pct = Math.round((item.used / item.limit) * 100);
            const danger = pct >= 85;
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: '#5C5C7A' }}>{item.label}</span>
                  <span className="text-xs font-medium" style={{ color: danger ? '#FF4D6D' : '#9494B8' }}>
                    {item.used.toLocaleString()} / {item.limit.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: danger ? '#FF4D6D' : item.color,
                      boxShadow: danger ? '0 0 8px rgba(255,77,109,0.5)' : `0 0 8px ${item.color}40`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
