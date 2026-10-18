import { cn, initials } from '@/lib/utils';

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-[11px]' : size === 'lg' ? 'h-14 w-14 text-base' : 'h-10 w-10 text-xs';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary-soft font-display font-semibold text-primary-strong',
        sizeClass,
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
