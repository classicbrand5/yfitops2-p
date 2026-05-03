// ─────────────────────────────────────────────────────────
// Settings — Profile + Avatar Upload + AI Provider Secrets
//
// Phase 0 fix: Added AI Secrets Setup section showing which
// provider API keys are required and where to add them.
// ─────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, withAuthRefresh } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import {
  User, Github, Upload, Save, Loader2, Camera,
  Shield, Bell, Palette, Code2, ChevronRight,
  Key, ExternalLink, CheckCircle2, AlertTriangle,
  Zap, Bot,
} from 'lucide-react';
import { PROVIDERS, ALL_MODELS } from '@/types/models';

// ── Avatar display ────────────────────────────────────────
function Avatar({ url, name, size = 80 }: { url?: string | null; name?: string; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? 'Avatar'}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size, border: '2px solid rgba(0,245,160,0.2)' }}
      />
    );
  }
  const initials = (name ?? 'Dev').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        background: 'rgba(124,58,237,0.2)',
        border: '2px solid rgba(124,58,237,0.35)',
        color: '#9B6EF5',
        fontFamily: 'var(--font-display)',
        fontSize: size * 0.32,
      }}
    >
      {initials}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-6 mb-5" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
        <Icon className="w-4 h-4" style={{ color: '#9B6EF5' }} />
        <h2 className="text-sm font-semibold" style={{ color: '#EEEEFF' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Input field ───────────────────────────────────────────
function Field({ label, value, onChange, placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs mb-1.5" style={{ color: '#5C5C7A' }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
        style={{
          background: '#0D0D14',
          border: '1px solid rgba(255,255,255,0.08)',
          color: disabled ? '#3A3A52' : '#EEEEFF',
          cursor: disabled ? 'not-allowed' : 'text',
          fontFamily: 'var(--font-body)',
        }}
        onFocus={(e) => { if (!disabled) e.currentTarget.style.borderColor = 'rgba(0,245,160,0.3)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      />
    </div>
  );
}

// ── AI Provider Secrets Section ───────────────────────────
// Phase 0 fix: shows each provider, required secret name,
// model list, and link to provider dashboard to get the key.

interface ProviderSecretInfo {
  providerId: string;
  label: string;
  color: string;
  secretName: string;
  dashboardUrl: string;
  description: string;
  models: string[];
  isDefault: boolean;
}

// Build provider→secrets map from PROVIDERS + ALL_MODELS
function buildProviderSecretInfo(): ProviderSecretInfo[] {
  return Object.entries(PROVIDERS).map(([id, p]) => {
    const models = ALL_MODELS
      .filter((m) => m.provider === id)
      .map((m) => m.label);
    return {
      providerId:   id,
      label:        p.label,
      color:        p.color,
      secretName:   p.secretName,
      dashboardUrl: p.dashboardUrl,
      description:  p.description,
      models,
      isDefault:    id === 'onspace',
    };
  });
}

function AISecretsSection() {
  const providers = buildProviderSecretInfo();

  return (
    <Section title="AI Provider Secrets" icon={Key}>
      {/* Explainer */}
      <div
        className="flex items-start gap-3 p-3 rounded-lg mb-5"
        style={{ background: 'rgba(0,245,160,0.04)', border: '1px solid rgba(0,245,160,0.1)' }}
      >
        <Bot className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#00F5A0' }} />
        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: '#00F5A0' }}>
            How to add API keys
          </p>
          <p className="text-xs leading-relaxed" style={{ color: '#5C5C7A' }}>
            All API keys are stored securely as Supabase Edge Function secrets — never exposed to the browser.
            Navigate to:{' '}
            <span className="font-medium" style={{ color: '#9494B8', fontFamily: 'var(--font-mono)' }}>
              Supabase → Project Settings → Edge Functions → Secrets
            </span>
          </p>
          <p className="text-xs mt-1" style={{ color: '#3A3A52' }}>
            The OnSpace AI key is pre-configured and always works.
            All other providers require their own API key.
          </p>
        </div>
      </div>

      {/* Provider list */}
      <div className="space-y-3">
        {providers.map((p) => (
          <div
            key={p.providerId}
            className="rounded-lg p-3"
            style={{
              background: p.isDefault ? 'rgba(0,245,160,0.03)' : 'rgba(255,255,255,0.02)',
              border:     p.isDefault ? '1px solid rgba(0,245,160,0.12)' : '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                {/* Provider color dot + status */}
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: p.color }}
                  />
                  {p.isDefault ? (
                    <CheckCircle2 className="w-3 h-3" style={{ color: '#00F5A0' }} />
                  ) : (
                    <AlertTriangle className="w-3 h-3" style={{ color: '#FBBF24' }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold" style={{ color: '#EEEEFF' }}>
                      {p.label}
                    </span>
                    {p.isDefault && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                        style={{ background: 'rgba(0,245,160,0.1)', color: '#00F5A0' }}
                      >
                        Pre-configured
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: '#5C5C7A' }}>
                    {p.description}
                  </p>

                  {/* Secret key name */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px]" style={{ color: '#3A3A52' }}>Secret name:</span>
                    <code
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border:     '1px solid rgba(255,255,255,0.07)',
                        color:      p.isDefault ? '#00F5A0' : '#FBBF24',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {p.secretName}
                    </code>
                  </div>

                  {/* Model list */}
                  {p.models.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px]" style={{ color: '#3A3A52' }}>Models:</span>
                      {p.models.map((m) => (
                        <span
                          key={m}
                          className="text-[10px] px-1 rounded"
                          style={{ background: `${p.color}10`, color: p.color, fontFamily: 'var(--font-mono)' }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dashboard link — not shown for OnSpace AI (internal) */}
              {!p.isDefault && (
                <a
                  href={p.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium flex-shrink-0 transition-colors duration-150"
                  style={{
                    background: `${p.color}10`,
                    border:     `1px solid ${p.color}25`,
                    color:      p.color,
                    textDecoration: 'none',
                  }}
                  title={`Get ${p.label} API key`}
                >
                  Get key
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Cloudflare additional note */}
      <div
        className="mt-4 p-3 rounded-lg"
        style={{ background: 'rgba(244,129,32,0.04)', border: '1px solid rgba(244,129,32,0.1)' }}
      >
        <p className="text-xs font-medium mb-1" style={{ color: '#F48120' }}>
          Cloudflare AI — additional secret required
        </p>
        <p className="text-xs" style={{ color: '#5C5C7A' }}>
          Cloudflare AI also requires{' '}
          <code
            className="px-1 rounded text-[10px]"
            style={{ background: 'rgba(244,129,32,0.1)', color: '#F48120', fontFamily: 'var(--font-mono)' }}
          >
            CLOUDFLARE_ACCOUNT_ID
          </code>
          {' '}in addition to{' '}
          <code
            className="px-1 rounded text-[10px]"
            style={{ background: 'rgba(244,129,32,0.1)', color: '#F48120', fontFamily: 'var(--font-mono)' }}
          >
            CLOUDFLARE_AI_API_KEY
          </code>.
          Find your Account ID at{' '}
          <a
            href="https://dash.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: '#F48120' }}
          >
            dash.cloudflare.com
          </a>
          {' '}→ right sidebar.
        </p>
      </div>
    </Section>
  );
}

// ═════════════════════════════════════════════════════════
// Settings
// ═════════════════════════════════════════════════════════
export default function Settings() {
  const { user } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName,       setFullName]       = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [avatarUrl,      setAvatarUrl]      = useState<string | null>(null);
  const [isSaving,       setIsSaving]       = useState(false);
  const [isUploading,    setIsUploading]    = useState(false);

  // ── Fetch current profile ─────────────────────────────
  const { data: profile } = useQuery({
    queryKey: ['profile-settings', user?.id],
    queryFn: () =>
      withAuthRefresh(async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, github_username, avatar_url, email, plan, ai_requests_used, ai_requests_limit')
          .eq('id', user!.id)
          .single();
        if (error) throw new Error(error.message);
        return data as {
          full_name: string;
          github_username: string | null;
          avatar_url: string | null;
          email: string | null;
          plan: string;
          ai_requests_used: number;
          ai_requests_limit: number;
        };
      }),
    enabled: !!user,
    staleTime: 30_000,
  });

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setGithubUsername(profile.github_username ?? '');
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  // ── Save profile ──────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await withAuthRefresh(() =>
        supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
            github_username: githubUsername.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      );
      if (error) throw new Error(error.message);
      toast.success('Profile saved');
    } catch (err: unknown) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  }, [user, fullName, githubUsername]);

  // ── Avatar upload ─────────────────────────────────────
  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar must be under 5 MB');
      return;
    }

    setIsUploading(true);
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await withAuthRefresh(() =>
        supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      );
      if (updateErr) throw new Error(updateErr.message);

      setAvatarUrl(publicUrl);
      toast.success('Avatar updated');
    } catch (err: unknown) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [user]);

  // ── Placeholder sections ──────────────────────────────
  const DEFERRED_SECTIONS = [
    { icon: Shield,  label: 'Security',          desc: 'Password reset, 2FA, active sessions' },
    { icon: Bell,    label: 'Notifications',      desc: 'Email alerts, build notifications, AI summaries' },
    { icon: Palette, label: 'Appearance',         desc: 'Theme, editor font size, density' },
    { icon: Code2,   label: 'Editor Preferences', desc: 'Tab width, word wrap, minimap, auto-save' },
  ];

  return (
    <div
      className="h-full overflow-y-auto px-6 py-6 max-w-2xl mx-auto"
      style={{ fontFamily: 'var(--font-body)', color: '#EEEEFF' }}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}>
          Settings
        </h1>
        <p className="text-sm" style={{ color: '#5C5C7A' }}>Manage your profile, preferences, and AI provider keys.</p>
      </div>

      {/* Profile Section */}
      <Section title="Profile" icon={User}>
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <Avatar url={avatarUrl} name={fullName || user?.fullName} size={72} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ background: '#7C3AED', border: '2px solid #0D0D14' }}
              title="Upload avatar"
            >
              {isUploading
                ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#FFF' }} />
                : <Camera className="w-3 h-3" style={{ color: '#FFF' }} />
              }
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: '#EEEEFF' }}>
              {profile?.full_name || user?.fullName || 'Your Name'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#5C5C7A' }}>{profile?.email ?? user?.email}</p>
            <p className="text-xs mt-0.5 capitalize" style={{ color: '#9B6EF5' }}>{profile?.plan ?? 'starter'} plan</p>
          </div>
        </div>

        <Field label="Full Name"       value={fullName}       onChange={setFullName}       placeholder="Your full name" />
        <Field label="Email"           value={profile?.email ?? user?.email ?? ''} onChange={() => {}} disabled placeholder="your@email.com" />
        <Field label="GitHub Username" value={githubUsername} onChange={setGithubUsername} placeholder="your-github-handle" />

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          style={{
            background: isSaving ? 'rgba(0,245,160,0.04)' : 'rgba(0,245,160,0.1)',
            border: '1px solid rgba(0,245,160,0.2)',
            color: isSaving ? '#3A3A52' : '#00F5A0',
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </Section>

      {/* Phase 0 fix: AI Provider Secrets section */}
      <AISecretsSection />

      {/* Deferred sections — visible but locked */}
      {DEFERRED_SECTIONS.map((s) => (
        <div
          key={s.label}
          className="rounded-xl p-5 mb-4 flex items-center justify-between cursor-default opacity-60"
          style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="flex items-center gap-3">
            <s.icon className="w-4 h-4" style={{ color: '#5C5C7A' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: '#9494B8' }}>{s.label}</p>
              <p className="text-xs" style={{ color: '#3A3A52' }}>{s.desc}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: '#3A3A52' }} />
        </div>
      ))}
    </div>
  );
}
