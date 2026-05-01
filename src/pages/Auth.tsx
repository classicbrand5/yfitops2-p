import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, classifyAuthError } from '@/hooks/useAuth';
import { useOtpCooldown } from '@/hooks/useOtpCooldown';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import {
  Eye, EyeOff, Zap, Github, ArrowRight,
  Terminal, Bot, BarChart2, CheckCircle, AlertCircle,
  Mail, KeyRound, ShieldCheck, Clock, RefreshCw,
} from 'lucide-react';

type Tab = 'signin' | 'signup';
type SignupStep = 'email' | 'otp' | 'password';

// ── Inline field label ────────────────────────────────────
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-medium mb-1.5 block"
      style={{ color: '#5C5C7A' }}
    >
      {children}
    </label>
  );
}

// ── Divider ───────────────────────────────────────────────
function Divider() {
  return (
    <div className="flex items-center gap-3" role="separator">
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <span className="text-xs" style={{ color: '#3A3A52' }}>or</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

// ── Status banner ─────────────────────────────────────────
type BannerKind = 'error' | 'success' | 'info' | 'warning';

function Banner({ kind, children }: { kind: BannerKind; children: React.ReactNode }) {
  const styles: Record<BannerKind, { bg: string; border: string; color: string; Icon: React.ElementType }> = {
    error:   { bg: 'rgba(255,77,109,0.08)',  border: 'rgba(255,77,109,0.2)',  color: '#FF4D6D', Icon: AlertCircle },
    success: { bg: 'rgba(0,245,160,0.08)',   border: 'rgba(0,245,160,0.2)',   color: '#00F5A0', Icon: CheckCircle },
    info:    { bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.2)',  color: '#38BDF8', Icon: ShieldCheck },
    warning: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', color: '#FBBF24', Icon: Clock },
  };
  const { bg, border, color, Icon } = styles[kind];

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg mb-5 animate-fade-up"
      style={{ background: bg, border: `1px solid ${border}`, color }}
      role="alert"
      aria-live="polite"
    >
      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium leading-snug">{children}</span>
    </div>
  );
}

// ── Shared input styling ──────────────────────────────────
const inputBase = 'w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors duration-150';
const inputBaseStyle: React.CSSProperties = {
  background: '#13131C',
  border: '1px solid rgba(255,255,255,0.07)',
  color: '#EEEEFF',
  fontFamily: 'var(--font-body)',
};

function useInputBorder() {
  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = 'rgba(0,245,160,0.35)';
      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,245,160,0.08)';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
      e.currentTarget.style.boxShadow = 'none';
    },
  };
}

// ── Spinner ───────────────────────────────────────────────
function Spinner() {
  return (
    <div
      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
      style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
      role="status"
      aria-label="Loading"
    />
  );
}

