import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  CircleCheck,
  Clock3,
  Eye,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ReviewCard, ReviewResult, RevisionQueueResponse } from '@shared/types';
import { api, ApiError } from '@/lib/api';
import { useStudyAccess } from '@/lib/auth';
import { queryKeys } from '@/lib/query';
import { cn, dueLabel, formatDate, formatNumber, pluralCards } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { QueryError, StudyAccessNotice } from '@/components/app/QueryState';

type Rating = 1 | 2 | 3 | 4;

interface SessionState {
  cards: ReviewCard[];
  index: number;
  reviewed: number;
  ratings: Record<Rating, number>;
  revealed: boolean;
  lastRemaining: number | null;
}

function createSession(cards: ReviewCard[]): SessionState {
  return {
    cards,
    index: 0,
    reviewed: 0,
    ratings: { 1: 0, 2: 0, 3: 0, 4: 0 },
    revealed: false,
    lastRemaining: null,
  };
}

const ratingConfig: { value: Rating; label: string; hint: string; key: string; className: string }[] = [
  { value: 1, label: 'أعد', hint: 'تعود قريبًا جدًا', key: '1', className: 'hover:border-danger/50 hover:bg-danger-soft' },
  { value: 2, label: 'صعب', hint: 'فاصل أقصر', key: '2', className: 'hover:border-warning/50 hover:bg-warning-soft' },
  { value: 3, label: 'جيد', hint: 'فاصل متوسط', key: '3', className: 'hover:border-primary/50 hover:bg-primary-soft' },
  { value: 4, label: 'سهل', hint: 'فاصل أطول', key: '4', className: 'hover:border-success/50 hover:bg-success-soft' },
];

function RevisionSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4" role="status" aria-label="جارٍ تجهيز جلسة المراجعة">
      <Skeleton className="h-3 w-36" />
      <div className="card p-6">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="mx-auto mt-12 h-6 w-3/4" />
        <Skeleton className="mx-auto mt-3 h-6 w-1/2" />
        <Skeleton className="mt-12 h-12 w-full rounded-xl" />
      </div>
      <span className="sr-only">جارٍ تجهيز البطاقات…</span>
    </div>
  );
}

