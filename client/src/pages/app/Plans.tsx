import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CreditCard,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SubscriptionInfo } from '@shared/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { subscriptionStatusLabels } from '@/lib/labels';
import { cn, formatDate, pluralDays } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { ProgressBar } from '@/components/ui/Progress';
import { Chip } from '@/components/ui/Badge';

interface PublicConfig {
  paymentsConfigured: boolean;
  supportEmail: string;
  trialDays: number;
}

const intendedPlans = [
  {
    name: 'خطة الطالب',
    period: 'اشتراك شهري',
    description: 'لمراجعة منتظمة خلال السنة الدراسية، مع إمكانية الإلغاء.',
    features: ['كل المواد والامتحانات', 'مراجعة البطاقات الذكية', 'التحليلات وخطة اليوم', 'دعم عبر البريد'],
  },
  {
    name: 'خطة البكالوريا',
    period: 'اشتراك سنوي',
    description: 'لتغطية كامل السنة الدراسية حتى امتحان البكالوريا.',
    features: ['كل مزايا خطة الطالب', 'أولوية في الدعم', 'حفظ غير محدود للتقدّم', 'أسعار سنوية عند الإطلاق'],
    highlight: true,
  },
];

function StatusPanel({ subscription }: { subscription: SubscriptionInfo }) {
  const isTrial = subscription.access === 'trial';
  const isExpired = subscription.access === 'expired';
  const isPaid = subscription.access === 'paid';

  return (
    <section className="card overflow-hidden">
      <div className={cn('p-5 sm:p-6', isTrial ? 'bg-primary-soft/35' : isExpired ? 'bg-warning-soft/40' : 'bg-success-soft/30')}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Chip variant={isTrial ? 'primary' : isExpired ? 'warning' : 'success'}>
              {subscriptionStatusLabels[subscription.status]}
            </Chip>
            <h2 className="mt-3 font-display text-[22px] font-semibold text-ink">
              {isTrial
                ? `${pluralDays(subscription.daysRemaining ?? 0)} متبقية من تجربتك`
                : isExpired
                  ? 'بياناتك محفوظة — التجربة انتهت'
                  : isPaid
                    ? 'اشتراكك نشط'
                    : 'لا يوجد اشتراك نشط'}
            </h2>
            <p className="mt-1.5 max-w-xl text-[11.5px] leading-relaxed text-muted">
              {isTrial
                ? 'تجربة واحدة لكل حساب، محسوبة على الخادم. ستُعلَم قبل الانتهاء دون مقاطعة جلستك الدراسية.'
                : isExpired
                  ? 'توقف تسجيل التقدّم الجديد، لكن كل ما أنجزته يمكنك الاطلاع عليه وتصديره. لا توجد مدفوعات أو خصومات.'
                  : isPaid
                    ? `اشتراك مؤكَّد${subscription.subscriptionProvider ? ` عبر ${subscription.subscriptionProvider}` : ''}.`
                    : 'ابدأ التجربة المجانية للوصول الكامل إلى المزايا.'}
            </p>
          </div>
          <div className="text-end text-[10px] text-muted">
            <p>حالة الاشتراك</p>
            <p className="mt-0.5 font-medium text-ink">من الخادم مباشرة</p>
          </div>
        </div>

        {isTrial ? (
          <ProgressBar
            value={((subscription.daysRemaining ?? 0) / 30) * 100}
            className="mt-5"
            label="المتبقي من التجربة"
          />
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-4">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-muted">
            {subscription.trialStartedAt ? (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                بدأت {formatDate(subscription.trialStartedAt, 'short')}
              </span>
            ) : null}
            {subscription.trialEndsAt ? (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                تنتهي {formatDate(subscription.trialEndsAt, 'long')}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {subscription.status === 'not_started' ? (
              <Link to="/app/trial" className="btn btn-primary btn-sm">ابدأ التجربة المجانية</Link>
            ) : (
              <Link to="/app/dashboard" className="btn btn-secondary btn-sm">
                متابعة الدراسة
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Plans() {
  const { me } = useAuth();
  const { data: config } = useQuery({
    queryKey: ['public-config'],
    queryFn: () => api<PublicConfig>('/public-config'),
    staleTime: 5 * 60_000,
  });

  if (!me) return null;
  const supportEmail = config?.supportEmail ?? 'support@bactrack.dz';
  const paymentsConfigured = config?.paymentsConfigured ?? me.subscription.paymentsConfigured;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
            <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
            الاشتراك والتجربة
          </span>
        }
        title="حالة اشتراكك والباقات"
        description="شفافية كاملة: التجربة المجانية تعمل بالكامل، والاشتراك المدفوع لن يُطلب منك قبل تفعيل الدفع والإعلان عن الأسعار."
      />

      <div className="space-y-4">
        <StatusPanel subscription={me.subscription} />

        <div className={cn('alert', paymentsConfigured ? 'alert-warning' : 'alert-info')} role="note">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              {paymentsConfigured
                ? 'مزوّد الدفع مُعدّ على الخادم، لكن الشراء من الواجهة غير مُفعّل بعد.'
                : 'لا توجد وسيلة دفع مُفعّلة في هذه النسخة.'}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed">
              {paymentsConfigured
                ? 'لإتمام اشتراكك، تواصل مع الدعم وسيتم التحقق من الدفع على الخادم قبل تفعيل حالة الاشتراك. لا تُقبل أي حالة دفع من المتصفح.'
                : 'لن نطلب منك بطاقة بنكية، ولن نخبرك بوجود خطة مدفوعة قبل تهيئتها. التجربة المجانية لمدة 30 يومًا هي الطريقة الكاملة لاستخدام المنصة اليوم.'}{' '}
              <a href={`mailto:${supportEmail}?subject=BacTrack%20DZ%20—%20الاشتراك`} className="font-semibold underline underline-offset-2">
                راسل الدعم
              </a>
              .
            </p>
          </div>
        </div>

        <SectionCard
          title="الباقات المزمعة"
          subtitle="نعرض شكل الباقات بشفافية، دون أسعار أو أزرار شراء قبل تفعيل الدفع"
          icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {intendedPlans.map((plan) => (
              <article
                key={plan.name}
                className={cn(
                  'relative rounded-xl border p-4',
                  plan.highlight ? 'border-primary/30 bg-primary-soft/25' : 'border-line bg-surface',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[14px] font-semibold text-ink">{plan.name}</h3>
                    <p className="mt-0.5 text-[10px] text-muted">{plan.period}</p>
                  </div>
                  <Chip variant={plan.highlight ? 'primary' : 'default'}>قريبًا</Chip>
                </div>
                <p className="mt-2 text-[10.5px] leading-relaxed text-muted">{plan.description}</p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-1.5 text-[10.5px] text-muted">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-lg border border-dashed border-line-strong px-3 py-2 text-center">
                  <p className="text-[10px] font-medium text-muted">الاشتراك غير متاح للشراء حاليًا</p>
                  <p className="mt-0.5 text-[9px] text-subtle">يُعلن السعر عند تفعيل الدفع</p>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-subtle">
            هذه معاينة للباقات المزمعة وليست عرضًا تجاريًا. لا تتم أي معالجة دفع، ولا تُحفظ أي بيانات
            بطاقات في المنصة.
          </p>
        </SectionCard>

        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard title="ماذا يحدث عند انتهاء التجربة؟" icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}>
            <ul className="space-y-2">
              {[
                'يبقى حسابك وكل بياناتك الأكاديمية محفوظًا.',
                'يمكنك تصفّح المواد ونتائج الامتحانات وسجل المراجعة.',
                'يتوقف تسجيل تقدّم جديد مؤقتًا لحماية مزايا الاشتراك.',
                'لا يتم خصم أي مبلغ، ولا توجد وسيلة دفع مُفعّلة.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[10.5px] leading-relaxed text-muted">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="كيف ستُحمى المدفوعات مستقبلًا؟" icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}>
            <p className="text-[10.5px] leading-relaxed text-muted">
              عند إضافة مزوّد دفع، لن تُقرأ حالة الاشتراك من المتصفح. سيتم التحقق من الدفع عبر webhook
              موقّع على الخادم، ثم تفعيل الحالة في قاعدة البيانات بمرجع دفع حقيقي.
            </p>
            <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
              حتى ذلك الحين، تبقى المنصة صريحة: لا اشتراك مدفوع، ولا تحصيل.
            </p>
            <a href={`mailto:${supportEmail}`} className="btn btn-secondary btn-sm mt-3" dir="ltr">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {supportEmail}
            </a>
          </SectionCard>
        </div>

        <div className="rounded-xl border border-line bg-surface-2/50 px-5 py-4">
          <p className="text-[10.5px] leading-relaxed text-muted">
            هل لديك سؤال عن التجربة أو بياناتك؟{' '}
            <Link to="/app/settings" className="link font-medium">اذهب إلى الإعدادات</Link>{' '}
            لتصدير بياناتك أو إدارة جلستك، أو{' '}
            <a href={`mailto:${supportEmail}`} className="link font-medium">راسل الدعم</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
