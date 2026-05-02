// ─────────────────────────────────────────────────────────
// Dashboard — Phase 9: Real Analytics + GitHub Connect
//
// Fetches live data from Supabase RPCs:
//   get_dashboard_stats()  → counts
//   get_ai_usage(30)       → daily usage array
// GitHub section shows connect card or clone form.
// ─────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { supabase, withAuthRefresh } from '@/lib/supabase';
import { GitHubRepoConnect } from '@/components/features/GitHubRepoConnect';
import { formatRelativeTime } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Zap, GitBranch, Bot, Hammer, Terminal, Code2,
  FileText, RefreshCw, GitPullRequest, TrendingUp,
  MessageSquare, CheckCircle, XCircle, AlertTriangle,
  Activity, Loader2,
} from 'lucide-react';

// ── Quick actions ─────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Generate Code',   icon: Zap,           accent: '#00F5A0', href: '/workspace' },
  { label: 'Analyse Repo',    icon: TrendingUp,    accent: '#9B6EF5', href: '/workspace' },
  { label: 'Write Docs',      icon: FileText,      accent: '#38BDF8', href: '/workspace' },
  { label: 'Open PR',         icon: GitPullRequest, accent: '#FBBF24', href: '/workspace' },
  { label: 'View Insights',   icon: Activity,      accent: '#FF4D6D', href: '/analytics' },
  { label: 'Open Chat',       icon: MessageSquare, accent: '#00F5A0', href: '/workspace' },
];

// ── Sparkline ─────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 80; const H = 28;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / range) * H,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`g-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill={`url(#g-${color.slice(1)})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={2.5} fill={color} />
    </svg>
  );
}

// ── Fallback event feed ───────────────────────────────────
const MOCK_EVENTS = [
  { icon: CheckCircle,   label: 'Build #342 passed',      detail: 'feature/auth-v2',   time: Date.now() - 2  * 60_000,          color: '#00F5A0' },
  { icon: XCircle,       label: 'Build #341 failed',      detail: 'hotfix/payments',    time: Date.now() - 8  * 60_000,          color: '#FF4D6D' },
  { icon: Bot,           label: 'AI generated auth.ts',   detail: 'workspace',          time: Date.now() - 15 * 60_000,          color: '#9B6EF5' },
  { icon: Terminal,      label: 'Terminal: npm install',  detail: 'workspace',          time: Date.now() - 22 * 60_000,          color: '#38BDF8' },
  { icon: GitPullRequest,label: 'PR #89 opened',          detail: 'feature/auth-v2',   time: Date.now() - 60 * 60_000,          color: '#FBBF24' },
  { icon: RefreshCw,     label: 'Repo synced: api-server',detail: 'main',               time: Date.now() - 2  * 60 * 60_000,     color: '#38BDF8' },
  { icon: CheckCircle,   label: 'Build #340 passed',      detail: 'main',               time: Date.now() - 3  * 60 * 60_000,     color: '#00F5A0' },
  { icon: AlertTriangle, label: 'High token usage',       detail: '90% of monthly limit', time: Date.now() - 5 * 60 * 60_000,   color: '#FBBF24' },
];

