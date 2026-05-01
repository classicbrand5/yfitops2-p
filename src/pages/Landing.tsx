import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Terminal,
  Bot,
  GitBranch,
  BarChart2,
  Shield,
  ArrowRight,
  Github,
  Twitter,
  Linkedin,
  ChevronRight,
  Star,
  Check,
  Play,
} from 'lucide-react';
import heroImg from '@/assets/hero-ide.jpg';

// ── Typing animation for code demo ────────────────────────
const CODE_SNIPPET = `// YFitOps Agent writes production code
async function createJWTMiddleware(app: Express) {
  const middleware = await agent.generate({
    task: "JWT auth middleware with refresh tokens",
    stack: "Express + TypeScript",
    security: "OWASP best practices"
  });
  
  app.use(middleware.handler);
  console.log("✓ Auth middleware deployed");
}`;

const TERMINAL_LINES = [
  '$ npm run build',
  '> yfitops-api@1.0.0 build',
  '> tsc && vite build',
  '',
  'Building for production...',
  '✓ 847 modules transformed.',
  '✓ Built in 2.34s',
  '',
  '$ git push origin feature/auth-v2',
  'Enumerating objects: 12, done.',
  'remote: Create pull request for feature/auth-v2',
  '✓ PR opened: github.com/team/api/pull/89',
];

function useTypingEffect(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    setDisplayed('');
    setDone(false);
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed, done };
}

