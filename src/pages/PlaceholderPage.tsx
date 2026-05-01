import { LucideIcon } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: string;
}

export default function PlaceholderPage({
  title,
  description,
  icon: Icon,
  accent = '#00F5A0',
}: PlaceholderPageProps) {
  return (
    <div
      className="h-full flex items-center justify-center p-8"
      style={{ background: '#0C0C12', fontFamily: 'var(--font-body)' }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-10 text-center animate-fade-up"
        style={{
          background: 'rgba(17,17,24,0.8)',
          border: `1px solid ${accent}18`,
          boxShadow: `0 0 40px ${accent}06`,
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: `${accent}10`, border: `1px solid ${accent}20` }}
        >
          <Icon className="w-7 h-7" style={{ color: accent }} />
        </div>
        <h1
          className="text-xl font-bold mb-3"
          style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}
        >
          {title}
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: '#5C5C7A' }}>
          {description}
        </p>
        <div
          className="mt-6 px-4 py-2.5 rounded-lg inline-flex items-center gap-2 text-xs font-medium"
          style={{ background: `${accent}08`, border: `1px solid ${accent}15`, color: accent }}
        >
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
          Coming in the next build phase
        </div>
      </div>
    </div>
  );
}
