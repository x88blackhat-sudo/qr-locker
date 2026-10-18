import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[0.7rem] bg-navy ring-1 ring-white/10',
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
        <path
          d="M18 41V23.5h9.2c4.4 0 7 2.2 7 5.6 0 2.3-1.2 4-3.1 4.8 2.5.7 3.9 2.6 3.9 5 0 3.6-2.7 5.9-7.5 5.9H18Z"
          stroke="#5ED7C8"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path
          d="M28 32.5h-4.5M28.6 41h-5.1M36.5 24v17.5"
          stroke="#5ED7C8"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="48" cy="23" r="3" fill="#C8A96A" />
      </svg>
    </span>
  );
}

export function Brand({
  to = '/',
  compact = false,
  className,
}: {
  to?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn('flex items-center gap-2.5 rounded-lg', className)}
      aria-label="BacTrack DZ — الصفحة الرئيسية"
    >
      <BrandMark />
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="flex items-baseline gap-1 font-display text-[17px] font-semibold tracking-tight text-ink">
            BacTrack
            <span className="text-[11px] font-semibold tracking-wide text-gold">DZ</span>
          </span>
          <span className="mt-1 text-[10px] font-medium text-muted">البكالوريا بخطة واضحة</span>
        </span>
      ) : null}
    </Link>
  );
}
