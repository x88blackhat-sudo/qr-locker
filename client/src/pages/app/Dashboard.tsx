import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Brain,
  CalendarDays,
  ChartNoAxesColumn,
  CheckCheck,
  ChevronLeft,
  ClipboardCheck,
  Clock3,
  Flame,
  PenLine,
  Play,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardResponse, PlanItem } from '@shared/types';
import { api, ApiError } from '@/lib/api';
import { useStudyAccess } from '@/lib/auth';
import {
  formatDate,
  formatMinutes,
  formatNumber,
  greeting,
  pluralCards,
  pluralDays,
  relativeTime,
  todayLabel,
} from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ActivityAreaChart } from '@/components/charts/Charts';
import { CompletionToggle } from '@/components/app/CompletionToggle';
import { StudyAccessNotice, QueryError } from '@/components/app/QueryState';
import { SubjectIcon } from '@/components/app/SubjectIcon';
import { queryKeys } from '@/lib/query';
import { cn } from '@/lib/utils';

const planIcons = {
  review: Brain,
  exercise: PenLine,
  exam: ClipboardCheck,
  series: BookOpen,
} as const;

const planLabels = {
  review: 'مراجعة',
  exercise: 'تمرين',
  exam: 'امتحان',
  series: 'سلسلة',
} as const;

const activityIcons: Record<string, typeof Brain> = {
  exam_completed: ClipboardCheck,
  exercise_completed: PenLine,
  series_completed: BookOpen,
  review_session: Brain,
};

function trialNoticeKey(endsAt: number | null): string {
  return `bactrack_trial_notice_${endsAt ?? 'none'}`;
}

function readDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'dismissed';
  } catch {
    return false;
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="جارٍ تحميل لوحة التحكم">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-9 w-72 max-w-full" />
      <div className="card grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-surface p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-6 w-16" />
            <Skeleton className="mt-2 h-2 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-3 w-full" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="card p-5">
          <Skeleton className="mx-auto h-36 w-36 rounded-full" />
          <Skeleton className="mt-5 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      </div>
      <span className="sr-only">جارٍ تحميل بياناتك…</span>
    </div>
  );
}

