import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Zap, Github, ArrowRight, Terminal, Bot, BarChart2, CheckCircle, AlertCircle } from 'lucide-react';

type Tab = 'signin' | 'signup';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, continueWithGitHub } = useAuth();

  const [tab, setTab] = useState<Tab>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sign in form
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');

  // Sign up form
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirm, setSuConfirm] = useState('');
  const [suRole, setSuRole] = useState('developer');
  const [suAgree, setSuAgree] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siEmail || !siPassword) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError(null);
    await signIn(siEmail, siPassword);
    setSuccess(true);
    setLoading(false);
    setTimeout(() => navigate('/dashboard'), 1500);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suName || !suEmail || !suPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (suPassword !== suConfirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!suAgree) {
      setError('You must agree to the Terms of Service.');
      return;
    }
    setLoading(true);
    setError(null);
    await signUp(suEmail, suName, suPassword);
    setSuccess(true);
    setLoading(false);
    setTimeout(() => navigate('/dashboard'), 1500);
  };

  const handleGitHub = async () => {
    setLoading(true);
    setError(null);
    await continueWithGitHub();
    setSuccess(true);
    setLoading(false);
    setTimeout(() => navigate('/dashboard'), 1500);
  };

  const inputClass = `
    w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-200
  `;
  const inputStyle = {
    background: '#13131C',
    border: '1px solid rgba(255,255,255,0.07)',
    color: '#EEEEFF',
    fontFamily: 'var(--font-body)',
  };

  const featurePills = [
    { icon: Terminal, text: 'Real terminal — live bash execution', color: '#00F5A0' },
    { icon: Bot, text: 'AI that writes code, not just suggestions', color: '#9B6EF5' },
    { icon: BarChart2, text: 'Built-in engineering analytics', color: '#38BDF8' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: '#060609', fontFamily: 'var(--font-body)' }}>
      {/* ── Left: Form panel ── */}
      <div
        className="flex flex-col justify-center px-10 py-12 w-full max-w-md flex-shrink-0"
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 mb-10 cursor-pointer"
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.2)' }}
          >
            <Zap className="w-4 h-4" style={{ color: '#00F5A0' }} />
          </div>
          <span className="font-bold text-sm tracking-wider" style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}>
            YFITOPS
          </span>
        </div>

        {/* Tabs */}
        <div
          className="flex rounded-lg p-1 mb-8 relative"
          style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div
            className="absolute top-1 bottom-1 rounded-md transition-all duration-200"
            style={{
              width: 'calc(50% - 4px)',
              left: tab === 'signin' ? '4px' : 'calc(50%)',
              background: '#1C1C27',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          />
          {(['signin', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setSuccess(false); }}
              className="relative flex-1 py-2 text-sm font-medium rounded-md transition-colors duration-200 z-10"
              style={{ color: tab === t ? '#EEEEFF' : '#5C5C7A' }}
            >
              {t === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Success banner */}
        {success && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg mb-6 animate-fade-up"
            style={{ background: 'rgba(0,245,160,0.08)', border: '1px solid rgba(0,245,160,0.2)', color: '#00F5A0' }}
            role="alert"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">Success! Redirecting to your workspace…</span>
          </div>
        )}

        {/* Error banner */}
        {error && !success && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg mb-6 animate-fade-up"
            style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.2)', color: '#FF4D6D' }}
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Sign In Form */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4" noValidate>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#5C5C7A' }}>
                Work Email
              </label>
              <input
                type="email"
                value={siEmail}
                onChange={(e) => setSiEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,245,160,0.3)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                required
                aria-label="Work email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: '#5C5C7A' }}>
                  Password
                </label>
                <button type="button" className="text-xs" style={{ color: '#00F5A0' }}>
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={siPassword}
                  onChange={(e) => setSiPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                  style={{ ...inputStyle, paddingRight: '40px' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,245,160,0.3)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                  required
                  aria-label="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#5C5C7A' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Signing in…
                </div>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <Divider />

            <button
              type="button"
              onClick={handleGitHub}
              disabled={loading}
              className="btn-ghost w-full justify-center py-3"
            >
              <Github className="w-4 h-4" />
              Continue with GitHub
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4" noValidate>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#5C5C7A' }}>Full Name</label>
              <input
                type="text"
                value={suName}
                onChange={(e) => setSuName(e.target.value)}
                placeholder="Alex Johnson"
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,245,160,0.3)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                required
                aria-label="Full name"
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#5C5C7A' }}>Work Email</label>
              <input
                type="email"
                value={suEmail}
                onChange={(e) => setSuEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,245,160,0.3)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                required
                aria-label="Work email"
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#5C5C7A' }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={suPassword}
                  onChange={(e) => setSuPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                  style={{ ...inputStyle, paddingRight: '40px' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,245,160,0.3)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                  required
                  aria-label="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#5C5C7A' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#5C5C7A' }}>Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={suConfirm}
                  onChange={(e) => setSuConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                  style={{ ...inputStyle, paddingRight: '40px' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,245,160,0.3)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                  aria-label="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#5C5C7A' }}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#5C5C7A' }}>Role</label>
              <select
                value={suRole}
                onChange={(e) => setSuRole(e.target.value)}
                className={inputClass}
                style={{ ...inputStyle, cursor: 'pointer' }}
                aria-label="Role"
              >
                <option value="developer">Developer</option>
                <option value="tech_lead">Tech Lead</option>
                <option value="engineering_manager">Engineering Manager</option>
              </select>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="agree"
                checked={suAgree}
                onChange={(e) => setSuAgree(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded flex-shrink-0"
                style={{ accentColor: '#00F5A0' }}
              />
              <label htmlFor="agree" className="text-xs" style={{ color: '#5C5C7A', cursor: 'pointer' }}>
                I agree to the{' '}
                <button type="button" className="underline" style={{ color: '#00F5A0' }}>Terms of Service</button>
                {' '}and{' '}
                <button type="button" className="underline" style={{ color: '#00F5A0' }}>Privacy Policy</button>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Creating account…
                </div>
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <Divider />

            <button
              type="button"
              onClick={handleGitHub}
              disabled={loading}
              className="btn-ghost w-full justify-center py-3"
            >
              <Github className="w-4 h-4" />
              Continue with GitHub
            </button>
          </form>
        )}
      </div>

      {/* ── Right: Visual panel ── */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-center px-16 py-12 relative overflow-hidden"
        style={{ background: '#0C0C12' }}
      >
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full animate-drift-1"
            style={{ background: 'radial-gradient(circle, rgba(0,245,160,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full animate-drift-2"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }}
          />

          {/* Floating code blocks background */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-xs rounded-lg p-3 animate-fade-in"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'rgba(0,245,160,0.04)',
                border: '1px solid rgba(0,245,160,0.03)',
                background: 'rgba(0,245,160,0.01)',
                top: `${10 + i * 15}%`,
                left: `${5 + (i % 3) * 30}%`,
                animationDelay: `${i * 200}ms`,
                transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (i + 1)}deg)`,
              }}
            >
              {['async function deploy()',
                'const result = await ai.run()',
                'git push origin main',
                'npm run test:ci',
                'docker build -t app .',
                'kubectl apply -f deploy.yml'][i]}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          <blockquote
            className="text-4xl font-bold leading-tight mb-12"
            style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF', letterSpacing: '-0.5px' }}
          >
            "The IDE you've{' '}
            <span className="glow-text" style={{ color: '#00F5A0' }}>
              always wanted
            </span>"
          </blockquote>

          <div className="space-y-4">
            {featurePills.map((pill, i) => (
              <div
                key={pill.text}
                className="flex items-center gap-4 animate-slide-left"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${pill.color}12`,
                    border: `1px solid ${pill.color}25`,
                  }}
                >
                  <pill.icon className="w-5 h-5" style={{ color: pill.color }} />
                </div>
                <div
                  className="flex-1 px-4 py-3 rounded-xl"
                  style={{
                    background: 'rgba(17,17,24,0.6)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: '#9494B8' }}>
                    {pill.text}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div
            className="mt-12 grid grid-cols-3 gap-4 pt-8"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            {[
              { value: '2,400+', label: 'Teams' },
              { value: '10M+', label: 'Commands run' },
              { value: '<2s', label: 'AI response' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="text-xl font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: '#00F5A0' }}
                >
                  {stat.value}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#5C5C7A' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <span className="text-xs" style={{ color: '#3A3A52' }}>or</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}
