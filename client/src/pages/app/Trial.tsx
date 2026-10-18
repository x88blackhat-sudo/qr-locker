import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { MeResponse, SubscriptionInfo } from '@shared/types';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { queryKeys } from '@/lib/query';
import { cn, formatDate, pluralDays } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Progress';
import { Chip } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

const benefits = [
  'كل المواد التسع مع وحداتها وتمارينها',
  'تتبّع مواضيع البكالوريا والدورات',
  'مراجعة ذكية بجدولة تلقائية للبطاقات',
  'خطة يومية وتقدّم محسوب من بياناتك',
  'تحليلات مفصّلة وسجل نشاط',
  'مظهر فاتح وداكن وواجهة عربية كاملة',
];

function TrialRules() {
  return (
    <ol className="space-y-3">
      {[
        { title: 'تجربة واحدة لكل حساب', text: 'مرتبطة بحسابك على الخادم، ولا تُصفّر بمسح المتصفح أو تغيير الجهاز.' },
        { title: '30 يومًا كاملة', text: 'تبدأ فور ضغطك على الزر، وتنتهي تلقائيًا بعد 30 يومًا بالضبط.' },
        { title: 'بدون أي وسيلة دفع', text: 'لا نطلب بطاقة بنكية ولا نعالج أي مبلغ في هذه النسخة.' },
        { title: 'بياناتك تبقى لك', text: 'عند انتهاء التجربة لا نحذف أي نتيجة أو بطاقة أو سجل مراجعة.' },
      ].map((rule, index) => (
        <li key={rule.title} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary-strong">
            {index + 1}
          </span>
          <div>
            <p className="text-[12px] font-medium text-ink">{rule.title}</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{rule.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function StatusTimeline({ subscription }: { subscription: SubscriptionInfo }) {
  return (
    <dl className="space-y-2.5 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <dt className="flex items-center gap-1.5 text-muted">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          تاريخ البدء
        </dt>
        <dd className="font-medium text-ink">
          {subscription.trialStartedAt ? formatDate(subscription.trialStartedAt, 'long') : '—'}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-2">
        <dt className="flex items-center gap-1.5 text-muted">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          تاريخ الانتهاء
        </dt>
        <dd className="font-medium text-ink">
          {subscription.trialEndsAt ? formatDate(subscription.trialEndsAt, 'long') : '—'}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-2">
        <dt className="text-muted">طريقة الاحتساب</dt>
        <dd className="font-medium text-ink">30 يومًا من وقت التفعيل</dd>
      </div>
    </dl>
  );
}

export default function Trial() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const subscription = me?.subscription;

  const startMutation = useMutation({
    mutationFn: async () => {
      const result = await api<{ subscription: SubscriptionInfo }>('/trial/start', {
        method: 'POST',
        body: {},
      });
      queryClient.setQueryData<MeResponse>(queryKeys.me, (current) =>
        current ? { ...current, subscription: result.subscription } : current,
      );
      return result.subscription;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast({
        title: 'بدأت تجربتك المجانية',
        description: 'كل المزايا متاحة الآن لمدة 30 يومًا. خطتك اليومية جاهزة.',
        variant: 'success',
      });
      navigate('/app/dashboard', { replace: true });
    },
    onError: (error) => {
      toast({
        title: 'تعذّر بدء التجربة',
        description: error instanceof ApiError ? error.message : 'يرجى المحاولة مجددًا.',
        variant: 'error',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });

  if (!subscription) return null;

  if (subscription.status === 'not_started') {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card overflow-hidden">
          <div className="panel-dark relative overflow-hidden p-6 sm:p-9">
            <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative">
              <span className="chip border-white/15 bg-white/5 text-[#C8A96A]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                حسابك جاهز · 30 يومًا مجانًا
              </span>
              <h1 className="mt-5 text-balance font-display text-[24px] font-semibold leading-[1.55] text-white sm:text-[30px]">
                ابدأ رحلتك نحو البكالوريا — جرّب BacTrack DZ مجانًا لمدة 30 يومًا.
              </h1>
              <p className="mt-3 max-w-xl text-[12.5px] leading-[1.9] text-[rgb(166,186,187)]">
                تجربة كاملة الوظائف، بلا بطاقة بنكية وبلا التزام. تُفعّل التجربة مرة واحدة على حسابك،
                وتبقى بياناتك محفوظة حتى بعد انتهائها.
              </p>
              <Button
                variant="gold"
                size="lg"
                className="mt-6"
                loading={startMutation.isPending}
                onClick={() => startMutation.mutate()}
                icon={<Sparkles className="h-4 w-4" />}
              >
                ابدأ التجربة المجانية
              </Button>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[rgb(150,173,175)]">
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-[#5ED7C8]" aria-hidden="true" />
                  بدون بطاقة بنكية
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-[#5ED7C8]" aria-hidden="true" />
                  بيانات محفوظة دائمًا
                </span>
                <span className="flex items-center gap-1">
                  <LockKeyhole className="h-3 w-3 text-[#5ED7C8]" aria-hidden="true" />
                  لا خصم تلقائي
                </span>
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <h2 className="text-[13px] font-semibold text-ink">كيف تعمل التجربة؟</h2>
              <div className="mt-3">
                <TrialRules />
              </div>
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-ink">ماذا يتوفر لك؟</h2>
              <ul className="mt-3 space-y-2">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-2/40 px-5 py-3">
            <p className="text-[10px] leading-relaxed text-muted">
              معالجة الدفع غير مُفعّلة حاليًا — لن يُطلب منك أي مبلغ الآن أو بعد انتهاء التجربة.
            </p>
            <Link to="/app/plans" className="text-[10.5px] font-medium text-primary hover:underline">
              تفاصيل الاشتراك
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isTrial = subscription.access === 'trial';
  const isExpired = subscription.access === 'expired';
  const isPaid = subscription.access === 'paid';

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            حالة حسابك
          </span>
        }
        title={isTrial ? 'تجربتك المجانية نشطة' : isPaid ? 'اشتراكك نشط' : 'انتهت فترة التجربة'}
        description={
          isTrial
            ? 'كل المزايا متاحة. لا تحتاج إلى أي إجراء أثناء التجربة، وسنذكّرك بلطف قبل الانتهاء.'
            : isPaid
              ? 'شكرًا لثقتك في BacTrack DZ. يمكنك متابعة الدراسة كالمعتاد.'
              : 'بياناتك ونتائجك محفوظة بالكامل، ويمكنك الاطلاع عليها في أي وقت.'
        }
      />

      <div className="space-y-4">
        <section className={cn('card overflow-hidden', isExpired && 'border-warning/30')}>
          <div className={cn('p-5 sm:p-6', isTrial ? 'bg-primary-soft/35' : isExpired ? 'bg-warning-soft/40' : 'bg-success-soft/30')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Chip variant={isTrial ? 'primary' : isExpired ? 'warning' : 'success'}>
                  {isTrial ? 'تجربة مجانية' : isExpired ? 'منتهية' : 'مدفوع'}
                </Chip>
                <p className="mt-3 font-display text-[30px] font-semibold leading-none text-ink">
                  {isTrial ? pluralDays(subscription.daysRemaining ?? 0) : isPaid ? 'نشط' : '0 أيام'}
                </p>
                <p className="mt-1.5 text-[11.5px] text-muted">
                  {isTrial
                    ? 'متبقية من أصل 30 يومًا'
                    : isExpired
                      ? 'انتهت تجربتك المجانية. لا يمكن تسجيل تقدّم جديد حاليًا.'
                      : 'اشتراك مدفوع مؤكَّد من مزوّد الدفع.'}
                </p>
              </div>
              <div className="text-end text-[10px] text-muted">
                <p>آخر تحديث للحالة</p>
                <p className="mt-0.5 font-medium text-ink">تلقائي من الخادم</p>
              </div>
            </div>

            {isTrial ? (
              <ProgressBar
                value={((subscription.daysRemaining ?? 0) / 30) * 100}
                className="mt-5"
                label="المتبقي من التجربة"
              />
            ) : null}

            <div className="mt-5 grid gap-4 border-t border-line/70 pt-4 sm:grid-cols-2">
              <StatusTimeline subscription={subscription} />
              <div className="flex flex-col gap-2 sm:items-end sm:justify-center">
                {isTrial ? (
                  <Link to="/app/dashboard" className="btn btn-primary btn-sm">
                    متابعة الدراسة
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ) : isExpired ? (
                  <>
                    <Link to="/app/plans" className="btn btn-primary btn-sm">خيارات الاشتراك</Link>
                    <Link to="/app/dashboard" className="btn btn-secondary btn-sm">الاطلاع على بياناتي</Link>
                  </>
                ) : (
                  <Link to="/app/dashboard" className="btn btn-primary btn-sm">متابعة الدراسة</Link>
                )}
                <Link to="/app/plans" className="text-[10.5px] font-medium text-muted hover:text-primary">
                  عرض تفاصيل الباقات
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <h2 className="text-[12px] font-semibold text-ink">
                {isExpired ? 'ماذا يعني انتهاء التجربة؟' : 'ماذا يحدث عند الانتهاء؟'}
              </h2>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
                {isExpired
                  ? 'يبقى حسابك وكل بياناتك محفوظًا. تتوقف إمكانية تسجيل تقدّم جديد، لكن يمكنك تصفّح المواد ونتائجك ومراجعة سجلك. الاشتراكات غير مُفعّلة بعد.'
                  : 'لن نخفي عنك أي رسوم: لا توجد وسيلة دفع مُفعّلة. عند انتهاء التجربة تبقى بياناتك، ويمكنك متابعة الاطلاع عليها.'}
              </p>
            </div>
            <div>
              <h2 className="text-[12px] font-semibold text-ink">بياناتك</h2>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
                الامتحانات المنجزة، تقدّم التمارين، سجل البطاقات، وخطتك اليومية — كلها محفوظة في حسابك
                ولا تُحذف عند انتهاء التجربة.
              </p>
              <Link to="/app/settings" className="link mt-2 inline-flex text-[10.5px]">
                تصدير نسخة من بياناتك
              </Link>
            </div>
          </div>
        </section>

        <div className="alert alert-info" role="note">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">حماية التجربة على مستوى الخادم</p>
            <p className="mt-0.5 text-[11px] leading-relaxed">
              التجربة مرتبطة بحسابك وموثّقة بتواريخ يكتبها الخادم فقط. لا يمكن تعديلها من المتصفح، ولا
              تتجدّد عند تسجيل الخروج أو تبديل الجهاز.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