export default function Dashboard() {
  const { canStudy } = useStudyAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api<DashboardResponse>('/dashboard'),
  });

  const dashboard = query.data;
  const noticeKey = useMemo(
    () => trialNoticeKey(dashboard?.trial.trialEndsAt ?? null),
    [dashboard?.trial.trialEndsAt],
  );
  const noticeHidden = dismissed || (dashboard ? readDismissed(noticeKey) : false);

  const toggleMutation = useMutation({
    mutationFn: (item: PlanItem) =>
      api<{ item: PlanItem }>(`/plan/items/${item.id}`, {
        method: 'PATCH',
        body: { completed: !item.completed },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics });
      void queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
      void queryClient.invalidateQueries({ queryKey: ['subject'] });
    },
    onError: (error) => {
      toast({
        title: 'تعذّر تحديث خطة اليوم',
        description: error instanceof ApiError ? error.message : 'يرجى المحاولة مجددًا.',
        variant: 'error',
      });
    },
  });

  if (query.isLoading) return <DashboardSkeleton />;
  if (query.isError || !dashboard) {
    return (
      <QueryError
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }

  const { overall, plan, reviews, attention, recentActivity, weekly, primaryAction, trial } = dashboard;
  const weeklyMinutes = weekly.reduce((sum, day) => sum + day.minutes, 0);
  const weeklyCards = weekly.reduce((sum, day) => sum + day.cards, 0);
  const planPct = plan.items.length ? (plan.completedCount / plan.items.length) * 100 : 0;
  const goalPct = (overall.studyMinutesToday / Math.max(overall.dailyGoalMinutes, 1)) * 100;
  const showEndingNotice =
    trial.access === 'trial' && trial.endingSoon && !noticeHidden;

  const dismissNotice = () => {
    setDismissed(true);
    try {
      localStorage.setItem(noticeKey, 'dismissed');
    } catch {
      /* storage blocked */
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {todayLabel()}
          </span>
        }
        title={`${greeting()}، ${dashboard.welcomeName}.`}
        description="هذه صورة واقعية ليومك الدراسي، مبنية على ما حفظته فعلًا. اختر خطوة واحدة وابدأ."
        actions={
          <>
            <Link to="/app/analytics" className="btn btn-secondary hidden sm:inline-flex">
              <ChartNoAxesColumn className="h-4 w-4" aria-hidden="true" />
              التحليلات
            </Link>
            <Link to={primaryAction.href} className="btn btn-primary">
              <Play className="h-4 w-4" aria-hidden="true" />
              {primaryAction.label}
            </Link>
          </>
        }
      />

      <div className="space-y-4">
        <StudyAccessNotice />

        {showEndingNotice ? (
          <div className="alert alert-warning items-start" role="status">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {trial.daysRemaining === 1
                  ? 'تبقّى يوم واحد على نهاية التجربة.'
                  : `تبقّى ${pluralDays(trial.daysRemaining ?? 0)} على نهاية التجربة.`}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed">
                لا حاجة لأي إجراء عاجل. ستظل بياناتك محفوظة دائمًا، ويمكنك الاطلاع على حالة الاشتراك
                في أي وقت.{' '}
                <Link to="/app/plans" className="font-semibold underline underline-offset-2">
                  عرض التفاصيل
                </Link>
              </p>
            </div>
            <button
              type="button"
              onClick={dismissNotice}
              className="rounded-md p-1 text-current/70 transition hover:bg-black/5 hover:text-current"
              aria-label="إغلاق التنبيه"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {/* Stats strip */}
        <section
          className="card grid grid-cols-2 gap-px overflow-hidden !p-0 sm:grid-cols-4"
          aria-label="ملخص التقدّم"
        >
          <div className="bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
              <Target className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              التقدّم العام
            </p>
            <p className="stat-value mt-2">
              {formatNumber(overall.progress)}
              <span className="text-sm font-medium text-muted">٪</span>
            </p>
            <ProgressBar value={overall.progress} size="sm" className="mt-2.5" label="التقدّم العام" />
          </div>
          <div className="bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
              <Flame className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
              المداومة
            </p>
            <p className="stat-value mt-2">
              {formatNumber(overall.streakDays)}
              <span className="ms-1 text-[11px] font-medium text-muted">يوم</span>
            </p>
            <p className="mt-2.5 text-[10.5px] text-subtle">
              {overall.streakDays > 0 ? 'سلسلة نشاط متتالية' : 'ابدأ سلسلتك اليوم'}
            </p>
          </div>
          <div className="bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
              <Brain className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              بطاقات متمكّن منها
            </p>
            <p className="stat-value mt-2">
              {formatNumber(overall.masteredCards)}
              <span className="text-sm font-medium text-muted">/{formatNumber(overall.totalCards)}</span>
            </p>
            <p className="mt-2.5 text-[10.5px] text-subtle">من إجمالي بطاقات المنهاج</p>
          </div>
          <div className="bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
              <Clock3 className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
              مستحقة الآن
            </p>
            <p className="stat-value mt-2">{formatNumber(reviews.dueNow)}</p>
            <p className="mt-2.5 text-[10.5px] text-subtle">{pluralCards(reviews.dueNow)} للمراجعة</p>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Today plan */}
          <SectionCard
            title="خطة اليوم"
            subtitle={`${formatMinutes(plan.totalMinutes)} إجمالًا · ${plan.completedCount} من ${plan.items.length} مهام مكتملة`}
            icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
            className="lg:col-span-2"
            action={
              <span className="chip chip-primary">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                تتجدّد يوميًا
              </span>
            }
          >
            <ProgressBar value={planPct} className="mb-4" label="إنجاز خطة اليوم" />
            {plan.items.length === 0 ? (
              <EmptyState
                icon={CheckCheck}
                title="لا توجد مهام لهذا اليوم"
                description="عد إلى المواد واختر تمرينًا أو امتحانًا لتبدأ."
                compact
                action={<Link to="/app/subjects" className="btn btn-secondary btn-sm">تصفّح المواد</Link>}
              />
            ) : (
              <ul className="space-y-2">
                {plan.items.map((item) => {
                  const Icon = planIcons[item.kind];
                  const isPending = toggleMutation.isPending && toggleMutation.variables?.id === item.id;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-3 transition-colors',
                        item.completed ? 'border-line bg-surface-2/50' : 'border-line bg-surface',
                      )}
                    >
                      <CompletionToggle
                        checked={item.completed}
                        onChange={() => {
                          if (!canStudy) {
                            toast({
                              title: 'التجربة منتهية',
                              description: 'انتهت فترة التجربة. بياناتك محفوظة ويمكنك الاطلاع عليها.',
                              variant: 'warning',
                            });
                            return;
                          }
                          toggleMutation.mutate(item);
                        }}
                        disabled={!canStudy}
                        loading={isPending}
                        label={item.completed ? `إلغاء إنجاز ${item.title}` : `إنجاز ${item.title}`}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="flex items-center gap-1 text-[10px] font-medium text-subtle">
                            <Icon className="h-3 w-3" aria-hidden="true" />
                            {planLabels[item.kind]}
                          </span>
                          {item.subjectName ? (
                            <span className="chip !px-1.5 !py-0 !text-[9px]">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ background: item.subjectColor ?? undefined }}
                              />
                              {item.subjectName}
                            </span>
                          ) : null}
                          <span className="text-[10px] text-subtle">· {item.minutes} دقيقة</span>
                        </div>
                        <Link
                          to={item.href}
                          className={cn(
                            'mt-0.5 block text-[13px] font-medium leading-relaxed transition hover:text-primary',
                            item.completed ? 'text-muted line-through decoration-line-strong' : 'text-ink',
                          )}
                        >
                          {item.title}
                        </Link>
                        <p className="text-[10.5px] text-muted">{item.subtitle}</p>
                      </div>
                      <Link
                        to={item.href}
                        className="btn btn-ghost btn-icon btn-sm mt-0.5"
                        aria-label={`فتح ${item.title}`}
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <p className="text-[11px] text-muted">
                الخطوة التالية: <span className="font-medium text-ink">{primaryAction.hint}</span>
              </p>
              <Link to={primaryAction.href} className="btn btn-subtle btn-sm">
                {primaryAction.label}
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </SectionCard>

          {/* Progress overview */}
          <section className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-[15px] font-semibold text-ink">تقدّمك العام</h2>
                <p className="mt-0.5 text-[11px] text-muted">مرجّح بمعاملات المواد</p>
              </div>
              <Link to="/app/analytics" className="text-[11px] font-medium text-primary hover:underline">
                التفاصيل
              </Link>
            </div>

            <div className="mt-5 flex justify-center">
              <ProgressRing value={overall.progress} size={142} strokeWidth={11}>
                <span className="font-display text-[30px] font-semibold leading-none text-ink">
                  {formatNumber(overall.progress)}
                  <span className="text-sm font-medium text-muted">٪</span>
                </span>
                <span className="mt-1.5 text-[10px] font-medium text-muted">من المنهاج</span>
              </ProgressRing>
            </div>
            <p className="mt-4 text-center text-[10.5px] leading-relaxed text-subtle">
              محسوب من الامتحانات المنجزة، التمارين، والبطاقات المتمكّن منها — لا أرقام تقديرية.
            </p>

            <div className="mt-5 space-y-3.5 border-t border-line pt-4">
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">الامتحانات المنجزة</span>
                  <span className="font-medium tabular-nums text-ink">
                    {formatNumber(overall.completedExams)} / {formatNumber(overall.totalExams)}
                  </span>
                </div>
                <ProgressBar
                  value={overall.totalExams ? (overall.completedExams / overall.totalExams) * 100 : 0}
                  size="sm"
                  className="mt-1.5"
                  label="نسبة الامتحانات المنجزة"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">هدف الدراسة اليومي</span>
                  <span className="font-medium tabular-nums text-ink">
                    {formatNumber(overall.studyMinutesToday)} / {formatNumber(overall.dailyGoalMinutes)} د
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(100, goalPct)}
                  size="sm"
                  className="mt-1.5"
                  color="rgb(var(--c-gold))"
                  label="هدف الدراسة اليومي"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                  <Flame className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                  المداومة الحالية
                </span>
                <span className="text-[11px] font-semibold text-ink">
                  {overall.streakDays > 0 ? `${pluralDays(overall.streakDays)} متتالية` : 'لم تبدأ بعد'}
                </span>
              </div>
            </div>
          </section>

          {/* Weekly chart */}
          <SectionCard
            title="نشاطك هذا الأسبوع"
            subtitle="دقائق الدراسة المسجّلة من إجراءاتك داخل المنصة"
            icon={<ChartNoAxesColumn className="h-4 w-4" aria-hidden="true" />}
            className="lg:col-span-2"
            action={<span className="chip">{formatMinutes(weeklyMinutes)}</span>}
          >
            <ActivityAreaChart data={weekly} metric="minutes" />
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
              <div>
                <p className="text-[10px] text-muted">وقت الدراسة</p>
                <p className="mt-0.5 text-[13px] font-semibold text-ink">{formatMinutes(weeklyMinutes)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted">بطاقات راجعتها</p>
                <p className="mt-0.5 text-[13px] font-semibold text-ink">{formatNumber(weeklyCards)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted">أفضل يوم</p>
                <p className="mt-0.5 truncate text-[13px] font-semibold text-ink">
                  {weeklyMinutes > 0
                    ? weekly.reduce((best, day) => (day.minutes > best.minutes ? day : best), weekly[0]!)?.label
                    : '—'}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Reviews */}
          <SectionCard
            title="المراجعات القادمة"
            icon={<Brain className="h-4 w-4" aria-hidden="true" />}
            action={
              reviews.dueNow + reviews.newCards > 0 ? (
                <span className="chip chip-primary">{pluralCards(reviews.dueNow + reviews.newCards)}</span>
              ) : undefined
            }
          >
            <div className="flex items-end gap-2">
              <p className="font-display text-[34px] font-semibold leading-none text-ink">
                {formatNumber(reviews.dueNow)}
              </p>
              <p className="pb-1 text-[11px] text-muted">بطاقة مستحقة الآن</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-line bg-surface-2/60 p-2.5">
                <p className="text-[9.5px] text-muted">خلال اليوم</p>
                <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-ink">{formatNumber(reviews.dueToday)}</p>
              </div>
              <div className="rounded-lg border border-line bg-surface-2/60 p-2.5">
                <p className="text-[9.5px] text-muted">بطاقات جديدة</p>
                <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-ink">{formatNumber(reviews.newCards)}</p>
              </div>
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
              {reviews.nextDueAt
                ? `أقرب استحقاق: ${formatDate(reviews.nextDueAt, 'short')} · ${reviews.next7Days} مراجعة خلال 7 أيام.`
                : reviews.newCards > 0
                  ? `${pluralCards(reviews.newCards)} جديدة جاهزة للبدء.`
                  : 'لا مراجعات مجدولة حاليًا.'}
            </p>
            <Link
              to="/app/revision"
              className="btn btn-primary btn-sm mt-4 w-full"
              aria-disabled={!canStudy}
              onClick={(event) => {
                if (!canStudy) {
                  event.preventDefault();
                  toast({
                    title: 'انتهت التجربة',
                    description: 'بياناتك محفوظة، لكن تسجيل مراجعات جديدة متوقف حاليًا.',
                    variant: 'warning',
                  });
                }
              }}
            >
              ابدأ المراجعة
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </SectionCard>

          {/* Attention subjects */}
          <SectionCard
            title="مواد تحتاج انتباهك"
            subtitle="أقل المواد تقدّمًا، بناءً على بياناتك الفعلية"
            icon={<Target className="h-4 w-4" aria-hidden="true" />}
            className="lg:col-span-2"
            action={
              <Link to="/app/subjects" className="text-[11px] font-medium text-primary hover:underline">
                كل المواد
              </Link>
            }
          >
            {attention.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="كل المواد في مسار جيد"
                description="واصل وتيرتك الحالية، ولا تنسَ المراجعة المنتظمة للبطاقات."
                compact
                action={<Link to="/app/revision" className="btn btn-secondary btn-sm">مراجعة سريعة</Link>}
              />
            ) : (
              <ul className="space-y-2.5">
                {attention.map((subject) => (
                  <li key={subject.id}>
                    <Link
                      to={`/app/subjects/${subject.slug}`}
                      className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-line-strong hover:bg-surface-2/60"
                    >
                      <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[12.5px] font-medium text-ink">{subject.name}</p>
                          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted">
                            {formatNumber(subject.progress)}٪
                          </span>
                        </div>
                        <ProgressBar value={subject.progress} size="sm" className="mt-1.5" color={subject.color} />
                        <div className="mt-1.5 flex items-center gap-2.5 text-[9.5px] text-subtle">
                          <span>امتحانات {subject.totals.completedPapers}/{subject.totals.papers}</span>
                          <span>·</span>
                          <span>بطاقات {subject.totals.masteredCards}/{subject.totals.cards}</span>
                          {subject.totals.dueCards > 0 ? (
                            <span className="ms-auto text-primary">{pluralCards(subject.totals.dueCards)} مستحقة</span>
                          ) : null}
                        </div>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-subtle transition group-hover:text-primary" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Recent activity */}
          <SectionCard
            title="آخر نشاط"
            subtitle="محفوظ في حسابك"
            icon={<CheckCheck className="h-4 w-4" aria-hidden="true" />}
          >
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="لا نشاط بعد"
                description="ابدأ بمراجعة بطاقاتك أو إنجاز تمرين، وسيظهر هنا سجلّك."
                compact
                action={<Link to="/app/revision" className="btn btn-secondary btn-sm">ابدأ الآن</Link>}
              />
            ) : (
              <ul className="space-y-1">
                {recentActivity.map((activity) => {
                  const Icon = activityIcons[activity.type] ?? Sparkles;
                  return (
                    <li key={activity.id} className="flex items-start gap-3 rounded-lg px-1 py-2.5">
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted"
                        style={
                          activity.subjectColor
                            ? { backgroundColor: `${activity.subjectColor}14`, color: activity.subjectColor }
                            : undefined
                        }
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] font-medium leading-relaxed text-ink">{activity.title}</p>
                        <p className="mt-0.5 text-[9.5px] text-muted">
                          {activity.subjectName ? `${activity.subjectName} · ` : ''}
                          {relativeTime(activity.at)}
                        </p>
                      </div>
                      {activity.minutes ? (
                        <span className="shrink-0 text-[9.5px] text-subtle">{activity.minutes} د</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
