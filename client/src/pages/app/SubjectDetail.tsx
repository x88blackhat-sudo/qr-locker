import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  Clock3,
  GraduationCap,
  Layers,
  RotateCw,
  Target,
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { ExerciseInfo, SubjectDetailResponse } from '@shared/types';
import { api, ApiError } from '@/lib/api';
import { useStudyAccess } from '@/lib/auth';
import { queryKeys } from '@/lib/query';
import {
  cn,
  formatMinutes,
  formatNumber,
  pluralCards,
  pluralExercises,
} from '@/lib/utils';
import { difficultyClasses, difficultyLabels, exerciseStatusLabels } from '@/lib/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { Chip } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ExamRow } from '@/components/app/ExamRow';
import { QueryError, StudyAccessNotice } from '@/components/app/QueryState';
import { SubjectIcon } from '@/components/app/SubjectIcon';

type TabValue = 'overview' | 'exams' | 'exercises' | 'series' | 'cards';

const tabValues: TabValue[] = ['overview', 'exams', 'exercises', 'series', 'cards'];

export default function SubjectDetail() {
  const { slug = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canStudy } = useStudyAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.subject(slug),
    queryFn: () => api<SubjectDetailResponse>(`/subjects/${slug}`),
    enabled: Boolean(slug),
  });

  const activeTab = useMemo<TabValue>(() => {
    const requested = searchParams.get('tab');
    return tabValues.includes(requested as TabValue) ? (requested as TabValue) : 'overview';
  }, [searchParams]);

  const setTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.subject(slug) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: queryKeys.analytics });
  };

  const exerciseMutation = useMutation({
    mutationFn: (input: { id: string; status: ExerciseInfo['status'] }) =>
      api<{ exercise: ExerciseInfo }>(`/exercises/${input.id}/progress`, {
        method: 'PATCH',
        body: { status: input.status },
      }),
    onSuccess: invalidate,
    onError: (error) =>
      toast({
        title: 'تعذّر تحديث التمرين',
        description: error instanceof ApiError ? error.message : 'يرجى المحاولة مجددًا.',
        variant: 'error',
      }),
  });

  const seriesMutation = useMutation({
    mutationFn: (input: { id: string; completed: boolean }) =>
      api(`/series/${input.id}/toggle`, { method: 'POST', body: { completed: input.completed } }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'تم تحديث السلسلة', variant: 'success' });
    },
    onError: (error) =>
      toast({
        title: 'تعذّر تحديث السلسلة',
        description: error instanceof ApiError ? error.message : 'يرجى المحاولة مجددًا.',
        variant: 'error',
      }),
  });

  const examMutation = useMutation({
    mutationFn: (paperId: string) =>
      api(`/exams/${paperId}/completion`, {
        method: 'POST',
        body: { completed: true },
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'أُضيف الموضوع إلى إنجازاتك', variant: 'success' });
    },
    onError: (error) =>
      toast({
        title: 'تعذّر تحديث الامتحان',
        description: error instanceof ApiError ? error.message : 'يرجى المحاولة مجددًا.',
        variant: 'error',
      }),
  });

  const examToggle = (paper: { id: string; completed: boolean }) => {
    void api(`/exams/${paper.id}/completion`, {
      method: 'POST',
      body: { completed: !paper.completed },
    })
      .then(() => invalidate())
      .catch((error: unknown) =>
        toast({
          title: 'تعذّر تحديث الامتحان',
          description: error instanceof ApiError ? error.message : 'يرجى المحاولة مجددًا.',
          variant: 'error',
        }),
      );
  };

  if (query.isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="جارٍ تحميل المادة">
        <Skeleton className="h-3 w-24" />
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-2 h-3 w-full max-w-md" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <Skeleton className="h-4 w-24" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="card p-5">
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div>
        <Link to="/app/subjects" className="mb-4 inline-flex items-center gap-1.5 text-[11.5px] text-muted hover:text-primary">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          كل المواد
        </Link>
        <QueryError error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  const detail = query.data;
  const { subject, units, exams, exercises, series } = detail;
  const reviewTotal = detail.dueCards + detail.newCards;
  const topics = [...new Set(exams.flatMap((exam) => exam.topics))];
  const groupedExercises = units
    .map((unit) => ({
      unit,
      items: exercises.filter((exercise) => exercise.unitTitle === unit.title),
    }))
    .filter((group) => group.items.length > 0);

  const tabs = [
    { value: 'overview', label: 'نظرة عامة' },
    { value: 'exams', label: 'الامتحانات', count: exams.length },
    { value: 'exercises', label: 'التمارين', count: exercises.length },
    { value: 'series', label: 'السلاسل', count: series.length },
    { value: 'cards', label: 'البطاقات', count: subject.totals.cards },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={
          <Link
            to="/app/subjects"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted transition hover:text-primary"
          >
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            كل المواد
          </Link>
        }
        title={subject.name}
        description={subject.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Chip>
              <GraduationCap className="h-3 w-3" aria-hidden="true" />
              معامل {formatNumber(subject.coefficient)}
            </Chip>
            <Chip>
              <Layers className="h-3 w-3" aria-hidden="true" />
              {formatNumber(units.length)} وحدات
            </Chip>
          </div>
        }
      />

      <div className="space-y-4">
        <StudyAccessNotice />

        {/* Summary band */}
        <section className="card overflow-hidden">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <SubjectIcon icon={subject.icon} color={subject.color} size="lg" className="hidden sm:flex" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-medium text-muted">التقدّم</p>
                <p className="mt-1 text-[18px] font-semibold text-ink">{formatNumber(subject.progress)}٪</p>
                <ProgressBar value={subject.progress} size="sm" color={subject.color} className="mt-1.5" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted">الامتحانات</p>
                <p className="mt-1 text-[18px] font-semibold text-ink">
                  {subject.totals.completedPapers}
                  <span className="text-[11px] text-muted">/{subject.totals.papers}</span>
                </p>
                <p className="mt-1.5 text-[9.5px] text-subtle">مواضيع منجزة</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted">التمارين</p>
                <p className="mt-1 text-[18px] font-semibold text-ink">
                  {subject.totals.doneExercises}
                  <span className="text-[11px] text-muted">/{subject.totals.exercises}</span>
                </p>
                <p className="mt-1.5 text-[9.5px] text-subtle">تمارين مكتملة</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted">البطاقات</p>
                <p className="mt-1 text-[18px] font-semibold text-ink">
                  {subject.totals.masteredCards}
                  <span className="text-[11px] text-muted">/{subject.totals.cards}</span>
                </p>
                <p className="mt-1.5 text-[9.5px] text-subtle">بطاقات متمكّن منها</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <Link
                to={`/app/revision?subject=${subject.slug}`}
                className={cn('btn btn-primary btn-sm', !canStudy && 'pointer-events-none opacity-50')}
                aria-disabled={!canStudy}
              >
                <Brain className="h-3.5 w-3.5" aria-hidden="true" />
                مراجعة {reviewTotal > 0 ? pluralCards(reviewTotal) : 'البطاقات'}
              </Link>
              <Link to={`/app/exams?subject=${subject.slug}`} className="btn btn-secondary btn-sm">
                مواضيع المادة
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-2/40 px-5 py-2.5">
            <div className="flex items-center gap-3">
              <ProgressRing value={subject.progress} size={36} strokeWidth={4}>
                <span className="text-[8px] font-semibold text-ink">{formatNumber(subject.progress)}٪</span>
              </ProgressRing>
              <p className="text-[10px] text-muted">
                {detail.dueCards > 0 ? `${pluralCards(detail.dueCards)} مستحقة الآن` : 'لا بطاقات مستحقة الآن'}
                {detail.newCards > 0 ? ` · ${pluralCards(detail.newCards)} جديدة` : ''}
              </p>
            </div>
            <p className="hidden text-[9.5px] text-subtle sm:block">محسوبة من امتحاناتك وتمارينك وبطاقاتك</p>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs items={tabs} value={activeTab} onChange={setTab} label="أقسام المادة" className="max-w-full" />
        </div>

        {activeTab === 'overview' ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="الوحدات"
              subtitle="تتبّع تقدّمك داخل كل وحدة"
              icon={<Layers className="h-4 w-4" aria-hidden="true" />}
              className="lg:col-span-2"
            >
              <ul className="space-y-3">
                {units.map((unit) => (
                  <li key={unit.id} className="rounded-xl border border-line p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium text-ink">{unit.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted">
                          {unit.description}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold tabular-nums text-muted">{formatNumber(unit.progress)}٪</span>
                    </div>
                    <ProgressBar value={unit.progress} size="sm" color={subject.color} className="mt-2.5" />
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-subtle">
                      <span>{pluralExercises(unit.exerciseCount)}</span>
                      <span>·</span>
                      <span>{unit.doneExercises} منجز</span>
                      <span>·</span>
                      <span>{unit.masteredCards}/{unit.cardCount} بطاقة متمكّن منها</span>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <div className="space-y-4">
              <SectionCard title="بطاقات المراجعة" icon={<Brain className="h-4 w-4" aria-hidden="true" />}>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-surface-2 p-3">
                    <p className="text-[9.5px] text-muted">مستحقة الآن</p>
                    <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-ink">{formatNumber(detail.dueCards)}</p>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-3">
                    <p className="text-[9.5px] text-muted">جديدة</p>
                    <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-ink">{formatNumber(detail.newCards)}</p>
                  </div>
                </div>
                <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
                  جدولة المراجعة تتم على الخادم حسب تقييمك لكل بطاقة، وتُحفظ مباشرة في حسابك.
                </p>
                <Link
                  to={`/app/revision?subject=${subject.slug}`}
                  className={cn('btn btn-subtle btn-sm mt-3 w-full', !canStudy && 'pointer-events-none opacity-50')}
                  aria-disabled={!canStudy}
                >
                  ابدأ الجلسة
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </SectionCard>

              <SectionCard title="محاور الامتحانات" icon={<Target className="h-4 w-4" aria-hidden="true" />}>
                {topics.length === 0 ? (
                  <p className="text-[11px] text-muted">لا توجد محاور مسجّلة لهذه المادة.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {topics.map((topic) => (
                      <Chip key={topic}>{topic}</Chip>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            <SectionCard
              title="سلاسل الدراسة"
              subtitle="سلسلة واحدة تكفي لجلسة مراجعة كاملة"
              icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
              className="lg:col-span-2"
              action={
                <button type="button" className="text-[11px] font-medium text-primary hover:underline" onClick={() => setTab('series')}>
                  كل السلاسل
                </button>
              }
            >
              {series.length === 0 ? (
                <EmptyState icon={BookOpen} title="لا توجد سلاسل بعد" compact />
              ) : (
                <ul className="space-y-2.5">
                  {series.slice(0, 2).map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-ink">{item.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted">{item.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-[9.5px] text-subtle">
                        <span>{item.itemCount} عنصر</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" aria-hidden="true" />{formatMinutes(item.estMinutes)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="تمارين مقترحة" icon={<RotateCw className="h-4 w-4" aria-hidden="true" />}>
              {exercises.filter((exercise) => exercise.status !== 'done').length === 0 ? (
                <EmptyState icon={Check} title="أنجزت كل التمارين" description="يمكنك مراجعة البطاقات أو الانتقال إلى امتحان." compact />
              ) : (
                <ul className="space-y-2">
                  {exercises
                    .filter((exercise) => exercise.status !== 'done')
                    .slice(0, 3)
                    .map((exercise) => (
                      <li key={exercise.id} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-[11px] font-medium text-ink">{exercise.title}</p>
                          <p className="text-[9.5px] text-subtle">{exercise.unitTitle} · {exercise.estMinutes} دقيقة</p>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setTab('exercises')}
                className="btn btn-secondary btn-sm mt-3 w-full"
              >
                كل التمارين
              </button>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'exams' ? (
          <SectionCard
            title="مواضيع الامتحانات"
            subtitle="مواضيع تدريبية على نمط دورات البكالوريا مع محاور المراجعة"
            icon={<GraduationCap className="h-4 w-4" aria-hidden="true" />}
            action={
              <Link to={`/app/exams?subject=${subject.slug}`} className="btn btn-secondary btn-sm">
                فتح المتابعة الكاملة
              </Link>
            }
          >
            <ul className="space-y-2.5">
              {exams.map((paper) => (
                <li key={paper.id}>
                  <ExamRow
                    paper={paper}
                    onToggle={examToggle}
                    pending={examMutation.isPending && examMutation.variables === paper.id}
                    disabled={!canStudy}
                  />
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        {activeTab === 'exercises' ? (
          <SectionCard
            title="التمارين"
            subtitle={`${exercises.filter((exercise) => exercise.status === 'done').length} من ${exercises.length} تمارين مكتملة`}
            icon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
          >
            {groupedExercises.length === 0 ? (
              <EmptyState icon={RotateCw} title="لا تمارين متاحة" compact />
            ) : (
              <div className="space-y-5">
                {groupedExercises.map(({ unit, items }) => (
                  <div key={unit.id}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-[12px] font-semibold text-ink">{unit.title}</h3>
                      <span className="text-[9.5px] text-subtle">{items.filter((item) => item.status === 'done').length}/{items.length} منجز</span>
                    </div>
                    <ul className="space-y-2">
                      {items.map((exercise) => {
                        const pending =
                          exerciseMutation.isPending && exerciseMutation.variables?.id === exercise.id;
                        return (
                          <li key={exercise.id} className="rounded-xl border border-line p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[12px] font-medium text-ink">{exercise.title}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <Chip className={difficultyClasses[exercise.difficulty]}>
                                    {difficultyLabels[exercise.difficulty]}
                                  </Chip>
                                  <span className="flex items-center gap-1 text-[9.5px] text-subtle">
                                    <Clock3 className="h-3 w-3" aria-hidden="true" />
                                    {exercise.estMinutes} دقيقة
                                  </span>
                                </div>
                              </div>
                              <div
                                className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5"
                                role="group"
                                aria-label={`حالة التمرين: ${exercise.title}`}
                              >
                                {(['todo', 'in_progress', 'done'] as const).map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() =>
                                      exerciseMutation.mutate({ id: exercise.id, status })
                                    }
                                    disabled={!canStudy || pending}
                                    aria-pressed={exercise.status === status}
                                    className={cn(
                                      'rounded-md px-2 py-1 text-[9.5px] font-medium transition',
                                      exercise.status === status
                                        ? 'bg-surface text-ink shadow-xs'
                                        : 'text-muted hover:text-ink',
                                      (!canStudy || pending) && 'cursor-not-allowed opacity-60',
                                    )}
                                  >
                                    {exerciseStatusLabels[status]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}

        {activeTab === 'series' ? (
          <SectionCard
            title="سلاسل الدراسة"
            subtitle="علّم السلسلة كمنجزة لتُحسب في تقدّمك وسجل نشاطك"
            icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
          >
            {series.length === 0 ? (
              <EmptyState icon={BookOpen} title="لا توجد سلاسل متاحة" compact />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {series.map((item) => {
                  const done = item.doneItems >= item.itemCount;
                  const pending = seriesMutation.isPending && seriesMutation.variables?.id === item.id;
                  return (
                    <li key={item.id} className="flex flex-col rounded-xl border border-line p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[12.5px] font-medium leading-relaxed text-ink">{item.title}</h3>
                        {done ? <Chip variant="success">منجزة</Chip> : null}
                      </div>
                      <p className="mt-1.5 flex-1 text-[10.5px] leading-relaxed text-muted">{item.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[9.5px] text-subtle">
                        <span>{item.itemCount} عنصرًا</span>
                        <span>·</span>
                        <span>{formatMinutes(item.estMinutes)}</span>
                        {item.unitTitle ? (
                          <>
                            <span>·</span>
                            <span className="line-clamp-1">{item.unitTitle}</span>
                          </>
                        ) : null}
                      </div>
                      <ProgressBar
                        value={item.itemCount ? (item.doneItems / item.itemCount) * 100 : 0}
                        size="sm"
                        className="mt-2.5"
                        label={`تقدّم سلسلة ${item.title}`}
                      />
                      <Button
                        variant={done ? 'secondary' : 'subtle'}
                        size="sm"
                        className="mt-3"
                        loading={pending}
                        disabled={!canStudy}
                        onClick={() => seriesMutation.mutate({ id: item.id, completed: !done })}
                        icon={done ? <RotateCw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      >
                        {done ? 'إلغاء الإنجاز' : 'علّم كمنجزة'}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        ) : null}

        {activeTab === 'cards' ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="بطاقات هذه المادة"
              subtitle="جدولة تلقائية حسب استجابتك"
              icon={<Brain className="h-4 w-4" aria-hidden="true" />}
              className="lg:col-span-2"
            >
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-line bg-surface-2/60 p-3 text-center">
                  <p className="text-[9.5px] text-muted">إجمالي البطاقات</p>
                  <p className="mt-1 text-[20px] font-semibold tabular-nums text-ink">{formatNumber(subject.totals.cards)}</p>
                </div>
                <div className="rounded-xl border border-line bg-surface-2/60 p-3 text-center">
                  <p className="text-[9.5px] text-muted">متمكّن منها</p>
                  <p className="mt-1 text-[20px] font-semibold tabular-nums text-success">{formatNumber(subject.totals.masteredCards)}</p>
                </div>
                <div className="rounded-xl border border-line bg-surface-2/60 p-3 text-center">
                  <p className="text-[9.5px] text-muted">مستحقة الآن</p>
                  <p className="mt-1 text-[20px] font-semibold tabular-nums text-primary">{formatNumber(detail.dueCards)}</p>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="text-[11px] font-semibold text-ink">إتقان البطاقات حسب الوحدة</h3>
                <ul className="mt-2.5 space-y-2">
                  {units.map((unit) => {
                    const pct = unit.cardCount ? (unit.masteredCards / unit.cardCount) * 100 : 0;
                    return (
                      <li key={unit.id} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 truncate text-[10.5px] text-muted">{unit.title}</span>
                        <ProgressBar value={pct} size="sm" className="flex-1" />
                        <span className="w-10 shrink-0 text-end text-[9.5px] tabular-nums text-subtle">
                          {unit.masteredCards}/{unit.cardCount}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="alert alert-info mt-5">
                نستخدم جدولة تكرار متباعد (SM-2): البطاقة التي تجيب عليها بثقة تعود بعد فترة أطول،
                والتي تحتاج مراجعة تعود قريبًا. كل ذلك يُحفظ على الخادم.
              </div>
            </SectionCard>

            <SectionCard title="ابدأ جلسة" icon={<Brain className="h-4 w-4" aria-hidden="true" />}>
              <p className="text-[11px] leading-relaxed text-muted">
                {reviewTotal > 0
                  ? `لديك ${pluralCards(reviewTotal)} جاهزة في هذه المادة (${detail.dueCards} مستحقة و${detail.newCards} جديدة).`
                  : 'لا توجد بطاقات مستحقة الآن. عد لاحقًا أو راجع مادة أخرى.'}
              </p>
              <Link
                to={`/app/revision?subject=${subject.slug}`}
                className={cn('btn btn-primary btn-sm mt-4 w-full', !canStudy && 'pointer-events-none opacity-50')}
                aria-disabled={!canStudy}
              >
                <PlayIcon />
                فتح جلسة المراجعة
              </Link>
              {!canStudy ? (
                <p className="mt-2 text-[9.5px] text-warning">تسجيل التقدّم متوقف بعد انتهاء التجربة.</p>
              ) : null}
            </SectionCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlayIcon() {
  return <Brain className="h-3.5 w-3.5" aria-hidden="true" />;
}
