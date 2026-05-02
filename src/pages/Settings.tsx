// ─────────────────────────────────────────────────────────
// Settings — Phase 9: Profile + Avatar Upload
//
// Allows user to update:
//   - Full name
//   - GitHub username
//   - Avatar image (upload to Supabase Storage)
// ─────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, withAuthRefresh } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import {
  User, Github, Upload, Save, Loader2, Camera,
  Shield, Bell, Palette, Code2, ChevronRight,
} from 'lucide-react';

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
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
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

      // Upload to Storage bucket 'avatars'
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw new Error(uploadErr.message);

      // Get public URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`; // cache-bust

      // Save to profile
      const { error: updateErr } = await withAuthRefresh(() =>
        supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      );
      if (updateErr) throw new Error(updateErr.message);

      setAvatarUrl(publicUrl);
      toast.success('Avatar updated');
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
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
        <p className="text-sm" style={{ color: '#5C5C7A' }}>Manage your profile and preferences.</p>
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

        <Field label="Full Name"        value={fullName}       onChange={setFullName}       placeholder="Your full name" />
        <Field label="Email"            value={profile?.email ?? user?.email ?? ''} onChange={() => {}} disabled placeholder="your@email.com" />
        <Field label="GitHub Username"  value={githubUsername} onChange={setGithubUsername} placeholder="your-github-handle" />

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
