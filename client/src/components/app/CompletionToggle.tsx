import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompletionToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function CompletionToggle({
  checked,
  onChange,
  label,
  disabled,
  loading,
  className,
}: CompletionToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition',
        checked
          ? 'border-primary bg-primary text-white'
          : 'border-line-strong bg-surface text-transparent hover:border-primary/50 hover:bg-primary-soft',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {loading ? (
        <span className="btn-spinner h-3.5 w-3.5 text-current" aria-hidden="true" />
      ) : (
        <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
      )}
    </button>
  );
}
