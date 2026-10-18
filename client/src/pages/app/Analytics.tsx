import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Brain,
  CalendarClock,
  ChartNoAxesColumn,
  CheckCheck,
  ClipboardCheck,
  Flame,
  Settings2,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AnalyticsResponse } from '@shared/types';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { cn, formatMinutes, formatNumber, pluralCards } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ActivityAreaChart,
  DonutChart,
  ForecastBars,
} from '@/components/charts/Charts';
import { SubjectIcon } from '@/components/app/SubjectIcon';
import { QueryError } from '@/components/app/QueryState';

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="جارٍ تحميل التحليلات">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-8 w-64" />
      <div className="card p-5">
        <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
          <Skeleton className="h-40 w-40 rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2"><Skeleton className="h-48 w-full" /></div>
        <div className="card p-5"><Skeleton className="h-48 w-full" /></div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [metric, setMetric] = useState<'minutes' | 'cards'>('minutes');
  const query = useQuery({
    queryKey: queryKeys.analytics,
    queryFn: () => api<AnalyticsResponse>('/analytics'),
  });

  if (query.isLoading) return <AnalyticsSkeleton />;
  if (query.isError || !query.data) {
    return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
  }

  const analytics = query.data;
  const { overall, subjects, activity } = analytics;
  const totalMinutes = activity.reduce((sum, day) => sum + day.minutes, 0);
  const totalCards = activity.reduce((sum, day) => sum + day.cards, 0);
  const activeDays = activity.filter((day) => day.minutes > 0 || day.cards > 0).length;
  const masteryTotal = analytics.mastery.fresh + analytics.mastery.learning + analytics.mastery.mastered;
  const masteryPct = masteryTotal ? (analytics.mastery.mastered / masteryTotal) * 100 : 0;
  const examPct = analytics.exams.total ? (analytics.exams.completed / analytics.exams.total) * 100 : 0;
  const forecastTotal = analytics.forecast.reduce((sum, day) => sum + day.count, 0);
  const goalPct = overall.dailyGoalMinutes
    ? Math.min(100, (overall.studyMinutesToday / overall.dailyGoalMinutes) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            كل الأرقام من بياناتك المحفوظة
          </span>
        }
        title="تقدّمك والتحليلات"
        description="صورة صادقة عن دراستك: أين أنت، ما الذي يحتاج انتباهك، وكيف يتوزّع وقتك خلال الأسبوعين الماضيين."
        actions={
          <Link to="/app/settings" className="btn btn-secondary btn-sm">
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            ضبط الهدف اليومي
          </Link>
        }
      />

      <div className="space-y-4">
        <section className="card overflow-hidden">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="flex items-center gap-5">
              <ProgressRing value={overall.progress} size={144} strokeWidth={11}>
                <span className="font-display text-[30px] font-semibold leading-none text-ink">
                  {formatNumber(overall.progress)}
                  <span className="text-sm font-medium text-muted">٪</span>
                </span>
                <span className="mt-1.5 text-[10px] font-medium text-muted">التقدّم المرجّح</span>
              </ProgressRing>
              <div className="sm:hidden">
                <p className="text-[11px] text-muted">مواد قيد الدراسة</p>
                <p className="mt-0.5 text-[18px] font-semibold text-ink">{formatNumber(overall.subjectCount)}</p>
                <p className="mt-2 text-[11px] text-muted">أفضل سلسلة</p>
                <p className="mt-0.5 text-[13px] font-medium text-ink">{formatNumber(overall.streakDays)} يوم</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-line bg-surface-2/50 p-3">
                <p className="flex items-center gap-1 text-[9.5px] text-muted">
                  <Flame className="h-3 w-3 text-gold" aria-hidden="true" /> المداومة
                </p>
                <p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{formatNumber(overall.streakDays)}</p>
                <p className="text-[9px] text-subtle">يوم متتالٍ</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/50 p-3">
                <p className="flex items-center gap-1 text-[9.5px] text-muted">
                  <ClipboardCheck className="h-3 w-3 text-primary" aria-hidden="true" /> الامتحانات
                </p>
                <p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">
                  {formatNumber(overall.completedExams)}
                  <span className="text-[10px] text-muted">/{formatNumber(overall.totalExams)}</span>
                </p>
                <p className="text-[9px] text-subtle">موضوعًا منجزًا</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/50 p-3">
                <p className="flex items-center gap-1 text-[9.5px] text-muted">
                  <Brain className="h-3 w-3 text-primary" aria-hidden="true" /> البطاقات
                </p>
                <p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">
                  {formatNumber(overall.masteredCards)}
                  <span className="text-[10px] text-muted">/{formatNumber(overall.totalCards)}</span>
                </p>
                <p className="text-[9px] text-subtle">متمكّن منها</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/50 p-3">
                <p className="flex items-center gap-1 text-[9.5px] text-muted">
                  <Target className="h-3 w-3 text-warning" aria-hidden="true" /> اليوم
                </p>
                <p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">
                  {formatNumber(overall.studyMinutesToday)}
                  <span className="text-[10px] text-muted"> د</span>
                </p>
                <p className="text-[9px] text-subtle">من أصل {formatNumber(overall.dailyGoalMinutes)} دقيقة</p>
              </div>
            </div>
          </div>

          <div className="border-t border-line bg-surface-2/40 px-5 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted">
              <span className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                هدف اليوم: {formatNumber(overall.studyMinutesToday)} من {formatNumber(overall.dailyGoalMinutes)} دقيقة
              </span>
              <span className="font-medium text-primary-strong">{formatNumber(goalPct)}٪ من الهدف</span>
            </div>
            <ProgressBar value={goalPct} size="sm" className="mt-2" label="نسبة إنجاز هدف اليوم" />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            title="نشاط الأسبوعين"
            subtitle={`${formatNumber(activeDays)} يومًا نشطًا من ${formatNumber(activity.length)}`}
            icon={<ChartNoAxesColumn className="h-4 w-4" aria-hidden="true" />}
            className="lg:col-span-2"
            action={
              <Tabs
                items={[
                  { value: 'minutes', label: 'الدقائق' },
                  { value: 'cards', label: 'البطاقات' },
                ]}
                value={metric}
                onChange={(value) => setMetric(value as 'minutes' | 'cards')}
                label="مقياس النشاط"
                className="!border-0 !bg-transparent !p-0"
              />
            }
          >
            {totalMinutes === 0 && totalCards === 0 ? (
              <EmptyState
                icon={ChartNoAxesColumn}
                title="لا نشاط مسجّل بعد"
                description="ستظهر هنا دقائق دراستك والبطاقات التي راجعتها بعد أول جلسة أو تمرين."
                action={<Link to="/app/revision" className="btn btn-secondary btn-sm">ابدأ مراجعة</Link>}
                compact
              />
            ) : (
              <>
                <ActivityAreaChart data={activity} metric={metric} />
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
                  <div>
                    <p className="text-[9.5px] text-muted">وقت الدراسة</p>
                    <p className="mt-0.5 text-[12.5px] font-semibold text-ink">{formatMinutes(totalMinutes)}</p>
                  </div>
                  <div>
                    <p className="text-[9.5px] text-muted">بطاقات راجعتها</p>
                    <p className="mt-0.5 text-[12.5px] font-semibold text-ink">{formatNumber(totalCards)}</p>
                  </div>
                  <div>
                    <p className="text-[9.5px] text-muted">متوسط اليوم النشط</p>
                    <p className="mt-0.5 text-[12.5px] font-semibold text-ink">
                      {activeDays ? formatMinutes(totalMinutes / activeDays) : '—'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard
            title="المراجعات القادمة"
            subtitle="عدد البطاقات المجدولة خلال 7 أيام"
            icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
          >
            {forecastTotal === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="لا مراجعات مجدولة"
                description="ابدأ بمراجعة بطاقاتك لتبني جدولك القادم."
                compact
                action={<Link to="/app/revision" className="btn btn-secondary btn-sm">مدى المراجعة</Link>}
              />
            ) : (
              <>
                <p className="mb-3 flex items-baseline gap-2">
                  <span className="font-display text-[28px] font-semibold leading-none text-ink">
                    {formatNumber(forecastTotal)}
                  </span>
                  <span className="text-[10.5px] text-muted">{pluralCards(forecastTotal)} خلال 7 أيام</span>
                </p>
                <ForecastBars data={analytics.forecast} />
              </>
            )}
            <div className="mt-4 border-t border-line pt-3">
              <Link
                to="/app/revision"
                className="btn btn-primary btn-sm w-full"
              >
                فتح جلسة المراجعة
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            title="تقدّمك حسب المادة"
            subtitle="التقدّم الكلي = الامتحانات 40٪ + التمارين 35٪ + البطاقات 25٪"
            icon={<Target className="h-4 w-4" aria-hidden="true" />}
            className="lg:col-span-2"
          >
            <ul className="space-y-3">
              {subjects.map((subject) => (
                <li
                  key={subject.id}
                  className="rounded-xl border border-line p-3 transition hover:border-line-strong"
                >
                  <div className="flex items-center gap-2.5">
                    <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                    <Link
                      to={`/app/subjects/${subject.slug}`}
                      className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink hover:text-primary"
                    >
                      {subject.name}
                    </Link>
                    <span className="text-[11px] font-semibold tabular-nums text-ink">
                      {formatNumber(subject.progress)}٪
                    </span>
                  </div>
                  <ProgressBar
                    value={subject.progress}
                    size="sm"
                    color={subject.color}
                    className="mt-2"
                    label={`تقدّم ${subject.name}`}
                  />
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[9px] text-subtle">
                    <span>امتحانات: {formatNumber(subject.examPct)}٪</span>
                    <span>تمارين: {formatNumber(subject.exercisePct)}٪</span>
                    <span>بطاقات: {formatNumber(subject.masteryPct)}٪</span>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <div className="space-y-4">
            <SectionCard title="إتقان البطاقات" icon={<Brain className="h-4 w-4" aria-hidden="true" />}>
              <div className="flex flex-col items-center">
                <DonutChart
                  segments={[
                    { value: analytics.mastery.mastered, color: 'rgb(var(--c-success))', label: 'متمكّن منها' },
                    { value: analytics.mastery.learning, color: 'rgb(var(--c-gold))', label: 'قيد التعلم' },
                    { value: analytics.mastery.fresh, color: 'rgb(var(--c-line-strong))', label: 'جديدة' },
                  ]}
                  label={`إتقان البطاقات ${formatNumber(masteryPct)}٪`}
                  center={
                    <>
                      <span className="font-display text-[22px] font-semibold leading-none text-ink">
                        {formatNumber(masteryPct)}٪
                      </span>
                      <span className="mt-1 text-[9px] text-muted">متمكّن منها</span>
                    </>
                  }
                />
              </div>
              <ul className="mt-4 space-y-2 border-t border-line pt-3 text-[10.5px]">
                {[
                  { label: 'متمكّن منها', value: analytics.mastery.mastered, color: 'rgb(var(--c-success))' },
                  { label: 'قيد التعلم', value: analytics.mastery.learning, color: 'rgb(var(--c-gold))' },
                  { label: 'لم تُراجع بعد', value: analytics.mastery.fresh, color: 'rgb(var(--c-line-strong))' },
                ].map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-muted">
                      <span className="h-2 w-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />
                      {item.label}
                    </span>
                    <span className="font-medium tabular-nums text-ink">{formatNumber(item.value)}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="إنجاز الامتحانات" icon={<CheckCheck className="h-4 w-4" aria-hidden="true" />}>
              <div className="flex items-center gap-4">
                <DonutChart
                  size={104}
                  thickness={10}
                  segments={[
                    { value: analytics.exams.completed, color: 'rgb(var(--c-primary))', label: 'منجز' },
                    {
                      value: Math.max(analytics.exams.total - analytics.exams.completed, 0),
                      color: 'rgb(var(--c-line))',
                      label: 'متبقٍ',
                    },
                  ]}
                  label={`إنجاز الامتحانات ${formatNumber(examPct)}٪`}
                  center={
                    <span className="font-display text-[18px] font-semibold leading-none text-ink">
                      {formatNumber(examPct)}٪
                    </span>
                  }
                />
                <div>
                  <p className="text-[12px] font-semibold text-ink">
                    {formatNumber(analytics.exams.completed)} من {formatNumber(analytics.exams.total)}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                    موضوعًا تدريبيًا منجزًا. استمر على نفس الإيقاع.
                  </p>
                  <Link to="/app/exams" className="link mt-2 inline-flex text-[10.5px] font-medium">
                    متابعة الامتحانات
                  </Link>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        <div className={cn('card flex flex-wrap items-center justify-between gap-3 px-5 py-4')}>
          <p className="text-[11px] leading-relaxed text-muted">
            متوسط هدفك اليومي {formatNumber(analytics.weeklyGoal)} دقيقة. يمكنك تعديله من الإعدادات،
            وستتحدّث خطة اليوم ولوحة التحكم فورًا.
          </p>
          <Link to="/app/settings" className="btn btn-secondary btn-sm">
            تعديل الهدف
          </Link>
        </div>
      </div>
    </div>
  );
}
