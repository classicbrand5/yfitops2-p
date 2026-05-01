import PlaceholderPage from './PlaceholderPage';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Profile, GitHub integration, AI agent configuration, editor preferences, terminal settings, notifications, security (2FA), and data export. Coming in Phase 16."
      icon={SettingsIcon}
      accent="#FBBF24"
    />
  );
}