// ── Stats ─────────────────────────────────────────────────
const STATS = [
  { value: '2,400+', label: 'Engineering Teams' },
  { value: '10M+', label: 'Commands Run' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<2s', label: 'Avg AI Response' },
];

// ── Features ──────────────────────────────────────────────
const FEATURES = [
  {
    icon: Terminal,
    title: 'Real Terminal Execution',
    description: 'Every command runs in a real sandboxed shell. No fake output, no simulations. npm install, git push, test runners — all real.',
    accent: '#00F5A0',
    size: 'large',
  },
  {
    icon: Bot,
    title: 'AI That Writes Code',
    description: 'Not suggestions — complete, production-ready code with real diffs applied directly to your files.',
    accent: '#9B6EF5',
    size: 'medium',
  },
  {
    icon: GitBranch,
    title: 'GitHub Native',
    description: 'Connect repos, create branches, open PRs, review diffs — all from one interface.',
    accent: '#38BDF8',
    size: 'small',
  },
  {
    icon: BarChart2,
    title: 'Build Monitor',
    description: 'Real-time build status with ANSI-preserved log streaming.',
    accent: '#FBBF24',
    size: 'small',
  },
  {
    icon: Shield,
    title: 'Safety Gates',
    description: 'Dangerous commands are blocked with explicit confirmation flows.',
    accent: '#FF4D6D',
    size: 'small',
  },
];

// ── Pricing ───────────────────────────────────────────────
const PLANS = [
  {
    name: 'Starter',
    price: { monthly: 29, annual: 24 },
    repos: '3',
    aiRequests: '500/mo',
    terminal: '50 sessions/mo',
    users: '1',
    support: 'Community',
    featured: false,
  },
  {
    name: 'Pro',
    price: { monthly: 79, annual: 65 },
    repos: 'Unlimited',
    aiRequests: 'Unlimited',
    terminal: 'Unlimited',
    users: '3',
    support: 'Priority Email',
    featured: true,
  },
  {
    name: 'Team',
    price: { monthly: 199, annual: 165 },
    repos: 'Unlimited',
    aiRequests: 'Unlimited',
    terminal: 'Unlimited',
    users: '10',
    support: 'Dedicated Slack',
    featured: false,
  },
];

// ── Testimonials ──────────────────────────────────────────
const TESTIMONIALS = [
  { name: 'Sarah Chen', role: 'Staff Engineer', company: 'Vercel', quote: 'Replaced 3 tools in one. The AI actually understands our codebase.', stars: 5 },
  { name: 'Marcus Reid', role: 'Tech Lead', company: 'Stripe', quote: 'Ships PRs 4× faster. The terminal integration is genuinely real.', stars: 5 },
  { name: 'Priya Nair', role: 'CTO', company: 'Linear', quote: 'The autonomy modes let junior devs work confidently. Game changer.', stars: 5 },
  { name: 'Tom Walsh', role: 'Principal Eng', company: 'Figma', quote: 'Finally an IDE that runs in the browser and doesn\'t fake anything.', stars: 5 },
  { name: 'Aiko Tanaka', role: 'Founding Eng', company: 'Loom', quote: 'Build monitor alone is worth the subscription. Real-time ANSI logs.', stars: 5 },
  { name: 'Carlos Vega', role: 'Backend Lead', company: 'Notion', quote: 'The diff previews before any file write. Chef\'s kiss.', stars: 5 },
];

export default function Landing() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(true);
  const { displayed } = useTypingEffect(CODE_SNIPPET, 16);
  const [terminalLine, setTerminalLine] = useState(0);
  const [terminalText, setTerminalText] = useState<string[]>([]);

  // Animate terminal lines
  useEffect(() => {
    if (terminalLine >= TERMINAL_LINES.length) return;
    const timer = setTimeout(() => {
      setTerminalText((prev) => [...prev, TERMINAL_LINES[terminalLine]]);
      setTerminalLine((l) => l + 1);
    }, terminalLine === 0 ? 2000 : 300);
    return () => clearTimeout(timer);
  }, [terminalLine]);

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--bg-void)',
        fontFamily: 'var(--font-body)',
        color: 'var(--text-primary)',
      }}
    >
      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-8 h-14"
        style={{
          background: 'rgba(6,6,9,0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(0,245,160,0.2), rgba(124,58,237,0.2))',
              border: '1px solid rgba(0,245,160,0.2)',
            }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: '#00F5A0' }} />
          </div>
          <span
            className="font-bold text-sm tracking-wider"
            style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}
          >
            YFITOPS
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {['Features', 'Pricing', 'Docs', 'Blog'].map((item) => (
            <button
              key={item}
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: '#5C5C7A' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#9494B8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#5C5C7A')}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/auth')}
            className="text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200"
            style={{ color: '#9494B8' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#EEEEFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9494B8')}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="btn-primary text-xs"
          >
            Start Free
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden px-8 py-20">
        {/* Background gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full animate-drift-1"
            style={{ background: 'radial-gradient(circle, rgba(0,245,160,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full animate-drift-2"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }}
          />
          {/* Scan line */}
          <div
            className="absolute left-0 right-0 h-px animate-scan-line"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,245,160,0.04), transparent)' }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="space-y-8 animate-fade-up">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: 'rgba(0,245,160,0.06)',
                border: '1px solid rgba(0,245,160,0.18)',
                color: '#00F5A0',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-pulse" />
              Powered by the world's best AI models
            </div>

            {/* H1 */}
            <h1
              className="leading-none"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 700, letterSpacing: '-1px', color: '#EEEEFF' }}
            >
              Ship Faster With an AI That{' '}
              <span className="glow-text" style={{ color: '#00F5A0' }}>
                Actually Codes
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-lg leading-relaxed max-w-lg" style={{ color: '#9494B8' }}>
              YFitOps connects to your GitHub repos, writes real code, runs real terminal commands, and opens PRs — while you focus on what matters.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="btn-primary text-sm"
                style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '12px', paddingBottom: '12px' }}
              >
                Start Free — No Card Needed
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                className="btn-ghost text-sm"
                style={{ paddingLeft: '20px', paddingRight: '20px', paddingTop: '12px', paddingBottom: '12px' }}
              >
                <Play className="w-4 h-4" />
                Watch 90-Second Demo
              </button>
            </div>

            {/* Trust bar */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <p className="text-xs" style={{ color: '#3A3A52' }}>
                Trusted by engineering teams at
              </p>
              {['Vercel', 'Stripe', 'Linear', 'Notion', 'Figma'].map((co) => (
                <span key={co} className="text-xs font-semibold" style={{ color: '#5C5C7A' }}>
                  {co}
                </span>
              ))}
            </div>
          </div>

          {/* Right — IDE mockup */}
          <div className="relative animate-fade-up delay-200">
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: '#0C0C12',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 0 40px rgba(0,245,160,0.08), 0 0 80px rgba(0,245,160,0.04), 0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              {/* Title bar */}
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F56' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#FFBD2E' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#27C93F' }} />
                </div>
                <span className="text-xs" style={{ color: '#5C5C7A', fontFamily: 'var(--font-mono)' }}>
                  YFitOps Workspace — middleware/auth.ts
                </span>
              </div>

              {/* Code area */}
              <div className="p-4" style={{ background: '#0C0C12' }}>
                <pre
                  className="text-xs leading-relaxed"
                  style={{ fontFamily: 'var(--font-mono)', color: '#9494B8', minHeight: '180px' }}
                >
                  {displayed.split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="w-8 text-right mr-4 select-none" style={{ color: '#3A3A52' }}>
                        {i + 1}
                      </span>
                      <span
                        style={{
                          color: line.includes('//') ? '#5C5C7A' :
                                 line.includes('async') || line.includes('await') || line.includes('const') ? '#9B6EF5' :
                                 line.includes('"') ? '#00F5A0' :
                                 '#EEEEFF',
                          fontStyle: line.includes('//') ? 'italic' : 'normal',
                        }}
                      >
                        {line || '\u00A0'}
                      </span>
                    </div>
                  ))}
                  <span className="animate-cursor" style={{ borderRight: '2px solid #00F5A0' }}>
                    &nbsp;
                  </span>
                </pre>
              </div>

              {/* Terminal area */}
              <div
                className="px-4 py-3"
                style={{ background: '#060609', borderTop: '1px solid rgba(255,255,255,0.05)', minHeight: '120px' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#00F5A0' }} />
                  <span className="text-xs" style={{ color: '#5C5C7A', fontFamily: 'var(--font-mono)' }}>
                    Terminal
                  </span>
                </div>
                {terminalText.map((line, i) => (
                  <div
                    key={i}
                    className="text-xs"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: line.startsWith('$') ? '#00F5A0' :
                             line.startsWith('✓') ? '#00F5A0' :
                             line.startsWith('>') ? '#9B6EF5' :
                             '#5C5C7A',
                    }}
                  >
                    {line || '\u00A0'}
                  </div>
                ))}
                {terminalLine < TERMINAL_LINES.length && (
                  <span className="text-xs animate-cursor" style={{ fontFamily: 'var(--font-mono)', borderRight: '2px solid #00F5A0', color: '#00F5A0' }}>
                    &nbsp;
                  </span>
                )}
              </div>
            </div>

            {/* Floating glow */}
            <div
              className="absolute -inset-px rounded-xl pointer-events-none"
              style={{ boxShadow: '0 0 0 1px rgba(0,245,160,0.08)' }}
            />
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section
        className="px-8 py-10"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div
          className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center animate-fade-up">
              <div
                className="text-3xl font-bold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: '#00F5A0' }}
              >
                {stat.value}
              </div>
              <div className="text-sm" style={{ color: '#5C5C7A' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-8 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}
          >
            Everything in one tab
          </h2>
          <p className="text-md" style={{ color: '#9494B8', maxWidth: '480px', margin: '0 auto' }}>
            No copy-paste, no context switching, no fake output.
            Real execution from real infrastructure.
          </p>
        </div>

        {/* Asymmetric bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          {/* Large card */}
          <div
            className="lg:col-span-5 rounded-xl p-6 group transition-all duration-300"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 0 24px rgba(0,245,160,0.12)';
              e.currentTarget.style.borderColor = 'rgba(0,245,160,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
              style={{ background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.2)' }}
            >
              <Terminal className="w-5 h-5" style={{ color: '#00F5A0' }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#EEEEFF' }}>
              Real Terminal Execution
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#5C5C7A' }}>
              Every command runs in a real WebContainer sandbox. npm install, git push, test runners — live output, no faking.
            </p>
            {/* Mini terminal demo */}
            <div
              className="mt-4 rounded-lg p-3"
              style={{ background: '#060609', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {['$ npm run test', '✓ 47 tests passed', '✓ Coverage: 94%'].map((l, i) => (
                <div
                  key={i}
                  className="text-xs"
                  style={{ fontFamily: 'var(--font-mono)', color: l.startsWith('$') ? '#00F5A0' : l.startsWith('✓') ? '#00D488' : '#5C5C7A' }}
                >
                  {l}
                </div>
              ))}
            </div>
          </div>

          {/* Medium card — AI Code Gen */}
          <div
            className="lg:col-span-7 rounded-xl p-6 group transition-all duration-300"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 0 24px rgba(124,58,237,0.12)';
              e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
            >
              <Bot className="w-5 h-5" style={{ color: '#9B6EF5' }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#EEEEFF' }}>
              AI That Writes Production Code
            </h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#5C5C7A' }}>
              Real unified diffs applied directly to your files. Shows you exactly what changes before writing.
            </p>
            {/* Diff preview */}
            <div
              className="rounded-lg p-3 text-xs"
              style={{ background: '#060609', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-mono)' }}
            >
              <div style={{ color: '#5C5C7A' }}>@@ -12,4 +12,9 @@ auth.ts</div>
              <div style={{ color: '#FF4D6D', background: 'rgba(255,77,109,0.06)', padding: '1px 4px' }}>- const token = req.headers['x-token'];</div>
              <div style={{ color: '#00F5A0', background: 'rgba(0,245,160,0.06)', padding: '1px 4px' }}>+ const authHeader = req.headers['authorization'];</div>
              <div style={{ color: '#00F5A0', background: 'rgba(0,245,160,0.06)', padding: '1px 4px' }}>+ if (!authHeader?.startsWith('Bearer ')) {'{'}</div>
              <div style={{ color: '#00F5A0', background: 'rgba(0,245,160,0.06)', padding: '1px 4px' }}>+   return res.status(401).json({'{ error: "Unauthorized" }'})</div>
              <div style={{ color: '#00F5A0', background: 'rgba(0,245,160,0.06)', padding: '1px 4px' }}>+ {'}'}</div>
            </div>
          </div>

          {/* Small cards */}
          {[
            { icon: GitBranch, title: 'GitHub Native', desc: 'Connect repos, open PRs, review diffs.', accent: '#38BDF8' },
            { icon: BarChart2, title: 'Build Monitor', desc: 'Real-time logs with ANSI colors preserved.', accent: '#FBBF24' },
            { icon: Shield, title: 'Safety Gates', desc: 'Dangerous commands blocked with confirmation.', accent: '#FF4D6D' },
          ].map((feat) => (
            <div
              key={feat.title}
              className="lg:col-span-4 rounded-xl p-5 group transition-all duration-300"
              style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = `${feat.accent}33`;
                e.currentTarget.style.boxShadow = `0 0 20px ${feat.accent}18`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <feat.icon className="w-6 h-6 mb-3" style={{ color: feat.accent }} />
              <h3 className="text-base font-semibold mb-1.5" style={{ color: '#EEEEFF' }}>
                {feat.title}
              </h3>
              <p className="text-sm" style={{ color: '#5C5C7A' }}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-8 py-20" style={{ background: '#060609' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}
            >
              Simple, transparent pricing
            </h2>

            {/* Annual toggle */}
            <div className="inline-flex items-center gap-3 mt-4">
              <span className="text-sm" style={{ color: annual ? '#5C5C7A' : '#9494B8' }}>Monthly</span>
              <button
                onClick={() => setAnnual(!annual)}
                className="relative w-12 h-6 rounded-full transition-all duration-200"
                style={{ background: annual ? '#00F5A0' : 'rgba(255,255,255,0.1)' }}
                aria-label="Toggle annual billing"
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                  style={{
                    background: annual ? '#060609' : '#9494B8',
                    left: annual ? '26px' : '2px',
                  }}
                />
              </button>
              <span className="text-sm" style={{ color: annual ? '#9494B8' : '#5C5C7A' }}>
                Annual
                <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,245,160,0.1)', color: '#00F5A0' }}>
                  Save 18%
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="relative rounded-xl p-6 transition-all duration-300"
                style={{
                  background: plan.featured ? 'rgba(0,245,160,0.04)' : '#111118',
                  border: plan.featured ? '1px solid rgba(0,245,160,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: plan.featured ? '0 0 40px rgba(0,245,160,0.08)' : 'none',
                }}
              >
                {plan.featured && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: '#7C3AED', color: '#EEEEFF' }}
                  >
                    Most Popular
                  </div>
                )}

                <h3 className="text-lg font-bold mb-1" style={{ color: '#EEEEFF', fontFamily: 'var(--font-display)' }}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-bold" style={{ color: plan.featured ? '#00F5A0' : '#EEEEFF', fontFamily: 'var(--font-display)' }}>
                    ${annual ? plan.price.annual : plan.price.monthly}
                  </span>
                  <span className="text-sm" style={{ color: '#5C5C7A' }}>/mo</span>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { label: 'Repos', value: plan.repos },
                    { label: 'AI Requests', value: plan.aiRequests },
                    { label: 'Terminal', value: plan.terminal },
                    { label: 'Users', value: plan.users },
                    { label: 'Support', value: plan.support },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#5C5C7A' }}>{item.label}</span>
                      <span className="text-sm font-medium" style={{ color: '#9494B8' }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate('/auth')}
                  className={plan.featured ? 'btn-primary w-full justify-center' : 'btn-ghost w-full justify-center'}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 overflow-hidden">
        <div className="text-center mb-12 px-8">
          <h2
            className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}
          >
            Loved by engineering teams
          </h2>
        </div>

        {/* Marquee row 1 */}
        <div className="flex overflow-hidden mb-4">
          <div className="flex gap-4 animate-marquee">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <TestimonialCard key={i} testimonial={t} />
            ))}
          </div>
        </div>

        {/* Marquee row 2 — reversed */}
        <div className="flex overflow-hidden">
          <div className="flex gap-4 animate-marquee-rev">
            {[...TESTIMONIALS.slice().reverse(), ...TESTIMONIALS.slice().reverse()].map((t, i) => (
              <TestimonialCard key={i} testimonial={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="px-8 py-20">
        <div
          className="max-w-3xl mx-auto rounded-2xl p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0,245,160,0.06) 0%, rgba(124,58,237,0.06) 100%)',
            border: '1px solid rgba(0,245,160,0.15)',
            boxShadow: '0 0 60px rgba(0,245,160,0.06)',
          }}
        >
          <h2
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}
          >
            Ready to ship faster?
          </h2>
          <p className="text-lg mb-8" style={{ color: '#9494B8' }}>
            Join 2,400+ engineering teams who've replaced their IDE stack with YFitOps.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="btn-primary text-base"
            style={{ paddingLeft: '32px', paddingRight: '32px', paddingTop: '14px', paddingBottom: '14px' }}
          >
            Start Free Today
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-sm mt-4" style={{ color: '#3A3A52' }}>
            No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="px-8 py-12"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.2)' }}
              >
                <Zap className="w-3.5 h-3.5" style={{ color: '#00F5A0' }} />
              </div>
              <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}>
                YFITOPS
              </span>
            </div>
            <p className="text-sm mb-4" style={{ color: '#5C5C7A' }}>
              Your autonomous engineering brain — code, run, ship, repeat.
            </p>
            <div className="flex gap-3">
              {[{ Icon: Github, label: 'GitHub' }, { Icon: Twitter, label: 'Twitter' }, { Icon: Linkedin, label: 'LinkedIn' }].map(({ Icon, label }) => (
                <button
                  key={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                  style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#5C5C7A' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#9494B8';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#5C5C7A';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#3A3A52' }}>
              Product
            </p>
            {['Features', 'Pricing', 'Changelog', 'Roadmap', 'Documentation', 'API Reference'].map((link) => (
              <button
                key={link}
                className="block text-sm mb-2 text-left transition-colors duration-200"
                style={{ color: '#5C5C7A' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#9494B8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#5C5C7A')}
              >
                {link}
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#3A3A52' }}>
              Stay Updated
            </p>
            <p className="text-sm mb-3" style={{ color: '#5C5C7A' }}>
              Get engineering insights and product updates.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="you@company.com"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all duration-200"
                style={{
                  background: '#13131C',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: '#EEEEFF',
                  fontFamily: 'var(--font-body)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,245,160,0.3)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
              />
              <button className="btn-primary text-xs px-3 py-2">
                →
              </button>
            </div>
            <div className="flex flex-wrap gap-4 mt-6">
              {['Privacy', 'Terms', 'Security'].map((link) => (
                <button
                  key={link}
                  className="text-xs transition-colors duration-200"
                  style={{ color: '#3A3A52' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#5C5C7A')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#3A3A52')}
                >
                  {link}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className="max-w-6xl mx-auto mt-8 pt-6 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <p className="text-xs" style={{ color: '#3A3A52' }}>
            © 2025 YFitOps. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: '#3A3A52' }}>
            Built with OnSpace AI
          </p>
        </div>
      </footer>
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: typeof TESTIMONIALS[0] }) {
  return (
    <div
      className="flex-shrink-0 w-72 rounded-xl p-5"
      style={{
        background: '#111118',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: testimonial.stars }).map((_, i) => (
          <Star key={i} className="w-3 h-3 fill-current" style={{ color: '#FBBF24' }} />
        ))}
      </div>
      <p className="text-sm leading-relaxed mb-4" style={{ color: '#9494B8' }}>
        "{testimonial.quote}"
      </p>
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #00F5A0, #7C3AED)', color: '#060609' }}
        >
          {testimonial.name.split(' ').map((n) => n[0]).join('')}
        </div>
        <div>
          <p className="text-xs font-semibold" style={{ color: '#EEEEFF' }}>
            {testimonial.name}
          </p>
          <p className="text-2xs" style={{ color: '#5C5C7A' }}>
            {testimonial.role} · {testimonial.company}
          </p>
        </div>
      </div>
    </div>
  );
}