// ═════════════════════════════════════════════════════════
// Dashboard
// ═════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, createNewConversation } = useAppStore();

  // ── Fetch dashboard stats ─────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: () =>
      withAuthRefresh(async () => {
        const { data, error } = await supabase.rpc('get_dashboard_stats');
        if (error) throw new Error(error.message);
        return data as Record<string, number> | null;
      }),
    enabled: !!user,
    staleTime: 60_000,
  });

  // ── Fetch AI usage (last 30 days) ─────────────────────
  const { data: aiUsage } = useQuery({
    queryKey: ['ai-usage-30', user?.id],
    queryFn: () =>
      withAuthRefresh(async () => {
        const { data, error } = await supabase.rpc('get_ai_usage', { days: 30 });
        if (error) throw new Error(error.message);
        return data as Array<{ date: string; count: number }> | null;
      }),
    enabled: !!user,
    staleTime: 120_000,
  });

  // ── Fetch GitHub token from profile ───────────────────
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile-github', user?.id],
    queryFn: () =>
      withAuthRefresh(async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('github_access_token, github_username, ai_requests_used, ai_requests_limit, plan')
          .eq('id', user!.id)
          .single();
        if (error) throw new Error(error.message);
        return data as {
          github_access_token: string | null;
          github_username: string | null;
          ai_requests_used: number;
          ai_requests_limit: number;
          plan: string;
        };
      }),
    enabled: !!user,
    staleTime: 30_000,
  });

  const githubToken = profile?.github_access_token ?? null;

  // ── Derive stat cards ─────────────────────────────────
  const STAT_CARDS = [
    {
      label:    'Connected Repos',
      value:    statsLoading ? '…' : String(stats?.connected_repos ?? 0),
      trend:    '+0',
      trendUp:  true,
      icon:     GitBranch,
      accent:   '#00F5A0',
      sparkline:[0, 0, 0, 0, 0, stats?.connected_repos ?? 0].map(Number),
    },
    {
      label:    'AI Tasks (All Time)',
      value:    statsLoading ? '…' : String(stats?.ai_requests_total ?? profile?.ai_requests_used ?? 0),
      trend:    `${profile?.ai_requests_used ?? 0} this month`,
      trendUp:  true,
      icon:     Bot,
      accent:   '#9B6EF5',
      sparkline: aiUsage?.slice(-6).map((d) => d.count) ?? [0, 0, 0, 0, 0, 0],
    },
    {
      label:    'Conversations',
      value:    statsLoading ? '…' : String(stats?.conversations ?? 0),
      trend:    '+0',
      trendUp:  true,
      icon:     MessageSquare,
      accent:   '#38BDF8',
      sparkline:[0, 0, 0, 0, 0, stats?.conversations ?? 0].map(Number),
    },
    {
      label:    'Terminal Sessions',
      value:    statsLoading ? '…' : String(stats?.terminal_sessions ?? 0),
      trend:    '+0',
      trendUp:  true,
      icon:     Terminal,
      accent:   '#FBBF24',
      sparkline:[0, 0, 0, 0, 0, stats?.terminal_sessions ?? 0].map(Number),
    },
  ];

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    if (action.href === '/workspace') {
      createNewConversation();
    }
    navigate(action.href);
  };

  // ── AI usage chart data ───────────────────────────────
  const chartData = aiUsage?.slice(-14).map((d) => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    requests: d.count,
  })) ?? [];

  const aiUsed  = profile?.ai_requests_used  ?? user?.aiRequestsUsed  ?? 0;
  const aiLimit = profile?.ai_requests_limit ?? user?.aiRequestsLimit ?? 500;
  const plan    = profile?.plan ?? user?.plan ?? 'starter';

  return (
    <div
      className="h-full overflow-y-auto px-6 py-6"
      style={{ fontFamily: 'var(--font-body)', color: '#EEEEFF' }}
    >
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},&nbsp;
          {user?.fullName?.split(' ')[0] ?? 'Dev'} 👋
        </h1>
        <p className="text-sm" style={{ color: '#5C5C7A' }}>
          Here's your engineering command centre. What are we building today?
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-xl p-5 animate-fade-up"
            style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#5C5C7A' }}>{stat.label}</p>
                <p className="text-3xl font-bold leading-none" style={{ fontFamily: 'var(--font-display)', color: stat.accent }}>
                  {statsLoading ? <Loader2 className="w-6 h-6 animate-spin inline" style={{ color: stat.accent }} /> : stat.value}
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${stat.accent}12`, border: `1px solid ${stat.accent}20` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.accent }} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-xs" style={{ color: '#3A3A52' }}>{stat.trend}</span>
              <Sparkline data={stat.sparkline.length >= 2 ? stat.sparkline : [0, 1]} color={stat.accent} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Quick actions */}
        <div className="rounded-xl p-5 animate-fade-up delay-200" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#EEEEFF' }}>Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl transition-all duration-200"
                style={{ background: '#16161F', border: '1px solid rgba(255,255,255,0.05)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${action.accent}08`; e.currentTarget.style.borderColor = `${action.accent}25`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#16161F'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = ''; }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${action.accent}15`, border: `1px solid ${action.accent}25` }}>
                  <action.icon className="w-4 h-4" style={{ color: action.accent }} />
                </div>
                <span className="text-xs font-medium text-center" style={{ color: '#9494B8' }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="xl:col-span-2 rounded-xl p-5 animate-fade-up delay-300" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#EEEEFF' }}>Activity Feed</h2>
            <span className="text-xs" style={{ color: '#3A3A52' }}>Recent events</span>
          </div>
          <div className="space-y-1">
            {MOCK_EVENTS.map((event, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-default"
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${event.color}12` }}>
                  <event.icon className="w-3.5 h-3.5" style={{ color: event.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium" style={{ color: '#EEEEFF' }}>{event.label}</span>
                  <span className="text-xs ml-2" style={{ color: '#5C5C7A' }}>{event.detail}</span>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: '#3A3A52' }}>{formatRelativeTime(event.time)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI usage chart + GitHub connect */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* AI Usage Chart */}
        {chartData.length > 0 && (
          <div className="rounded-xl p-5 animate-fade-up delay-400" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#EEEEFF' }}>AI Requests (Last 14 Days)</h2>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#9B6EF5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9B6EF5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#3A3A52', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#EEEEFF', fontSize: '12px' }}
                  itemStyle={{ color: '#9B6EF5' }}
                />
                <Area type="monotone" dataKey="requests" stroke="#9B6EF5" fill="url(#aiGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* GitHub Connect */}
        <GitHubRepoConnect githubToken={githubToken} onTokenStored={() => void refetchProfile()} />
      </div>

      {/* Plan Usage */}
      <div className="rounded-xl p-5 animate-fade-up delay-500" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: '#EEEEFF' }}>Plan Usage</h2>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(0,245,160,0.08)', color: '#00F5A0', border: '1px solid rgba(0,245,160,0.15)' }}>
            {plan.toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'AI Requests', used: aiUsed, limit: aiLimit, color: '#9B6EF5' },
            { label: 'Repos Connected', used: stats?.connected_repos ?? 0, limit: 100, color: '#00F5A0' },
            { label: 'Conversations', used: stats?.conversations ?? 0, limit: 1000, color: '#38BDF8' },
          ].map((item) => {
            const pct = item.limit > 0 ? Math.min(100, Math.round((item.used / item.limit) * 100)) : 0;
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
                    style={{ width: `${pct}%`, background: danger ? '#FF4D6D' : item.color, boxShadow: danger ? '0 0 8px rgba(255,77,109,0.5)' : `0 0 8px ${item.color}40` }}
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
