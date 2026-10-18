import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '@shared/types';
import { useTheme } from '@/lib/theme';
import { useThemePreference } from '@/lib/useThemePreference';
import { cn } from '@/lib/utils';

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'فاتح', icon: Sun },
  { value: 'dark', label: 'داكن', icon: Moon },
  { value: 'system', label: 'النظام', icon: Monitor },
];

export function ThemeSegmented({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { theme } = useTheme();
  const { changeTheme } = useThemePreference();

  return (
    <div
      role="group"
      aria-label="مظهر الواجهة"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => void changeTheme(option.value)}
            aria-pressed={active}
            title={option.label}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[0.45rem] px-2 py-1.5 text-[11px] font-medium transition-colors',
              active ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {!compact ? <span>{option.label}</span> : <span className="sr-only">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
