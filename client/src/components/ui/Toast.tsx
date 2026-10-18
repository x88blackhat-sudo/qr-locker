import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastVariant, ReactNode> = {
  success: <CircleCheck className="h-[18px] w-[18px]" aria-hidden="true" />,
  error: <CircleAlert className="h-[18px] w-[18px]" aria-hidden="true" />,
  warning: <TriangleAlert className="h-[18px] w-[18px]" aria-hidden="true" />,
  info: <Info className="h-[18px] w-[18px]" aria-hidden="true" />,
};

const variantClasses: Record<ToastVariant, string> = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-primary',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `toast-${Date.now()}`;
      const item: ToastItem = { ...options, id };
      setToasts((current) => [...current.slice(-2), item]);
      const duration = options.duration ?? 4200;
      const timer = window.setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 pt-[env(safe-area-inset-top)]"
        role="region"
        aria-label="الإشعارات"
      >
        <div aria-live="polite" aria-atomic="false" className="flex w-full flex-col items-center gap-2">
          {toasts.map((item) => (
            <div key={item.id} className="toast w-full max-w-sm" role="status">
              <span className={cn('mt-0.5 shrink-0', variantClasses[item.variant ?? 'info'])}>
                {icons[item.variant ?? 'info']}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium leading-6 text-ink">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-md p-1 text-subtle transition hover:bg-surface-2 hover:text-ink"
                aria-label="إغلاق الإشعار"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