// ═════════════════════════════════════════════════════════
// AUTH PAGE
// ═════════════════════════════════════════════════════════
export default function Auth() {
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const inputBorder = useInputBorder();

  const [tab, setTab] = useState<Tab>('signin');

  // ── Per-tab banner state ──────────────────────────────
  type BannerState = { kind: BannerKind; message: string } | null;
  const [banner, setBanner] = useState<BannerState>(null);
  const [success, setSuccess] = useState(false);

  const clearBanner = () => setBanner(null);

  // ── In-flight locks — one per action, prevents double-fire
  const inFlightRef = useRef<Record<string, boolean>>({});
  const isInFlight = (key: string) => !!inFlightRef.current[key];
  const lockAction = (key: string) => { inFlightRef.current[key] = true; };
  const unlockAction = (key: string) => { inFlightRef.current[key] = false; };

  // ── Sign In form state ────────────────────────────────
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siLoading, setSiLoading] = useState(false);
  const [showSiPassword, setShowSiPassword] = useState(false);

  // ── Sign Up multi-step state ──────────────────────────
  const [signupStep, setSignupStep] = useState<SignupStep>('email');
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suRole, setSuRole] = useState('developer');
  const [suOtp, setSuOtp] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirm, setSuConfirm] = useState('');
  const [suAgree, setSuAgree] = useState(false);
  const [suLoading, setSuLoading] = useState(false);
  const [showSuPassword, setShowSuPassword] = useState(false);
  const [showSuConfirm, setShowSuConfirm] = useState(false);

  // OTP cooldown — keyed to email so changes reset the timer
  const { canSend, secondsLeft, startCooldown, resetCooldown } = useOtpCooldown(suEmail);

  // ── Tab switch — clean all state ──────────────────────
  const switchTab = useCallback((t: Tab) => {
    setTab(t);
    setBanner(null);
    setSuccess(false);
    setSignupStep('email');
    setSuOtp('');
    setSuPassword('');
    setSuConfirm('');
    setSiPassword('');
    inFlightRef.current = {};
  }, []);

  // ── Handle auth errors uniformly ──────────────────────
  const handleAuthError = useCallback(
    (err: unknown, action: string) => {
      const classified = classifyAuthError(err);
      console.error(`[Auth] ${action} error:`, err);

      if (classified.type === 'rate_limit') {
        setBanner({ kind: 'warning', message: classified.message });
        toast.warning(classified.message);
      } else {
        setBanner({ kind: 'error', message: classified.message });
        toast.error(classified.message);
      }
    },
    []
  );

  // ════════════════════════════════════════════════════
  // SIGN IN
  // ════════════════════════════════════════════════════
  const handleSignIn = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearBanner();

      // Client-side validation — no network cost
      if (!siEmail.trim()) {
        setBanner({ kind: 'error', message: 'Please enter your email address.' });
        return;
      }
      if (!siPassword) {
        setBanner({ kind: 'error', message: 'Please enter your password.' });
        return;
      }

      // In-flight guard
      if (isInFlight('signin')) return;
      lockAction('signin');
      setSiLoading(true);

      try {
        const user = await authService.signInWithPassword(siEmail.trim(), siPassword);
        setUser(authService.mapUser(user));
        setSuccess(true);
        // Navigate — do NOT call setSiLoading(false) here; let the
        // component unmount cleanly
        navigate('/dashboard');
      } catch (err) {
        handleAuthError(err, 'signIn');
        setSiLoading(false);
      } finally {
        unlockAction('signin');
      }
    },
    [siEmail, siPassword, setUser, navigate, handleAuthError]
  );

  // ════════════════════════════════════════════════════
  // SIGN UP — STEP 1: Send OTP
  // ════════════════════════════════════════════════════
  const handleSendOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearBanner();

      // Client-side validation
      if (!suName.trim()) {
        setBanner({ kind: 'error', message: 'Please enter your full name.' });
        return;
      }
      if (!suEmail.trim() || !suEmail.includes('@')) {
        setBanner({ kind: 'error', message: 'Please enter a valid email address.' });
        return;
      }
      if (!suAgree) {
        setBanner({ kind: 'error', message: 'Please accept the Terms of Service to continue.' });
        return;
      }

      // Cooldown guard — most important protection
      if (!canSend) {
        setBanner({
          kind: 'warning',
          message: `Please wait ${secondsLeft}s before requesting another code.`,
        });
        return;
      }

      // In-flight guard
      if (isInFlight('sendOtp')) return;
      lockAction('sendOtp');
      setSuLoading(true);

      try {
        await authService.sendOtp(suEmail.trim());
        startCooldown();
        setSignupStep('otp');
        setSuOtp('');
        clearBanner();
        toast.success(`Verification code sent to ${suEmail.trim()}`);
      } catch (err) {
        handleAuthError(err, 'sendOtp');
      } finally {
        // Always clear loading — step transition happens via setSignupStep
        setSuLoading(false);
        unlockAction('sendOtp');
      }
    },
    [suName, suEmail, suAgree, canSend, secondsLeft, startCooldown, handleAuthError]
  );

  // ════════════════════════════════════════════════════
  // SIGN UP — STEP 2: Verify OTP
  // ════════════════════════════════════════════════════
  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearBanner();

      if (!suOtp || suOtp.length < 6) {
        setBanner({ kind: 'error', message: 'Please enter the full 6-digit code from your email.' });
        return;
      }

      if (isInFlight('verifyOtp')) return;
      lockAction('verifyOtp');
      setSuLoading(true);

      try {
        await authService.verifyOtp(suEmail.trim(), suOtp);
        resetCooldown(); // Verified — clear the cooldown lock
        setSignupStep('password');
        clearBanner();
      } catch (err) {
        handleAuthError(err, 'verifyOtp');
      } finally {
        setSuLoading(false);
        unlockAction('verifyOtp');
      }
    },
    [suOtp, suEmail, resetCooldown, handleAuthError]
  );

  // ════════════════════════════════════════════════════
  // SIGN UP — STEP 2: Resend OTP
  // ════════════════════════════════════════════════════
  const handleResendOtp = useCallback(async () => {
    clearBanner();

    if (!canSend) {
      setBanner({
        kind: 'warning',
        message: `You can request another code in ${secondsLeft}s.`,
      });
      return;
    }

    if (isInFlight('resendOtp')) return;
    lockAction('resendOtp');
    setSuLoading(true);

    try {
      await authService.sendOtp(suEmail.trim());
      startCooldown();
      setBanner({ kind: 'info', message: `A new code has been sent to ${suEmail.trim()}.` });
      toast.success('New verification code sent.');
    } catch (err) {
      handleAuthError(err, 'resendOtp');
    } finally {
      setSuLoading(false);
      unlockAction('resendOtp');
    }
  }, [canSend, secondsLeft, suEmail, startCooldown, handleAuthError]);

  // ════════════════════════════════════════════════════
  // SIGN UP — STEP 3: Set Password
  // ════════════════════════════════════════════════════
  const handleSetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearBanner();

      if (!suPassword) {
        setBanner({ kind: 'error', message: 'Please enter a password.' });
        return;
      }
      if (suPassword.length < 8) {
        setBanner({ kind: 'error', message: 'Password must be at least 8 characters.' });
        return;
      }
      if (suPassword !== suConfirm) {
        setBanner({ kind: 'error', message: 'Passwords do not match.' });
        return;
      }

      if (isInFlight('setPassword')) return;
      lockAction('setPassword');
      setSuLoading(true);

      try {
        const user = await authService.setPasswordAndName(suPassword, suName.trim(), suRole);
        setUser(authService.mapUser(user));
        setSuccess(true);
        toast.success('Account created! Welcome to YFitOps.');
        navigate('/dashboard');
      } catch (err) {
        handleAuthError(err, 'setPassword');
        setSuLoading(false);
      } finally {
        unlockAction('setPassword');
      }
    },
    [suPassword, suConfirm, suName, suRole, setUser, navigate, handleAuthError]
  );

  // ════════════════════════════════════════════════════
  // GITHUB OAUTH
  // ════════════════════════════════════════════════════
  const handleGitHub = useCallback(async () => {
    clearBanner();

    // Do NOT set loading — browser will redirect; state update would be abandoned
    if (isInFlight('github')) return;
    lockAction('github');

    try {
      await authService.signInWithGitHub();
      // Browser redirects — we never reach here on success
    } catch (err) {
      handleAuthError(err, 'github');
    } finally {
      unlockAction('github');
    }
  }, [handleAuthError]);

  // ── Feature pills (visual panel) ─────────────────────
  const featurePills = [
    { icon: Terminal, text: 'Real terminal — live bash execution',     color: '#00F5A0' },
    { icon: Bot,      text: 'AI that writes code, not just suggestions', color: '#9B6EF5' },
    { icon: BarChart2, text: 'Built-in engineering analytics',           color: '#38BDF8' },
  ] as const;

  // ── Step config ───────────────────────────────────────
  const signupSteps: { key: SignupStep; label: string; icon: React.ElementType }[] = [
    { key: 'email',    label: 'Info',     icon: Mail },
    { key: 'otp',      label: 'Verify',   icon: ShieldCheck },
    { key: 'password', label: 'Password', icon: KeyRound },
  ];
  const currentStepIdx = signupSteps.findIndex((s) => s.key === signupStep);

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#060609', fontFamily: 'var(--font-body)' }}
    >
      {/* ══ LEFT: Form panel ════════════════════════════ */}
      <div
        className="flex flex-col justify-center px-10 py-12 w-full max-w-md flex-shrink-0 overflow-y-auto"
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Logo */}
        <button
          type="button"
          className="flex items-center gap-2.5 mb-10"
          onClick={() => navigate('/')}
          aria-label="Return to homepage"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.2)' }}
          >
            <Zap className="w-4 h-4" style={{ color: '#00F5A0' }} />
          </div>
          <span
            className="font-bold text-sm tracking-wider"
            style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}
          >
            YFITOPS
          </span>
        </button>

        {/* Tab pills */}
        <div
          className="flex rounded-lg p-1 mb-8 relative"
          style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.05)' }}
          role="tablist"
          aria-label="Authentication mode"
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
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => switchTab(t)}
              className="relative flex-1 py-2 text-sm font-medium rounded-md transition-colors duration-200 z-10 min-h-[44px]"
              style={{ color: tab === t ? '#EEEEFF' : '#5C5C7A' }}
            >
              {t === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Banners */}
        {success && (
          <Banner kind="success">Success! Redirecting to your workspace…</Banner>
        )}
        {banner && !success && (
          <Banner kind={banner.kind}>{banner.message}</Banner>
        )}

        {/* ── SIGN IN ─────────────────────────────────── */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4" noValidate>
            <div>
              <FieldLabel htmlFor="si-email">Work Email</FieldLabel>
              <input
                id="si-email"
                type="email"
                value={siEmail}
                onChange={(e) => { setSiEmail(e.target.value); clearBanner(); }}
                placeholder="you@company.com"
                className={inputBase}
                style={inputBaseStyle}
                {...inputBorder}
                required
                autoComplete="email"
                disabled={siLoading || success}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel htmlFor="si-password">Password</FieldLabel>
                <button
                  type="button"
                  className="text-xs hover:underline"
                  style={{ color: '#00F5A0' }}
                  tabIndex={-1}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="si-password"
                  type={showSiPassword ? 'text' : 'password'}
                  value={siPassword}
                  onChange={(e) => { setSiPassword(e.target.value); clearBanner(); }}
                  placeholder="••••••••"
                  className={inputBase}
                  style={{ ...inputBaseStyle, paddingRight: '40px' }}
                  {...inputBorder}
                  required
                  autoComplete="current-password"
                  disabled={siLoading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowSiPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  style={{ color: '#5C5C7A' }}
                  aria-label={showSiPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showSiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={siLoading || success}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {siLoading ? (
                <><Spinner /> Signing in…</>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <Divider />

            <button
              type="button"
              onClick={handleGitHub}
              disabled={siLoading || success}
              className="btn-ghost w-full justify-center py-3 disabled:opacity-50 min-h-[44px]"
            >
              <Github className="w-4 h-4" aria-hidden="true" />
              Continue with GitHub
            </button>
          </form>
        )}

        {/* ── SIGN UP ─────────────────────────────────── */}
        {tab === 'signup' && (
          <>
            {/* Step indicators */}
            <div className="flex items-center gap-1.5 mb-6" aria-label="Registration progress">
              {signupSteps.map((step, idx) => {
                const isActive = idx === currentStepIdx;
                const isDone = idx < currentStepIdx;
                return (
                  <div key={step.key} className="flex items-center gap-1.5 flex-1">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap"
                      style={{
                        background: isDone
                          ? 'rgba(0,245,160,0.12)'
                          : isActive
                          ? 'rgba(0,245,160,0.08)'
                          : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${
                          isDone
                            ? 'rgba(0,245,160,0.25)'
                            : isActive
                            ? 'rgba(0,245,160,0.2)'
                            : 'rgba(255,255,255,0.06)'
                        }`,
                        color: isDone || isActive ? '#00F5A0' : '#3A3A52',
                      }}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      <step.icon className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                      {step.label}
                      {isDone && <CheckCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
                    </div>
                    {idx < signupSteps.length - 1 && (
                      <div
                        className="h-px flex-1"
                        style={{ background: isDone ? 'rgba(0,245,160,0.3)' : 'rgba(255,255,255,0.06)' }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Step 1: Email + name ─────────────────── */}
            {signupStep === 'email' && (
              <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
                <div>
                  <FieldLabel htmlFor="su-name">Full Name</FieldLabel>
                  <input
                    id="su-name"
                    type="text"
                    value={suName}
                    onChange={(e) => { setSuName(e.target.value); clearBanner(); }}
                    placeholder="Alex Johnson"
                    className={inputBase}
                    style={inputBaseStyle}
                    {...inputBorder}
                    required
                    autoComplete="name"
                    disabled={suLoading}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="su-email">Work Email</FieldLabel>
                  <input
                    id="su-email"
                    type="email"
                    value={suEmail}
                    onChange={(e) => { setSuEmail(e.target.value); clearBanner(); }}
                    placeholder="you@company.com"
                    className={inputBase}
                    style={inputBaseStyle}
                    {...inputBorder}
                    required
                    autoComplete="email"
                    disabled={suLoading}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="su-role">Role</FieldLabel>
                  <select
                    id="su-role"
                    value={suRole}
                    onChange={(e) => setSuRole(e.target.value)}
                    className={inputBase}
                    style={{ ...inputBaseStyle, cursor: 'pointer' }}
                    {...inputBorder}
                    disabled={suLoading}
                  >
                    <option value="developer">Developer</option>
                    <option value="tech_lead">Tech Lead</option>
                    <option value="engineering_manager">Engineering Manager</option>
                  </select>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="su-agree"
                    checked={suAgree}
                    onChange={(e) => { setSuAgree(e.target.checked); clearBanner(); }}
                    className="mt-0.5 w-4 h-4 rounded flex-shrink-0"
                    style={{ accentColor: '#00F5A0' }}
                    disabled={suLoading}
                  />
                  <label htmlFor="su-agree" className="text-xs leading-relaxed" style={{ color: '#5C5C7A', cursor: 'pointer' }}>
                    I agree to the{' '}
                    <button type="button" className="underline" style={{ color: '#00F5A0' }}>Terms of Service</button>
                    {' '}and{' '}
                    <button type="button" className="underline" style={{ color: '#00F5A0' }}>Privacy Policy</button>
                  </label>
                </div>

                {/* Cooldown info if somehow visible here */}
                {!canSend && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#FBBF24' }}>
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    Resend available in {secondsLeft}s
                  </div>
                )}

                <button
                  type="submit"
                  disabled={suLoading || !canSend}
                  className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  aria-describedby={!canSend ? 'cooldown-note' : undefined}
                >
                  {suLoading ? (
                    <><Spinner /> Sending code…</>
                  ) : !canSend ? (
                    <><Clock className="w-4 h-4" /> Wait {secondsLeft}s</>
                  ) : (
                    <>Send Verification Code <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <Divider />

                <button
                  type="button"
                  onClick={handleGitHub}
                  disabled={suLoading}
                  className="btn-ghost w-full justify-center py-3 disabled:opacity-50 min-h-[44px]"
                >
                  <Github className="w-4 h-4" aria-hidden="true" />
                  Continue with GitHub
                </button>
              </form>
            )}

            {/* ── Step 2: OTP verify ───────────────────── */}
            {signupStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
                <div
                  className="px-4 py-3 rounded-lg text-sm"
                  style={{ background: 'rgba(0,245,160,0.06)', border: '1px solid rgba(0,245,160,0.15)', color: '#9494B8' }}
                >
                  Check your inbox at{' '}
                  <span style={{ color: '#00F5A0' }}>{suEmail}</span> for a 6-digit code.
                </div>

                <div>
                  <FieldLabel htmlFor="su-otp">Verification Code</FieldLabel>
                  <input
                    id="su-otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={suOtp}
                    onChange={(e) => { setSuOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); clearBanner(); }}
                    placeholder="123456"
                    className={inputBase}
                    style={{
                      ...inputBaseStyle,
                      textAlign: 'center',
                      fontSize: '22px',
                      letterSpacing: '0.35em',
                      fontFamily: 'var(--font-mono)',
                    }}
                    {...inputBorder}
                    autoComplete="one-time-code"
                    required
                    disabled={suLoading}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={suLoading || suOtp.length < 6}
                  className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {suLoading ? (
                    <><Spinner /> Verifying…</>
                  ) : (
                    <>Verify Code <ShieldCheck className="w-4 h-4" /></>
                  )}
                </button>

                {/* Resend control */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => { setSignupStep('email'); setBanner(null); setSuOtp(''); }}
                    className="text-sm"
                    style={{ color: '#5C5C7A' }}
                    disabled={suLoading}
                  >
                    ← Change email
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={suLoading || !canSend}
                    className="flex items-center gap-1.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: canSend ? '#00F5A0' : '#5C5C7A' }}
                    aria-label={canSend ? 'Resend verification code' : `Resend available in ${secondsLeft} seconds`}
                  >
                    {suLoading ? (
                      <Spinner />
                    ) : canSend ? (
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {canSend ? 'Resend code' : `Resend in ${secondsLeft}s`}
                  </button>
                </div>
              </form>
            )}

            {/* ── Step 3: Set password ─────────────────── */}
            {signupStep === 'password' && (
              <form onSubmit={handleSetPassword} className="space-y-4" noValidate>
                <div
                  className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm"
                  style={{ background: 'rgba(0,245,160,0.06)', border: '1px solid rgba(0,245,160,0.15)', color: '#9494B8' }}
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#00F5A0' }} aria-hidden="true" />
                  Email verified — set a secure password to finish.
                </div>

                <div>
                  <FieldLabel htmlFor="su-password">Password</FieldLabel>
                  <div className="relative">
                    <input
                      id="su-password"
                      type={showSuPassword ? 'text' : 'password'}
                      value={suPassword}
                      onChange={(e) => { setSuPassword(e.target.value); clearBanner(); }}
                      placeholder="Min. 8 characters"
                      className={inputBase}
                      style={{ ...inputBaseStyle, paddingRight: '40px' }}
                      {...inputBorder}
                      required
                      autoComplete="new-password"
                      minLength={8}
                      disabled={suLoading || success}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowSuPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      style={{ color: '#5C5C7A' }}
                      aria-label={showSuPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showSuPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password strength hint */}
                  {suPassword.length > 0 && (
                    <div className="flex gap-1 mt-1.5" aria-hidden="true">
                      {[1, 2, 3, 4].map((level) => {
                        const strength = suPassword.length >= 12
                          ? 4
                          : suPassword.length >= 10
                          ? 3
                          : suPassword.length >= 8
                          ? 2
                          : 1;
                        return (
                          <div
                            key={level}
                            className="h-0.5 flex-1 rounded-full transition-all duration-300"
                            style={{
                              background:
                                level <= strength
                                  ? strength >= 3
                                    ? '#00F5A0'
                                    : strength === 2
                                    ? '#FBBF24'
                                    : '#FF4D6D'
                                  : 'rgba(255,255,255,0.06)',
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <FieldLabel htmlFor="su-confirm">Confirm Password</FieldLabel>
                  <div className="relative">
                    <input
                      id="su-confirm"
                      type={showSuConfirm ? 'text' : 'password'}
                      value={suConfirm}
                      onChange={(e) => { setSuConfirm(e.target.value); clearBanner(); }}
                      placeholder="••••••••"
                      className={inputBase}
                      style={{
                        ...inputBaseStyle,
                        paddingRight: '40px',
                        borderColor:
                          suConfirm && suConfirm !== suPassword
                            ? 'rgba(255,77,109,0.4)'
                            : suConfirm && suConfirm === suPassword
                            ? 'rgba(0,245,160,0.3)'
                            : 'rgba(255,255,255,0.07)',
                      }}
                      {...inputBorder}
                      required
                      autoComplete="new-password"
                      disabled={suLoading || success}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSuConfirm((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      style={{ color: '#5C5C7A' }}
                      aria-label={showSuConfirm ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showSuConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={suLoading || success}
                  className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {suLoading ? (
                    <><Spinner /> Creating account…</>
                  ) : (
                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* ══ RIGHT: Visual panel ════════════════════════════ */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-center px-16 py-12 relative overflow-hidden"
        style={{ background: '#0C0C12' }}
        aria-hidden="true"
      >
        {/* Animated background gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full animate-drift-1"
            style={{
              background: 'radial-gradient(circle, rgba(0,245,160,0.05) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full animate-drift-2"
            style={{
              background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
          {/* Floating code blocks — decorative */}
          {[
            'async function deploy()',
            'const result = await ai.run()',
            'git push origin main',
            'npm run test:ci',
            'docker build -t app .',
            'kubectl apply -f deploy.yml',
          ].map((snippet, i) => (
            <div
              key={snippet}
              className="absolute text-xs rounded-lg p-3"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'rgba(0,245,160,0.04)',
                border: '1px solid rgba(0,245,160,0.03)',
                background: 'rgba(0,245,160,0.01)',
                top: `${10 + i * 15}%`,
                left: `${5 + (i % 3) * 30}%`,
                transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (i + 1)}deg)`,
                userSelect: 'none',
              }}
            >
              {snippet}
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
                  style={{ background: `${pill.color}12`, border: `1px solid ${pill.color}25` }}
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
