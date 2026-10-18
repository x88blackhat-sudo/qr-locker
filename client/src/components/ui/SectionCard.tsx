import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

export function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className,
  headerClassName,
  bodyClassName,
}: SectionCardProps) {
  return (
    <section className={cn('card', className)}>
      {title ? (
        <header
          className={cn(
            'flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4',
            headerClassName,
          )}
        >
          <div className="flex items-start gap-3">
            {icon ? (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                {icon}
              </span>
            ) : null}
            <div>
              <h2 className="font-display text-[15px] font-semibold leading-6 text-ink">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}
