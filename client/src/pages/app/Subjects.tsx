import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SubjectsResponse } from '@shared/types';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { cn, formatNumber, pluralCards } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { QueryError } from '@/components/app/QueryState';
import { SubjectCard } from '@/components/app/SubjectCard';

export default function Subjects() {
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: queryKeys.subjects,
    queryFn: () => api<SubjectsResponse>('/subjects'),
  });

  const subjects = query.data?.subjects ?? [];
  const filtered = useMemo(() => {
    const value = search.trim();
    if (!value) return subjects;
    return subjects.filter(
      (subject) =>
        subject.name.includes(value) ||
        subject.shortName.includes(value) ||
        subject.description.includes(value),
    );
  }, [search, subjects]);

  const overall = useMemo(() => {
    const coefficients = subjects.reduce((sum, subject) => sum + subject.coefficient, 0);
    if (coefficients === 0) return 0;
    return Math.round(
      subjects.reduce((sum, subject) => sum + subject.progress * subject.coefficient, 0) /
        coefficients,
    );
  }, [subjects]);

  const dueTotal = subjects.reduce((sum, subject) => sum + subject.totals.dueCards, 0);

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            منهاج شعبة العلوم التجريبية
          </span>
        }
        title="المواد الدراسية"
        description="تسع مواد أساسية مع وحداتها وتمارينها وبطاقات مراجعتها. كل نسبة هنا محسوبة من تقدّمك الحقيقي."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-primary">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              تقدّمك العام {formatNumber(overall)}٪
            </span>
            {dueTotal > 0 ? (
              <Link to="/app/revision" className="chip chip-warning hover:no-underline">
                {pluralCards(dueTotal)} للمراجعة
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
            style={{ insetInlineStart: '0.9rem' }}
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث عن مادة…"
            className="input ps-10"
            aria-label="البحث في المواد"
          />
        </div>
        <p className="text-[11.5px] text-muted">
          {filtered.length} من {subjects.length} مواد
        </p>
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="جارٍ تحميل المواد">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="card p-5">
              <div className="flex justify-between">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-5 w-40" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-1.5 h-3 w-3/4" />
              <Skeleton className="mt-6 h-2 w-full" />
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={() => void query.refetch()} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Search}
            title="لا توجد مادة مطابقة"
            description="جرّب كلمة بحث أخرى، أو اعرض جميع المواد."
            action={
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearch('')}>
                مسح البحث
              </button>
            }
          />
        </div>
      ) : (
        <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3')}>
          {filtered.map((subject, index) => (
            <SubjectCard key={subject.id} subject={subject} index={index} />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/50 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-muted">
          تريد مراجعة سريعة بدل مادة كاملة؟ بطاقات المراجعة تجمع كل المواد في جلسة واحدة.
        </p>
        <Link to="/app/revision" className="btn btn-subtle btn-sm">
          المراجعة الذكية
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
