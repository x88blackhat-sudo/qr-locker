import { cn } from '@/lib/utils';

interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('tabs', className)} role="tablist" aria-label={label}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn('tab', active && 'is-active')}
          >
            {item.label}
            {typeof item.count === 'number' ? (
              <span className="ms-1.5 rounded-full bg-line px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
