import { Link } from 'react-router-dom';
import { LockKeyhole, RotateCw, TriangleAlert } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useStudyAccess } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message =
    error instanceof ApiError ? error.message : 'تعذّر تحميل البيانات. تحقّق من اتصالك ثم حاول مجددًا.';
  return (
    <div className="card p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
          <TriangleAlert className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink">تعذّر تحميل هذه الصفحة</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{message}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry} icon={<RotateCw className="h-3.5 w-3.5" />}>
            إعادة المحاولة
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Honest read-only state after the trial ends — data is never deleted. */
export function StudyAccessNotice() {
  const { subscription, canStudy } = useStudyAccess();
  if (!subscription || canStudy) return null;

  if (subscription.access === 'expired') {
    return (
      <div className="alert alert-warning" role="status">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">انتهت فترة التجربة — بياناتك محفوظة بالكامل.</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed">
            يمكنك الاطلاع على كل ما أنجزته، لكن تسجيل تقدّم جديد متوقف مؤقتًا. الاشتراكات غير مُفعّلة
            بعد، ولن يُطلب منك أي دفع.{' '}
            <Link to="/app/plans" className="font-semibold underline underline-offset-2">
              راجع خيارات الاشتراك
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export function StudyLockedState() {
  const { subscription } = useStudyAccess();
  if (subscription?.access !== 'expired') return null;
  return (
    <EmptyState
      icon={LockKeyhole}
      title="تسجيل التقدّم متوقف مؤقتًا"
      description="انتهت التجربة المجانية. بياناتك ونتائجك السابقة محفوظة، ويمكنك مراجعتها في أي وقت. لا توجد وسيلة دفع مُفعّلة حاليًا."
      action={
        <Link to="/app/plans" className="btn btn-secondary btn-sm">
          عرض حالة الاشتراك
        </Link>
      }
    />
  );
}
