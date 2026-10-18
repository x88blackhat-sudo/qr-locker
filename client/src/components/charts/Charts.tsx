import { useId, type ReactNode } from 'react';
import type { WeeklyPoint } from '@shared/types';
import { cn, formatNumber } from '@/lib/utils';

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midX = (previous.x + current.x) / 2;
    path += ` C ${midX} ${previous.y}, ${midX} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}

export function ActivityAreaChart({
  data,
  metric = 'minutes',
  className,
}: {
  data: WeeklyPoint[];
  metric?: 'minutes' | 'cards';
  className?: string;
}) {
  const gradientId = useId();
  const width = 620;
  const height = 190;
  const paddingX = 14;
  const paddingTop = 18;
  const paddingBottom = 16;
  const values = data.map((point) => (metric === 'minutes' ? point.minutes : point.cards));
  const max = Math.max(...values, metric === 'minutes' ? 30 : 5);
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingTop - paddingBottom;
  const points = data.map((point, index) => {
    const value = metric === 'minutes' ? point.minutes : point.cards;
    const x =
      data.length <= 1
        ? width / 2
        : width - paddingX - (index / (data.length - 1)) * innerWidth;
    const y = paddingTop + (1 - value / max) * innerHeight;
    return { x, y, value, point };
  });
  const line = buildSmoothPath(points);
  const area = points.length
    ? `${line} L ${points[points.length - 1]?.x} ${height - paddingBottom} L ${points[0]?.x} ${height - paddingBottom} Z`
    : '';
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <div className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`مخطط النشاط خلال ${data.length} أيام — الإجمالي ${formatNumber(total)} ${metric === 'minutes' ? 'دقيقة' : 'بطاقة'}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-primary))" stopOpacity="0.22" />
            <stop offset="100%" stopColor="rgb(var(--c-primary))" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0, 0.33, 0.66, 1].map((ratio) => {
          const y = paddingTop + innerHeight * ratio;
          return (
            <line
              key={ratio}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke="rgb(var(--c-line))"
              strokeDasharray="3 6"
            />
          );
        })}
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="rgb(var(--c-primary))"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <circle
            key={point.point.date}
            cx={point.x}
            cy={point.y}
            r={index === points.length - 1 ? 4.4 : 3}
            fill={index === points.length - 1 ? 'rgb(var(--c-primary))' : 'rgb(var(--c-surface))'}
            stroke="rgb(var(--c-primary))"
            strokeWidth="2"
          >
            <title>{`${point.point.label}: ${formatNumber(point.value)} ${
              metric === 'minutes' ? 'دقيقة' : 'بطاقة'
            }`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-between gap-1 text-[10.5px] font-medium text-subtle">
        {data.map((point) => (
          <span
            key={point.date}
            className={cn(
              'flex-1 text-center',
              point.isToday && 'rounded-md bg-primary-soft py-0.5 font-semibold text-primary-strong',
            )}
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MiniBarChart({
  data,
  metric = 'cards',
  className,
  barClassName,
}: {
  data: WeeklyPoint[];
  metric?: 'minutes' | 'cards';
  className?: string;
  barClassName?: string;
}) {
  const values = data.map((point) => (metric === 'minutes' ? point.minutes : point.cards));
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  return (
    <div className={cn('w-full', className)}>
      <div
        className="flex h-24 items-end justify-between gap-1.5"
        role="img"
        aria-label={`مخطط أعمدة، الإجمالي ${formatNumber(total)}`}
      >
        {data.map((point, index) => {
          const value = values[index] ?? 0;
          const height = Math.max(value > 0 ? 8 : 3, Math.round((value / max) * 100));
          return (
            <div
              key={point.date}
              className="flex h-full flex-1 flex-col items-center justify-end"
              title={`${point.label}: ${formatNumber(value)}`}
            >
              <div
                className={cn(
                  'w-full max-w-[26px] rounded-t-md transition-all duration-500',
                  point.isToday ? 'bg-primary' : 'bg-primary/35',
                  barClassName,
                )}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-1 text-[10.5px] font-medium text-subtle">
        {data.map((point) => (
          <span key={point.date} className={cn('flex-1 text-center', point.isToday && 'text-primary-strong')}>
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({
  segments,
  size = 148,
  thickness = 13,
  center,
  label,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  thickness?: number;
  center?: ReactNode;
  label: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let offset = 0;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--c-line))"
          strokeWidth={thickness}
        />
        {total > 0 &&
          segments.map((segment) => {
            const length = (segment.value / total) * circumference;
            const dashOffset = -offset;
            offset += length;
            return (
              <circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>
    </div>
  );
}

export function ForecastBars({
  data,
}: {
  data: { date: string; label: string; count: number; isToday: boolean }[];
}) {
  const max = Math.max(...data.map((point) => point.count), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((point) => (
        <li key={point.date} className="flex items-center gap-3">
          <span
            className={cn(
              'w-12 shrink-0 text-[11px] font-medium',
              point.isToday ? 'text-primary-strong' : 'text-muted',
            )}
          >
            {point.isToday ? 'اليوم' : point.label}
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
            <span
              className={cn(
                'block h-full rounded-full',
                point.isToday ? 'bg-primary' : 'bg-primary/40',
              )}
              style={{ width: `${Math.max(point.count > 0 ? 5 : 0, (point.count / max) * 100)}%` }}
            />
          </span>
          <span className="w-4 shrink-0 text-end text-[11px] font-medium tabular-nums text-ink">
            {formatNumber(point.count)}
          </span>
        </li>
      ))}
    </ul>
  );
}
