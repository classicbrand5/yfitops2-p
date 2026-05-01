import PlaceholderPage from './PlaceholderPage';
import { Hammer } from 'lucide-react';

export default function BuildMonitor() {
  return (
    <PlaceholderPage
      title="Build Monitor"
      description="Real-time build status with Supabase Realtime subscriptions, ANSI-preserved log streaming via xterm.js, and per-repo filtering. Coming in Phase 10."
      icon={Hammer}
      accent="#38BDF8"
    />
  );
}
