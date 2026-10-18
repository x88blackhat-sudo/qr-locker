import type { ReactNode } from 'react';
import { cn, clampPercent, formatNumber } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  color?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function ProgressBar({ value, color, className, size = 'md', label }: ProgressBarProps) {
  const safe = clampPercent(value);
  return (
    <div
      className={cn('progress', size === 'sm' && 'progress-sm', size === 'lg' && 'progress-lg', className)}
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="progress-bar"
        style={{ width: `${safe}%`, background: color ?? undefined }}
      />
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
  label?: string;
  className?: string;
}

export function ProgressRing({
  value,
  size = 132,
  strokeWidth = 10,
  color,
  trackColor,
  children,
  label,
  className,
}: ProgressRingProps) {
  const safe = clampPercent(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `نسبة التقدّم ${formatNumber(safe)}٪`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor ?? 'rgb(var(--c-line))'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color ?? 'rgb(var(--c-primary))'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? (
          <>
            <span className="font-display text-2xl font-semibold leading-none text-ink">
              {formatNumber(safe)}
              <span className="text-sm font-medium text-muted">٪</span>
            </span>
            <span className="mt-1.5 text-[10.5px] font-medium text-muted">التقدّم العام</span>
          </>
        )}
      </div>
    </div>
  );
}
