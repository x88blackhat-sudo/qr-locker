import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'gold' | 'navy';

export function Chip({
  children,
  variant = 'default',
  className,
}: {
  children: ReactNode;
  variant?: ChipVariant;
  className?: string;
}) {
  return (
    <span className={cn('chip', variant !== 'default' && `chip-${variant}`, className)}>
      {children}
    </span>
  );
}

export function Dot({ color }: { color?: string }) {
  return (
    <span
      className="dot"
      style={{ background: color ?? 'rgb(var(--c-primary))' }}
      aria-hidden="true"
    />
  );
}
