import PlaceholderPage from './PlaceholderPage';
import { CreditCard } from 'lucide-react';

export default function Billing() {
  return (
    <PlaceholderPage
      title="Billing"
      description="Current plan usage, Stripe Customer Portal, invoice history with PDF downloads, and animated usage bars that turn red at 85% capacity. Coming in Phase 16."
      icon={CreditCard}
      accent="#00F5A0"
    />
  );
}
