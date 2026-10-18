import {
  BookOpen,
  Brain,
  ChartNoAxesColumn,
  Check,
  ClipboardCheck,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';
import { ActivityAreaChart } from '@/components/charts/Charts';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { BrandMark } from '@/components/ui/Brand';
import type { WeeklyPoint } from '@shared/types';

const demoWeek: WeeklyPoint[] = [
  { date: 'd1', label: 'الاثنين', minutes: 52, cards: 14, isToday: false },
  { date: 'd2', label: 'الثلاثاء', minutes: 78, cards: 22, isToday: false },
  { date: 'd3', label: 'الأربعاء', minutes: 44, cards: 9, isToday: false },
  { date: 'd4', label: 'الخميس', minutes: 96, cards: 28, isToday: false },
  { date: 'd5', label: 'الجمعة', minutes: 62, cards: 17, isToday: false },
  { date: 'd6', label: 'السبت', minutes: 118, cards: 34, isToday: false },
  { date: 'd7', label: 'الأحد', minutes: 86, cards: 21, isToday: true },
];

const planDemo = [
  { title: 'مراجعة بطاقات الرياضيات', meta: '18 بطاقة · 20 دقيقة', done: true },
  { title: 'تمارين المتتاليات العددية', meta: 'رياضيات · 30 دقيقة', done: false },
  { title: 'موضوع الفيزياء 2024', meta: 'دورة عادية · 45 دقيقة', done: false },
];

const subjectsDemo = [
  { name: 'الرياضيات', value: 62, color: '#2F5BEA' },
  { name: 'الفيزياء', value: 48, color: '#7A4AD6' },
  { name: 'علوم الطبيعة', value: 71, color: '#178A63' },
];

function PreviewNav() {
  return (
    <div className="hidden w-12 shrink-0 flex-col items-center gap-3 border-e border-line bg-surface-2/60 py-3 sm:flex">
      <BrandMark className="h-7 w-7 rounded-lg" />
      <span className="mt-2 flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <BookOpen className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
      <ClipboardCheck className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
      <Brain className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
      <ChartNoAxesColumn className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
    </div>
  );
}

export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl" role="img" aria-label="معاينة لوحة تحكم BacTrack DZ">
      <div
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/10 blur-2xl"
        aria-hidden="true"
      />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
        <div className="flex h-10 items-center justify-between border-b border-line bg-surface-2/70 px-3.5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-danger/50" />
            <span className="h-2 w-2 rounded-full bg-warning/50" />
            <span className="h-2 w-2 rounded-full bg-success/50" />
          </div>
          <span className="rounded-md bg-surface px-2 py-0.5 text-[9px] font-medium text-subtle" dir="ltr">
            bactrack.dz/app/dashboard
          </span>
          <span className="chip chip-gold !px-1.5 !py-0 !text-[8.5px]">
            <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
            معاينة
          </span>
        </div>

        <div className="flex">
          <PreviewNav />
          <div className="min-w-0 flex-1 space-y-3 p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-medium text-muted">الأحد، 18 أكتوبر</p>
                <p className="mt-0.5 font-display text-[14px] font-semibold text-ink">
                  مساء الخير، سارة <span aria-hidden="true">👋</span>
                </p>
              </div>
              <span className="chip chip-primary !px-2 !py-0.5 !text-[8.5px]">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                تجربة · 24 يومًا
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-line bg-surface p-3">
                <div className="flex items-center gap-3">
                  <ProgressRing value={64} size={56} strokeWidth={5}>
                    <span className="font-display text-[13px] font-semibold text-ink">
                      64<span className="text-[8px] text-muted">٪</span>
                    </span>
                  </ProgressRing>
                  <div className="min-w-0">
                    <p className="text-[9.5px] font-semibold text-ink">تقدّمك العام</p>
                    <p className="mt-0.5 text-[8px] leading-relaxed text-muted">مبني على امتحاناتك وتمارينك</p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 text-[8px] text-muted">
                  <span>32 بطاقة متمكّن منها</span>
                  <span className="font-semibold text-primary">+8 هذا الأسبوع</span>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9.5px] font-semibold text-ink">خطة اليوم</p>
                  <span className="text-[8px] text-muted">1/3</span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {planDemo.map((item) => (
                    <li key={item.title} className="flex items-start gap-1.5">
                      <span
                        className={
                          item.done
                            ? 'mt-[1px] flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] bg-primary text-white'
                            : 'mt-[1px] h-3 w-3 shrink-0 rounded-[3px] border border-line-strong'
                        }
                      >
                        {item.done ? <Check className="h-2 w-2" strokeWidth={3} aria-hidden="true" /> : null}
                      </span>
                      <span className={item.done ? 'text-[8px] text-subtle line-through' : 'text-[8px] font-medium text-ink'}>
                        {item.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[9.5px] font-semibold text-ink">نشاطك هذا الأسبوع</p>
                <p className="text-[8px] font-medium text-primary">9 ساعات و36 دقيقة</p>
              </div>
              <ActivityAreaChart data={demoWeek} />
            </div>

            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="mb-2 text-[9.5px] font-semibold text-ink">مواد تحتاج انتباهك</p>
              <div className="space-y-1.5">
                {subjectsDemo.map((subject) => (
                  <div key={subject.name} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 truncate text-[8px] font-medium text-muted">{subject.name}</span>
                    <ProgressBar value={subject.value} size="sm" color={subject.color} className="flex-1" />
                    <span className="w-5 shrink-0 text-end text-[8px] tabular-nums text-muted">{subject.value}٪</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 start-4 hidden items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-lift sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success-soft text-success">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[9.5px] font-semibold text-ink">أنجزت موضوع الفيزياء</p>
          <p className="text-[8px] text-muted">أُضيف إلى سجل نشاطك</p>
        </div>
      </div>
    </div>
  );
}
