import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('switch disabled:cursor-not-allowed disabled:opacity-50', className)}
    >
      <span className="switch-thumb" aria-hidden="true" />
    </button>
  );
}
