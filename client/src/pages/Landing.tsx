import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Brain,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  ClipboardCheck,
  GraduationCap,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { DashboardPreview } from '@/components/marketing/DashboardPreview';
import { SiteFooter, SiteHeader } from '@/components/marketing/SiteChrome';
import { ActivityAreaChart } from '@/components/charts/Charts';
import { ProgressBar } from '@/components/ui/Progress';
import type { WeeklyPoint } from '@shared/types';

interface PublicConfig {
  paymentsConfigured: boolean;
  supportEmail: string;
  trialDays: number;
}

const demoActivity: WeeklyPoint[] = [
  { date: '1', label: 'الاثنين', minutes: 30, cards: 10, isToday: false },
  { date: '2', label: 'الثلاثاء', minutes: 55, cards: 18, isToday: false },
  { date: '3', label: 'الأربعاء', minutes: 40, cards: 12, isToday: false },
  { date: '4', label: 'الخميس', minutes: 75, cards: 24, isToday: false },
  { date: '5', label: 'الجمعة', minutes: 48, cards: 15, isToday: false },
  { date: '6', label: 'السبت', minutes: 90, cards: 27, isToday: false },
  { date: '7', label: 'الأحد', minutes: 68, cards: 19, isToday: true },
];

const subjects = [
  { name: 'الرياضيات', color: '#2F5BEA' },
  { name: 'الفيزياء', color: '#7A4AD6' },
  { name: 'علوم الطبيعة والحياة', color: '#178A63' },
  { name: 'اللغة العربية', color: '#B07730' },
  { name: 'اللغة الفرنسية', color: '#C0476E' },
  { name: 'اللغة الإنجليزية', color: '#3E6FA8' },
  { name: 'الفلسفة', color: '#7B5A44' },
  { name: 'التاريخ والجغرافيا', color: '#8A6A34' },
  { name: 'العلوم الإسلامية', color: '#2C7A6B' },
];

const features = [
  {
    icon: ClipboardCheck,
    title: 'كل امتحان في مكانه',
    description:
      'تصفّح مواضيع البكالوريا حسب المادة والسنة والدورة، وعلّم كل موضوع أنجزته ليُحسب تلقائيًا في تقدّمك.',
  },
  {
    icon: Brain,
    title: 'مراجعة ذكية، لا عشوائية',
    description:
      'بطاقات مراجعة مرتبطة بوحدات المنهاج، مع جدولة تلقائية للبطاقات حسب تقييمك لها: أعد، صعب، جيد، سهل.',
  },
  {
    icon: ChartNoAxesColumn,
    title: 'تقدّم حقيقي، لا أرقام تجميلية',
    description:
      'كل نسبة في لوحتك محسوبة من بياناتك المحفوظة: امتحاناتك، تمارينك، وبطاقاتك. لا شيء يُعرض من أجل الديكور.',
  },
];

const steps = [
  {
    title: 'أنشئ حسابك',
    description: 'بريد إلكتروني وكلمة مرور فقط. دون بطاقة بنكية أو التزام.',
  },
  {
    title: 'ابدأ التجربة المجانية',
    description: '30 يومًا بكامل المزايا، تُفعّل بضغطة واحدة وتُحفظ في حسابك.',
  },
  {
    title: 'تابع خطتك اليومية',
    description: 'خطة تتجدّد كل صباح: بطاقات مستحقة، تمرين، وموضوع امتحان.',
  },
];

const faqs = [
  {
    question: 'هل أحتاج بطاقة بنكية لبدء التجربة؟',
    answer:
      'لا. التجربة المجانية لمدة 30 يومًا تُفعّل دون أي وسيلة دفع. لا نطلب منك أي معلومات بنكية في أي مرحلة.',
  },
  {
    question: 'ماذا يحدث لبياناتي بعد انتهاء التجربة؟',
    answer:
      'تبقى جميع بياناتك محفوظة: نتائج الامتحانات، تقدّم التمارين، وسجل المراجعة. يمكنك دائمًا الاطلاع عليها، ولن نحذف شيئًا.',
  },
  {
    question: 'هل يمكنني الحصول على تجربة جديدة بحساب آخر؟',
    answer:
      'كل حساب يحصل على تجربة واحدة فقط، مرتبطة به على مستوى الخادم. هذه القاعدة تحمي المنصة من إساءة استعمال الفترات المجانية.',
  },
  {
    question: 'هل يمكنني الاشتراك المدفوع الآن؟',
    answer:
      'لا. معالجة الدفع غير مُفعّلة على النسخة الحالية. عند تفعيلها سنعرض الباقات والأسعار بوضوح قبل أي عملية دفع، ولن نخفي أي رسوم.',
  },
  {
    question: 'هل يعمل BacTrack DZ على الهاتف؟',
    answer:
      'نعم. الواجهة مصمّمة أصلًا للعربية ومهيّأة للهواتف والحواسيب اللوحية، مع وضعين فاتح وداكن مريحين للمراجعة الطويلة.',
  },
];

function FeatureVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface-2/60 p-3">
        <div className="space-y-2">
          {[
            { label: 'دورة 2025 · عادية', done: true },
            { label: 'دورة 2024 · استدراك', done: true },
            { label: 'بكالوريا بيضاء 2026', done: false },
          ].map((exam) => (
            <div key={exam.label} className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2">
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                  exam.done ? 'border-primary bg-primary text-white' : 'border-line-strong bg-surface',
                )}
              >
                {exam.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" /> : null}
              </span>
              <span className={cn('text-[11px]', exam.done ? 'text-muted' : 'font-medium text-ink')}>
                {exam.label}
              </span>
              <span className="ms-auto text-[9px] text-subtle">180 د</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="rounded-xl border border-line bg-surface-2/60 p-3">
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <div className="flex items-center justify-between">
            <span className="chip chip-primary !px-2 !py-0.5 !text-[9px]">الفيزياء · الكهرباء</span>
            <span className="text-[9px] text-subtle">12 / 18</span>
          </div>
          <p className="mt-3 text-[12px] font-medium leading-relaxed text-ink">ما هو قانون أوم في الدارات الأومية؟</p>
          <div className="mt-3 rounded-lg bg-primary-soft/70 px-3 py-2 text-[10.5px] text-primary-strong">
            U = R × I — التوتر يساوي المقاومة مضروبة في شدة التيار.
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {['أعد', 'صعب', 'جيد', 'سهل'].map((label, i) => (
              <span
                key={label}
                className={cn(
                  'rounded-md border py-1 text-center text-[9px] font-medium',
                  i === 2
                    ? 'border-primary/25 bg-primary-soft text-primary-strong'
                    : 'border-line bg-surface-2 text-muted',
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-line bg-surface-2/60 p-3">
      <div className="rounded-xl border border-line bg-surface p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10.5px] font-semibold text-ink">نشاطك هذا الأسبوع</p>
          <span className="text-[9px] font-medium text-primary">406 دقيقة</span>
        </div>
        <ActivityAreaChart data={demoActivity} />
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
          {[
            { label: 'الرياضيات', value: 62, color: '#2F5BEA' },
            { label: 'الفيزياء', value: 48, color: '#7A4AD6' },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted">{item.label}</span>
                <span className="tabular-nums text-ink">{item.value}٪</span>
              </div>
              <ProgressBar value={item.value} size="sm" color={item.color} className="mt-1.5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { me } = useAuth();
  const { data: publicConfig } = useQuery({
    queryKey: ['public-config'],
    queryFn: () => api<PublicConfig>('/public-config'),
    staleTime: 5 * 60_000,
  });

  const startHref = me ? '/app/trial' : '/register';
  const supportEmail = publicConfig?.supportEmail ?? 'support@bactrack.dz';

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 soft-grid opacity-40" aria-hidden="true" />
          <div className="marketing-shell grid items-center gap-12 pb-16 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-24 lg:pt-20">
            <div className="animate-fade-up">
              <span className="chip chip-gold">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                منصة المراجعة للبكالوريا الجزائرية
              </span>
              <h1 className="mt-5 text-balance text-[34px] font-semibold leading-[1.3] text-ink sm:text-[44px] lg:text-[50px]">
                طريقك إلى البكالوريا،
                <br className="hidden sm:block" />
                <span className="text-primary">بخطة واضحة كل يوم.</span>
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-[14.5px] leading-[1.9] text-muted sm:text-[15.5px]">
                BacTrack DZ يجمع تتبّع امتحانات البكالوريا، المراجعة الذكية بالبطاقات، وتحليلات تقدّمك
                الحقيقية في مساحة هادئة واحدة. تعرف دائمًا ماذا تراجع الآن — دون فوضى ولا تشتّت.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to={startHref} className="btn btn-primary btn-lg">
                  ابدأ تجربتك المجانية · 30 يومًا
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a href="#preview" className="btn btn-secondary btn-lg">
                  شاهد لوحة التحكم
                </a>
              </div>
              <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-muted">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  بدون بطاقة بنكية
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  تجربة واحدة لكل حساب
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  بياناتك تبقى محفوظة
                </li>
              </ul>
            </div>

            <div id="preview" className="scroll-mt-24 animate-fade-up lg:ps-4">
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* Value band */}
        <section className="border-y border-line bg-surface/60">
          <div className="marketing-shell grid gap-5 py-8 sm:grid-cols-3">
            {[
              { icon: GraduationCap, title: 'منهجية البكالوريا', text: 'شعبة العلوم التجريبية — السنة الثالثة ثانوي' },
              { icon: CalendarDays, title: 'مواضيع على نمط الدورات', text: 'تدريبات مرتبطة بمحاور المراجعة لكل مادة' },
              { icon: LockKeyhole, title: 'حساب خاص وآمن', text: 'بياناتك الدراسية خاصة بك وحدك' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="feature-icon"><item.icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" /></span>
                <div>
                  <p className="text-[12.5px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-24">
          <div className="marketing-shell py-16 lg:py-24">
            <div className="max-w-2xl">
              <span className="section-eyebrow">لماذا BacTrack DZ؟</span>
              <h2 className="mt-3 text-balance text-[28px] font-semibold leading-snug sm:text-[34px]">
                أقل تشتّتًا. أكثر تركيزًا على ما يهم.
              </h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
                صمّمنا كل شاشة حول سؤال واحد: ماذا يحتاج الطالب الآن؟ لا مؤشرات زائدة، ولا بيانات مزيّفة —
                فقط ما يساعدك على إنجاز مراجعة اليوم.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {features.map((feature, index) => (
                <article
                  key={feature.title}
                  className="card card-hover flex flex-col p-5 sm:p-6"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="feature-icon">
                      <feature.icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
                    </span>
                    <h3 className="text-[16px] font-semibold">{feature.title}</h3>
                  </div>
                  <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-muted">{feature.description}</p>
                  <div className="mt-5">
                    <FeatureVisual index={index} />
                    <p className="mt-2 text-center text-[9px] text-subtle">
                      مثال توضيحي — البيانات الفعلية تظهر في حسابك
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works + subjects */}
        <section id="how" className="scroll-mt-24 border-y border-line bg-surface/50">
          <div className="marketing-shell grid gap-12 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:py-24">
            <div>
              <span className="section-eyebrow">كيف يعمل؟</span>
              <h2 className="mt-3 text-balance text-[28px] font-semibold leading-snug sm:text-[34px]">
                ثلاث خطوات، ثم روتين مراجعة يشتغل معك.
              </h2>
              <ol className="mt-8 space-y-5">
                {steps.map((step, index) => (
                  <li key={step.title} className="relative flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary-soft font-display text-[12px] font-semibold text-primary-strong">
                        {index + 1}
                      </span>
                      {index < steps.length - 1 ? <span className="mt-1 h-full w-px bg-line" aria-hidden="true" /> : null}
                    </div>
                    <div className="pb-2">
                      <h3 className="text-[14px] font-semibold text-ink">{step.title}</h3>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link to={startHref} className="btn btn-secondary mt-3">
                ابدأ الآن
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div id="subjects" className="scroll-mt-24">
              <span className="section-eyebrow">المواد</span>
              <h2 className="mt-3 text-balance text-[28px] font-semibold leading-snug sm:text-[34px]">
                منهاج كامل، في مكان واحد.
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                تسع مواد أساسية لشعبة العلوم التجريبية، مع وحداتها، تمارينها، وبطاقات مراجعتها.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {subjects.map((subject) => (
                  <div
                    key={subject.name}
                    className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: subject.color }}
                      aria-hidden="true"
                    />
                    <span className="text-[12px] font-medium text-ink">{subject.name}</span>
                    <Check className="ms-auto h-3.5 w-3.5 text-success/70" aria-hidden="true" />
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-2 text-[11px] text-subtle">
                <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                مواضيع تدريبية على نمط دورات 2021–2025، مع محاور المراجعة لكل موضوع.
              </p>
            </div>
          </div>
        </section>

        {/* Trial / pricing */}
        <section id="trial" className="scroll-mt-24">
          <div className="marketing-shell py-16 lg:py-24">
            <div className="panel-dark relative overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-10 lg:p-12">
              <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
              <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
                <div>
                  <span className="chip border-white/15 bg-white/5 text-[#C8A96A]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    التجربة المجانية · 30 يومًا
                  </span>
                  <h2 className="mt-5 text-balance text-[27px] font-semibold leading-[1.45] text-white sm:text-[33px]">
                    ابدأ رحلتك نحو البكالوريا — جرّب BacTrack DZ مجانًا لمدة 30 يومًا.
                  </h2>
                  <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-[rgb(165,185,186)]">
                    تجربة كاملة الوظائف، مرتبطة بحسابك على مستوى الخادم. لا تُصفّر عند تغيير الجهاز،
                    ولا تحتاج إلى أي وسيلة دفع.
                  </p>

                  <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                    {[
                      'كل المواد التسع كاملة',
                      'بطاقات مراجعة مع جدولة ذكية',
                      'تتبّع جميع مواضيع الامتحانات',
                      'تحليلات تقدّم مفصّلة',
                      'واجهة عربية أصلية RTL',
                      'وضع فاتح وداكن',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-[12px] text-[rgb(214,228,226)]">
                        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#2AACA0]/15 text-[#5ED7C8]">
                          <Check className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Link to={startHref} className="btn btn-gold btn-lg">
                      ابدأ التجربة المجانية
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <span className="text-[11px] text-[rgb(165,185,186)]">
                      بدون بطاقة بنكية · تجربة واحدة لكل حساب
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                  <h3 className="flex items-center gap-2 text-[14px] font-semibold text-white">
                    <CalendarDays className="h-4 w-4 text-[#C8A96A]" aria-hidden="true" />
                    ماذا يحدث بعد الثلاثين يومًا؟
                  </h3>
                  <p className="mt-2.5 text-[12px] leading-relaxed text-[rgb(165,185,186)]">
                    تبقى بياناتك كاملة: امتحاناتك المنجزة، تقدّم تمارينك، وسجل مراجعتك. لن نحذف أي شيء
                    عند انتهاء التجربة.
                  </p>
                  <div className="my-4 h-px bg-white/10" />
                  <h3 className="text-[13px] font-semibold text-white">وضع الاشتراكات اليوم</h3>
                  <p className="mt-2 text-[12px] leading-relaxed text-[rgb(165,185,186)]">
                    معالجة الدفع <span className="font-semibold text-[#E2B97B]">غير مُفعّلة</span> في هذه
                    النسخة. لن نطلب منك أي مبلغ، ولا ندّعي وجود خطة مدفوعة قبل تهيئتها فعليًا.
                  </p>
                  <a
                    href={`mailto:${supportEmail}?subject=BacTrack%20DZ`}
                    className="mt-4 inline-flex items-center gap-2 text-[11.5px] font-medium text-[#8FDBD1] hover:underline"
                  >
                    للاستفسار، تواصل معنا
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Craft / accessibility */}
        <section className="border-y border-line bg-surface/50">
          <div className="marketing-shell grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Brain, title: 'مصمّم للتركيز', text: 'خطوط عربية واضحة ومساحات مريحة للمراجعة الطويلة.' },
              { icon: Moon, title: 'وضع داكن متكامل', text: 'كل مكوّن يحترم مظهرك المختار، ويُحفظ بعد الزيارة.' },
              { icon: Smartphone, title: 'يعمل أينما كنت', text: 'تنقّل سفلي مريح على الهاتف، وتجربة كاملة على الحاسوب.' },
              { icon: ShieldCheck, title: 'خصوصية أولًا', text: 'بياناتك خاصة بحسابك، والتجربة محمية على الخادم.' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="feature-icon h-9 w-9 rounded-lg">
                  <item.icon className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[12.5px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24">
          <div className="marketing-shell grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:py-24">
            <div>
              <span className="section-eyebrow">أسئلة شائعة</span>
              <h2 className="mt-3 text-balance text-[28px] font-semibold leading-snug sm:text-[32px]">
                كل ما تحتاج معرفته قبل البدء.
              </h2>
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                لم تجد إجابتك؟ راسلنا على{' '}
                <a href={`mailto:${supportEmail}`} className="link" dir="ltr">
                  {supportEmail}
                </a>
                .
              </p>
            </div>
            <div className="divide-y divide-line rounded-2xl border border-line bg-surface px-5 sm:px-6">
              {faqs.map((faq) => (
                <details key={faq.question} className="faq-item group py-1">
                  <summary className="flex items-center justify-between gap-4 py-4 text-start">
                    <span className="text-[13px] font-medium text-ink">{faq.question}</span>
                    <ChevronDown className="faq-chevron h-4 w-4 shrink-0 text-subtle transition-transform" aria-hidden="true" />
                  </summary>
                  <p className="pb-4 pe-6 text-[12px] leading-relaxed text-muted">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-16 lg:pb-24">
          <div className="marketing-shell">
            <div className="card flex flex-col items-center justify-between gap-5 px-6 py-8 text-center sm:flex-row sm:text-start">
              <div>
                <h2 className="text-balance text-[20px] font-semibold sm:text-[24px]">
                  بكالوريتك تستحق خطة، لا فوضى.
                </h2>
                <p className="mt-1.5 text-[12.5px] text-muted">
                  ابتدئ اليوم بخطة واضحة، وستجد غدًا أثر ما راجعته.
                </p>
              </div>
              <Link to={startHref} className="btn btn-primary shrink-0">
                ابدأ التجربة المجانية
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter supportEmail={supportEmail} />
    </div>
  );
}
