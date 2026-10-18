import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Filter,
  GraduationCap,
  RotateCcw,
  SearchX,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { ExamPaper, ExamsResponse } from '@shared/types';
import { api, ApiError } from '@/lib/api';
import { useStudyAccess } from '@/lib/auth';
import { queryKeys } from '@/lib/query';
import { formatNumber } from '@/lib/utils';
import { sessionLabels } from '@/lib/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { SelectInput } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Chip } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { ExamRow } from '@/components/app/ExamRow';
import { QueryError, StudyAccessNotice } from '@/components/app/QueryState';

export default function Exams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canStudy } = useStudyAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const subject = searchParams.get('subject') ?? '';
  const [year, setYear] = useState('');
  const [session, setSession] = useState('');
  const [status, setStatus] = useState<'all' | 'completed' | 'pending'>('all');

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (subject) search.set('subject', subject);
    if (year) search.set('year', year);
    if (session) search.set('session', session);
    if (status !== 'all') search.set('status', status);
    return search;
  }, [subject, year, session, status]);

  const query = useQuery({
    queryKey: queryKeys.exams({ subject, year, session, status }),
    queryFn: () => api<ExamsResponse>(`/exams?${params.toString()}`),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['exams'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: queryKeys.analytics });
    void queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
    void queryClient.invalidateQueries({ queryKey: ['subject'] });
  };

  const toggleMutation = useMutation({
    mutationFn: (paper: ExamPaper) =>
      api(`/exams/${paper.id}/completion`, {
        method: 'POST',
        body: { completed: !paper.completed },
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'تم تحديث حالة الموضوع', variant: 'success' });
    },
    onError: (error) =>
      toast({
        title: 'تعذّر تحديث الامتحان',
        description: error instanceof ApiError ? error.message : 'يرجى المحاولة مجددًا.',
        variant: 'error',
      }),
  });

  const updateSubject = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('subject', value);
    else next.delete('subject');
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    setYear('');
    setSession('');
    setStatus('all');
    const next = new URLSearchParams(searchParams);
    next.delete('subject');
    setSearchParams(next, { replace: true });
  };

  const hasFilters = Boolean(subject || year || session || status !== 'all');
  const data = query.data;
  const papers = data?.papers ?? [];
  const summary = data?.summary ?? { total: 0, completed: 0 };
  const pendingCount = summary.total - summary.completed;

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
            متابعة مواضيع البكالوريا
          </span>
        }
        title="متابعة الامتحانات"
        description="مواضيع تدريبية على نمط الدورات، مرتبطة بمحاور المراجعة. علّم كل موضوع أنجزته ليُحسب في تقدّمك تلقائيًا."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Chip variant="success">{formatNumber(summary.completed)} منجز</Chip>
            <Chip>{formatNumber(pendingCount)} متبقٍ</Chip>
          </div>
        }
      />

      <div className="space-y-4">
        <StudyAccessNotice />

        <SectionCard
          title="تصفية المواضيع"
          subtitle="اعثر بسرعة على ما تريد مراجعته اليوم"
          icon={<Filter className="h-4 w-4" aria-hidden="true" />}
          action={
            hasFilters ? (
              <Button variant="ghost" size="sm" onClick={resetFilters} icon={<RotateCcw className="h-3.5 w-3.5" />}>
                إعادة الضبط
              </Button>
            ) : undefined
          }
          bodyClassName="p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="filter-subject" className="label !mb-1">المادة</label>
              <SelectInput
                id="filter-subject"
                value={subject}
                onChange={(event) => updateSubject(event.target.value)}
              >
                <option value="">كل المواد</option>
                {data?.filters.subjects.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label htmlFor="filter-year" className="label !mb-1">السنة</label>
              <SelectInput id="filter-year" value={year} onChange={(event) => setYear(event.target.value)}>
                <option value="">كل السنوات</option>
                {data?.filters.years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label htmlFor="filter-session" className="label !mb-1">الدورة</label>
              <SelectInput id="filter-session" value={session} onChange={(event) => setSession(event.target.value)}>
                <option value="">كل الدورات</option>
                {(['principale', 'rattrapage', 'blanc'] as const).map((value) => (
                  <option key={value} value={value}>
                    {sessionLabels[value]}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label htmlFor="filter-status" className="label !mb-1">الحالة</label>
              <SelectInput
                id="filter-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
              >
                <option value="all">الكل</option>
                <option value="pending">غير منجز</option>
                <option value="completed">منجز</option>
              </SelectInput>
            </div>
          </div>
          {hasFilters ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
              <span className="text-[10px] text-subtle">التصفية النشطة:</span>
              {subject ? <Chip>{data?.filters.subjects.find((item) => item.slug === subject)?.name ?? subject}</Chip> : null}
              {year ? <Chip>{year}</Chip> : null}
              {session ? <Chip>{sessionLabels[session as keyof typeof sessionLabels]}</Chip> : null}
              {status !== 'all' ? <Chip>{status === 'completed' ? 'منجز' : 'غير منجز'}</Chip> : null}
            </div>
          ) : null}
        </SectionCard>

        {query.isLoading ? (
          <div className="space-y-2.5" role="status" aria-label="جارٍ تحميل الامتحانات">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="card flex items-center gap-3 p-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="mt-2 h-3 w-64 max-w-full" />
                </div>
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <QueryError error={query.error} onRetry={() => void query.refetch()} />
        ) : papers.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={SearchX}
              title="لا نتائج بهذه التصفية"
              description="جرّب تغيير المادة أو السنة أو الدورة، أو أعد ضبط العوامل."
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters} icon={<RotateCcw className="h-3.5 w-3.5" />}>
                  إعادة ضبط التصفية
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11.5px] text-muted">
                {formatNumber(papers.length)} موضوعًا · {formatNumber(summary.completed)} منجز ·{' '}
                {formatNumber(pendingCount)} متبقٍ
              </p>
              <p className="flex items-center gap-1.5 text-[10px] text-subtle">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                مواضيع تدريبية، ليست امتحانات رسمية
              </p>
            </div>
            <ul className="space-y-2.5" aria-label="قائمة مواضيع الامتحانات">
              {papers.map((paper) => (
                <li key={paper.id}>
                  <ExamRow
                    paper={paper}
                    showSubject={!subject}
                    onToggle={(item) => {
                      if (!canStudy) {
                        toast({
                          title: 'انتهت التجربة',
                          description: 'تسجيل التقدّم متوقف مؤقتًا، وبياناتك محفوظة.',
                          variant: 'warning',
                        });
                        return;
                      }
                      toggleMutation.mutate(item);
                    }}
                    disabled={!canStudy}
                    pending={toggleMutation.isPending && toggleMutation.variables?.id === paper.id}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