export default function Revision() {
  const [searchParams] = useSearchParams();
  const subject = searchParams.get('subject') ?? undefined;
  const { canStudy, subscription } = useStudyAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.revisionQueue(subject),
    queryFn: () =>
      api<RevisionQueueResponse>(
        `/revision/queue?limit=30${subject ? `&subject=${encodeURIComponent(subject)}` : ''}`,
      ),
    staleTime: 0,
  });

  const [session, setSession] = useState<SessionState | null>(null);
  const [showHint, setShowHint] = useState(false);
  const previousSubject = useRef(subject);

  useEffect(() => {
    if (previousSubject.current !== subject) {
      previousSubject.current = subject;
      setSession(null);
      setShowHint(false);
    }
  }, [subject]);

  useEffect(() => {
    if (query.data && session === null) {
      setSession(createSession(query.data.cards));
    }
  }, [query.data, session]);

  const invalidateStats = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: queryKeys.analytics });
    void queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
    void queryClient.invalidateQueries({ queryKey: ['subject'] });
  }, [queryClient]);

  const reviewMutation = useMutation({
    mutationFn: (input: { cardId: string; rating: Rating }) =>
      api<ReviewResult>('/revision/review', {
        method: 'POST',
        body: input,
      }),
    onSuccess: (result, variables) => {
      setSession((previous) => {
        if (!previous) return previous;
        const current = previous.cards[previous.index];
        if (!current || current.id !== variables.cardId) return previous;
        const ratings = {
          ...previous.ratings,
          [variables.rating]: previous.ratings[variables.rating] + 1,
        };
        if (variables.rating === 1) {
          const cards = [...previous.cards];
          const [moved] = cards.splice(previous.index, 1);
          if (moved) cards.push(moved);
          return {
            ...previous,
            cards,
            reviewed: previous.reviewed + 1,
            ratings,
            revealed: false,
            lastRemaining: result.remainingDue,
          };
        }
        return {
          ...previous,
          index: previous.index + 1,
          reviewed: previous.reviewed + 1,
          ratings,
          revealed: false,
          lastRemaining: result.remainingDue,
        };
      });
      setShowHint(false);
      invalidateStats();
    },
    onError: (error) => {
      toast({
        title: 'تعذّر حفظ المراجعة',
        description: error instanceof ApiError ? error.message : 'تحقّق من اتصالك ثم حاول مجددًا.',
        variant: 'error',
      });
    },
  });

  const currentCard = session && session.index < session.cards.length ? session.cards[session.index] : null;
  const finished = Boolean(session && session.cards.length > 0 && session.index >= session.cards.length);

  const reveal = useCallback(() => {
    setSession((previous) => (previous ? { ...previous, revealed: true } : previous));
  }, []);

  const rate = useCallback(
    (rating: Rating) => {
      if (!currentCard || !session?.revealed || reviewMutation.isPending || !canStudy) return;
      reviewMutation.mutate({ cardId: currentCard.id, rating });
    },
    [canStudy, currentCard, reviewMutation, session?.revealed],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) {
        return;
      }
      if (!session || finished || reviewMutation.isPending || !canStudy) return;

      if ((event.code === 'Space' || event.key === 'Enter') && !session.revealed) {
        if (target?.tagName === 'BUTTON') return; // native activation already handles it
        event.preventDefault();
        reveal();
        return;
      }
      if (!session.revealed) return;
      const map: Record<string, Rating> = {
        Digit1: 1,
        Digit2: 2,
        Digit3: 3,
        Digit4: 4,
        Numpad1: 1,
        Numpad2: 2,
        Numpad3: 3,
        Numpad4: 4,
      };
      const rating = map[event.code];
      if (rating) {
        event.preventDefault();
        rate(rating);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canStudy, finished, rate, reveal, reviewMutation.isPending, session]);

  const restartSession = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.revisionQueue(subject) });
    const result = await query.refetch();
    setSession(result.data ? createSession(result.data.cards) : null);
    setShowHint(false);
  };

  if (query.isLoading) return <RevisionSkeleton />;
  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <QueryError error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  const data = query.data;
  const sessionTotal = session?.cards.length ?? data.cards.length;
  const progress = session && sessionTotal > 0 ? (Math.min(session.index, sessionTotal) / sessionTotal) * 100 : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link to="/app/dashboard" className="btn btn-ghost btn-sm -ms-2 gap-1.5">
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            لوحة التحكم
          </Link>
          {data.subjectName ? <Chip variant="primary">{data.subjectName}</Chip> : <Chip>كل المواد</Chip>}
        </div>
        <div className="flex items-center gap-2 text-[10.5px] text-muted">
          <span className="flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            راجعت اليوم {formatNumber(data.reviewedToday)}
          </span>
          <span>·</span>
          <span>{pluralCards(data.dueNow)} مستحقة</span>
        </div>
      </div>

      <StudyAccessNotice />

      {!canStudy ? (
        <div className="card mt-3 p-6">
          <EmptyState
            icon={LockKeyhole}
            title="لا يمكن بدء جلسة جديدة الآن"
            description={
              subscription?.access === 'expired'
                ? 'انتهت التجربة المجانية. بطاقاتك ومحفوظاتك بأمان، وتستطيع الاطلاع عليها من صفحة المواد في أي وقت. الاشتراكات غير مُفعّلة بعد.'
                : 'ابدأ تجربتك المجانية أولًا لتسجيل مراجعاتك.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/app/plans" className="btn btn-primary btn-sm">حالة الاشتراك</Link>
                <Link to="/app/subjects" className="btn btn-secondary btn-sm">تصفّح المواد</Link>
              </div>
            }
          />
        </div>
      ) : finished && session ? (
        <div className="card overflow-hidden">
          <div className="border-b border-line bg-primary-soft/40 px-6 py-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-primary shadow-card">
              <Trophy className="h-6 w-6" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <h1 className="mt-4 font-display text-[22px] font-semibold text-ink">أنجزت الجلسة. أحسنت.</h1>
            <p className="mt-1.5 text-[12px] text-muted">
              حُفظت كل تقييماتك في حسابك، وجُدولت البطاقات لمراجعتها القادمة تلقائيًا.
            </p>
            <p className="mt-2 text-[11px] font-medium text-primary">
              {session.lastRemaining && session.lastRemaining > 0
                ? `${pluralCards(session.lastRemaining)} ما تزال مجدولة للمراجعة اليوم.`
                : 'أُعيدت جدولة بطاقاتك حسب تقييمك، وستظهر المستحقة في الجلسة القادمة.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {[
              { label: 'تقييمات', value: session.reviewed, tone: 'text-ink' },
              { label: 'أعد', value: session.ratings[1], tone: 'text-danger' },
              { label: 'صعب', value: session.ratings[2], tone: 'text-warning' },
              { label: 'جيد / سهل', value: session.ratings[3] + session.ratings[4], tone: 'text-success' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface px-3 py-4 text-center">
                <p className="text-[9.5px] text-muted">{stat.label}</p>
                <p className={cn('mt-1 font-display text-[20px] font-semibold tabular-nums', stat.tone)}>
                  {formatNumber(stat.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2 p-5">
            <Button onClick={() => void restartSession()} icon={<RotateCcw className="h-4 w-4" />}>
              جلسة جديدة
            </Button>
            <Link to="/app/dashboard" className="btn btn-secondary">لوحة التحكم</Link>
            <Link to="/app/subjects" className="btn btn-ghost">المواد</Link>
          </div>
        </div>
      ) : data.cards.length === 0 ? (
        <div className="card mt-3">
          <EmptyState
            icon={CircleCheck}
            title="لا توجد بطاقات مستحقة الآن"
            description={
              data.nextDueAt
                ? `أقرب موعد مراجعة: ${formatDate(data.nextDueAt, 'short')} (${dueLabel(data.nextDueAt)}). ${pluralCards(data.newCards)} جديدة في انتظارك.`
                : 'راجعت كل البطاقات المتاحة. أضف تقدّمك عبر تمارين وامتحانات ثم عد للمراجعة.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/app/subjects" className="btn btn-secondary btn-sm">تصفّح المواد</Link>
                <Link to="/app/exams" className="btn btn-ghost btn-sm">مواضيع الامتحانات</Link>
              </div>
            }
          />
        </div>
      ) : currentCard && session ? (
        <>
          <div className="mb-3 flex items-center gap-3">
            <ProgressBar value={progress} size="sm" className="flex-1" label="تقدّم الجلسة" />
            <span className="shrink-0 text-[10.5px] font-medium tabular-nums text-muted">
              {formatNumber(Math.min(session.index + 1, session.cards.length))} / {formatNumber(session.cards.length)}
            </span>
          </div>

          <article
            key={currentCard.id + String(session.index)}
            className="card animate-fade-in overflow-hidden"
            aria-labelledby="card-front"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2/50 px-5 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="chip !border-transparent"
                  style={{
                    backgroundColor: `${currentCard.subject.color}14`,
                    color: currentCard.subject.color,
                  }}
                >
                  {currentCard.subject.name}
                </span>
                {currentCard.unitTitle ? <Chip>{currentCard.unitTitle}</Chip> : null}
                <Chip variant={currentCard.isNew ? 'gold' : 'primary'}>
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {currentCard.isNew ? 'جديدة' : `مراجعة · ${dueLabel(currentCard.dueAt)}`}
                </Chip>
              </div>
              <span className="text-[10px] text-subtle">
                {currentCard.isNew ? 'أول مراجعة' : `أُعيدت ${formatNumber(currentCard.repetitions)} مرة`}
              </span>
            </div>

            <div className="px-5 py-8 sm:px-8 sm:py-10">
              <p className="mb-3 text-center text-[10px] font-medium tracking-wide text-subtle">السؤال</p>
              <h1
                id="card-front"
                className="text-balance text-center font-display text-[20px] font-semibold leading-[1.7] text-ink sm:text-[24px]"
              >
                {currentCard.front}
              </h1>

              {currentCard.hint ? (
                <div className="mt-5 text-center">
                  {showHint ? (
                    <p className="mx-auto max-w-md rounded-lg bg-warning-soft px-3 py-2 text-[11px] text-warning">
                      <Lightbulb className="me-1 inline h-3.5 w-3.5" aria-hidden="true" />
                      {currentCard.hint}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowHint(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
                    >
                      <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                      أظهر تلميحًا
                    </button>
                  )}
                </div>
              ) : null}

              <div className="my-7 h-px bg-line" aria-hidden="true" />

              {!session.revealed ? (
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={reveal}
                    className="btn btn-primary btn-lg min-w-[13rem]"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    أظهر الإجابة
                  </button>
                  <p className="text-[10px] text-subtle">
                    أو اضغط <span className="kbd">Space</span>
                  </p>
                </div>
              ) : (
                <div className="animate-fade-up">
                  <p className="mb-2 text-center text-[10px] font-medium tracking-wide text-subtle">الإجابة</p>
                  <p className="text-pretty text-center text-[14px] leading-[1.95] text-ink sm:text-[15px]">
                    {currentCard.back}
                  </p>

                  <div className="mt-7">
                    <p className="mb-2.5 text-center text-[10px] text-subtle">
                      كيف كانت استجابتك؟ يُستخدم تقييمك لجدولة المراجعة القادمة.
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="تقييم الاستجابة">
                      {ratingConfig.map((rating) => (
                        <button
                          key={rating.value}
                          type="button"
                          onClick={() => rate(rating.value)}
                          disabled={reviewMutation.isPending}
                          className={cn(
                            'rounded-xl border border-line bg-surface px-2 py-3 text-center transition disabled:cursor-not-allowed disabled:opacity-60',
                            rating.className,
                          )}
                        >
                          <span className="block text-[12px] font-semibold text-ink">{rating.label}</span>
                          <span className="mt-0.5 block text-[9px] text-muted">{rating.hint}</span>
                          <span className="mt-1 block text-[8.5px] text-subtle">
                            <span className="kbd !min-w-[1.2rem] !px-1 !text-[9px]">{rating.key}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </article>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-subtle">
            <p className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" aria-hidden="true" />
              جدولة على الخادم · تبقى مراجعاتك بعد إغلاق المتصفح
            </p>
            <button
              type="button"
              onClick={() => void restartSession()}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              إعادة تهيئة الجلسة
            </button>
          </div>
        </>
      ) : (
        <div className="card">
          <EmptyState icon={Check} title="جلسة المراجعة جاهزة" description="جارٍ تجهيز البطاقات…" compact />
        </div>
      )}

      {canStudy && !finished && data.totalCards > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[10px] text-subtle">
          <Link to="/app/analytics" className="inline-flex items-center gap-1 hover:text-primary">
            تقدّمك
            <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          </Link>
          <span aria-hidden="true">·</span>
          <Link to={`/app/subjects${subject ? `/${subject}` : ''}`} className="inline-flex items-center gap-1 hover:text-primary">
            تفاصيل المادة
          </Link>
        </div>
      ) : null}
    </div>
  );
}
