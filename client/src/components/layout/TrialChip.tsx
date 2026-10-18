import { Link } from 'react-router-dom';
import { Clock3, Sparkles } from 'lucide-react';
import type { SubscriptionInfo } from '@shared/types';
import { pluralDays } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function TrialChip({ subscription, className }: { subscription: SubscriptionInfo; className?: string }) {
  const base = cn('chip hover:no-underline', className);

  if (subscription.status === 'not_started') {
    return (
      <Link to="/app/trial" className={cn(base, 'chip-gold')}>
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        ابدأ التجربة المجانية
      </Link>
    );
  }
  if (subscription.access === 'paid') {
    return (
      <Link to="/app/plans" className={cn(base, 'chip-success')}>
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        اشتراك نشط
      </Link>
    );
  }
  if (subscription.status === 'trialing') {
    return (
      <Link
        to="/app/plans"
        className={cn(base, subscription.endingSoon ? 'chip-warning' : 'chip-primary')}
      >
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        تجربة مجانية · {pluralDays(subscription.daysRemaining ?? 0)} متبقية
      </Link>
    );
  }
  return (
    <Link to="/app/plans" className={cn(base, 'chip-warning')}>
      انتهت التجربة
    </Link>
  );
}
