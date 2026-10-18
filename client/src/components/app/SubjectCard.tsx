import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SubjectProgress } from '@shared/types';
import { formatNumber, pluralCards } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/Progress';
import { Chip } from '@/components/ui/Badge';
import { SubjectIcon } from './SubjectIcon';

export function SubjectCard({ subject, index = 0 }: { subject: SubjectProgress; index?: number }) {
  return (
    <Link
      to={`/app/subjects/${subject.slug}`}
      className="card card-hover group flex flex-col p-5 animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <SubjectIcon icon={subject.icon} color={subject.color} size="lg" />
        <div className="flex flex-col items-end gap-1.5">
          <Chip>معامل {formatNumber(subject.coefficient)}</Chip>
          {subject.totals.dueCards > 0 ? (
            <Chip variant="primary">{pluralCards(subject.totals.dueCards)} مستحقة</Chip>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-2">
        <h2 className="font-display text-[16px] font-semibold text-ink transition group-hover:text-primary-strong">
          {subject.name}
        </h2>
        <ArrowUpRight
          className="mt-1 h-3.5 w-3.5 shrink-0 text-subtle transition group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
      <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">{subject.description}</p>

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted">التقدّم</span>
          <span className="font-semibold tabular-nums text-ink">{formatNumber(subject.progress)}٪</span>
        </div>
        <ProgressBar value={subject.progress} size="sm" color={subject.color} className="mt-1.5" />

        <dl className="mt-4 grid grid-cols-3 gap-1.5 border-t border-line pt-3 text-center">
          <div>
            <dt className="text-[9px] text-subtle">الامتحانات</dt>
            <dd className="mt-0.5 text-[11px] font-semibold tabular-nums text-ink">
              {subject.totals.completedPapers}
              <span className="text-subtle">/{subject.totals.papers}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[9px] text-subtle">التمارين</dt>
            <dd className="mt-0.5 text-[11px] font-semibold tabular-nums text-ink">
              {subject.totals.doneExercises}
              <span className="text-subtle">/{subject.totals.exercises}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[9px] text-subtle">البطاقات</dt>
            <dd className="mt-0.5 text-[11px] font-semibold tabular-nums text-ink">
              {subject.totals.masteredCards}
              <span className="text-subtle">/{subject.totals.cards}</span>
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
