import { Link } from 'react-router-dom';
import { ArrowLeft, Brain, Check, ChartNoAxesColumn, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Brand } from '@/components/ui/Brand';
import { ThemeSegmented } from '@/components/ui/ThemeSegmented';
import { ProgressRing } from '@/components/ui/Progress';

export function AuthLayout({
  children,
  panelTitle,
  panelSubtitle,
}: {
  children: ReactNode;
  panelTitle?: string;
  panelSubtitle?: string;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
      <div className="flex min-h-dvh flex-col px-5 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <div className="flex items-center gap-2">
            <ThemeSegmented compact />
            <Link to="/" className="btn btn-ghost btn-sm gap-1.5">
              الرئيسية
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[26rem] animate-fade-up">{children}</div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-subtle">
          <span>© {new Date().getFullYear()} BacTrack DZ</span>
          <div className="flex items-center gap-3">
            <Link to="/privacy" className="transition hover:text-primary">الخصوصية</Link>
            <Link to="/terms" className="transition hover:text-primary">الشروط</Link>
          </div>
        </div>
      </div>

      <aside className="panel-dark relative hidden min-h-dvh flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative flex items-center gap-2">
          <span className="chip border-white/15 bg-white/5 text-[#C8A96A]">مساحة مراجعة هادئة</span>
        </div>

        <div className="relative my-10 max-w-md">
          <h2 className="text-balance text-[30px] font-semibold leading-[1.5] text-white xl:text-[34px]">
            {panelTitle ?? 'مراجعتك، منظّمة من أول يوم.'}
          </h2>
          <p className="mt-4 text-[13.5px] leading-[1.95] text-[rgb(162,183,185)]">
            {panelSubtitle ??
              'منصة واحدة تجمع امتحانات البكالوريا، البطاقات الذكية، وتقدّمك الحقيقي — بواجهة عربية مصمّمة للتركيز.'}
          </p>

          <ul className="mt-8 space-y-3">
            {[
              { icon: Brain, text: 'مراجعة ذكية تُجدول نفسها حسب أدائك' },
              { icon: ChartNoAxesColumn, text: 'تحليلات مبنية على بياناتك، لا أرقام تجميلية' },
              { icon: ShieldCheck, text: 'تجربة مجانية 30 يومًا محمية على الخادم' },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-[12.5px] text-[rgb(213,228,225)]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#6EE0D2]">
                  <item.icon className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-end justify-between gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
            <p className="text-[10.5px] font-medium text-[rgb(162,183,185)]">تقدّمك العام</p>
            <div className="mt-2 flex items-center gap-3">
              <ProgressRing
                value={64}
                size={58}
                strokeWidth={5}
                trackColor="rgba(255,255,255,0.12)"
                color="#5ED7C8"
              >
                <span className="font-display text-[13px] font-semibold text-white">64٪</span>
              </ProgressRing>
              <div>
                <p className="flex items-center gap-1 text-[11px] font-medium text-white">
                  <Check className="h-3 w-3 text-[#5ED7C8]" aria-hidden="true" />
                  خطة اليوم جاهزة
                </p>
                <p className="mt-1 text-[10px] text-[rgb(162,183,185)]">3 مهام · 55 دقيقة</p>
              </div>
            </div>
          </div>
          <p className="max-w-[10rem] text-end text-[10px] leading-relaxed text-[rgb(140,163,165)]">
            بياناتك الدراسية خاصة بحسابك، ولا تُشارك مع أي طرف.
          </p>
        </div>
      </aside>
    </div>
  );
}
