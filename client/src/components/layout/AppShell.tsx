import { useEffect, useState } from 'react';
import {
  Brain,
  ChartNoAxesColumn,
  ChevronLeft,
  ClipboardCheck,
  Ellipsis,
  LayoutDashboard,
  LogOut,
  BookOpen,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { SubscriptionInfo } from '@shared/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { cn, formatDate, pluralDays } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Brand } from '@/components/ui/Brand';
import { ProgressBar } from '@/components/ui/Progress';
import { ThemeSegmented } from '@/components/ui/ThemeSegmented';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { TrialChip } from './TrialChip';

const studyNav = [
  { to: '/app/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/app/subjects', label: 'المواد الدراسية', icon: BookOpen },
  { to: '/app/revision', label: 'المراجعة الذكية', icon: Brain },
  { to: '/app/exams', label: 'متابعة الامتحانات', icon: ClipboardCheck },
];

const insightNav = [{ to: '/app/analytics', label: 'التقدّم والتحليلات', icon: ChartNoAxesColumn }];

const accountNav = [
  { to: '/app/plans', label: 'الاشتراك والتجربة', icon: Sparkles },
  { to: '/app/settings', label: 'الإعدادات', icon: Settings },
];

const mobilePrimary = [
  { to: '/app/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { to: '/app/subjects', label: 'المواد', icon: BookOpen },
  { to: '/app/revision', label: 'المراجعة', icon: Brain, featured: true },
  { to: '/app/exams', label: 'الامتحانات', icon: ClipboardCheck },
];

const moreLinks = [
  { to: '/app/analytics', label: 'التقدّم والتحليلات', icon: ChartNoAxesColumn },
  { to: '/app/plans', label: 'الاشتراك والتجربة', icon: Sparkles },
  { to: '/app/settings', label: 'الإعدادات', icon: Settings },
];

const pageTitles: Record<string, string> = {
  '/app/dashboard': 'لوحة التحكم',
  '/app/subjects': 'المواد الدراسية',
  '/app/exams': 'متابعة الامتحانات',
  '/app/revision': 'المراجعة الذكية',
  '/app/analytics': 'التقدّم والتحليلات',
  '/app/plans': 'الاشتراك والتجربة',
  '/app/settings': 'الإعدادات',
  '/app/trial': 'التجربة المجانية',
};

function pageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/app/subjects/')) return 'تفاصيل المادة';
  return 'مساحة التعلّم';
}

function TrialCard({ subscription }: { subscription: SubscriptionInfo }) {
  if (subscription.status === 'trialing') {
    const days = subscription.daysRemaining ?? 0;
    return (
      <div className="rounded-xl border border-primary/20 bg-primary-soft/60 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-primary-strong">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            التجربة المجانية
          </span>
          <span className="text-[11px] font-medium text-primary-strong">
            {pluralDays(days)} متبقية
          </span>
        </div>
        <ProgressBar value={(days / 30) * 100} className="mt-2.5 h-1.5" label="استهلاك فترة التجربة" />
        <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
          تنتهي في {subscription.trialEndsAt ? formatDate(subscription.trialEndsAt, 'short') : '—'} · بياناتك تبقى محفوظة دائمًا.
        </p>
        <Link to="/app/plans" className="mt-2.5 inline-flex text-[11px] font-medium text-primary-strong hover:underline">
          إدارة الاشتراك
        </Link>
      </div>
    );
  }

  if (subscription.status === 'not_started') {
    return (
      <div className="rounded-xl border border-gold/25 bg-gold-soft p-3.5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gold">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          30 يومًا مجانًا
        </p>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
          تجربة كاملة لكل المزايا، دون أي وسيلة دفع.
        </p>
        <Link to="/app/trial" className="btn btn-subtle btn-sm mt-2.5 w-full">
          ابدأ التجربة
        </Link>
      </div>
    );
  }

  if (subscription.access === 'paid') {
    return (
      <div className="rounded-xl border border-success/20 bg-success-soft p-3.5">
        <p className="text-[12px] font-semibold text-success">اشتراك نشط</p>
        <p className="mt-1 text-[10.5px] text-muted">شكرًا لدعمك BacTrack DZ.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-warning/20 bg-warning-soft p-3.5">
      <p className="text-[12px] font-semibold text-warning">انتهت فترة التجربة</p>
      <p className="mt-1 text-[10.5px] leading-relaxed text-muted">بياناتك ونتائجك محفوظة. اطّلع على خيارات الاشتراك.</p>
      <Link to="/app/plans" className="mt-2 inline-flex text-[11px] font-medium text-warning hover:underline">
        عرض الباقات
      </Link>
    </div>
  );
}

export function AppShell() {
  const { me, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // The account is the source of truth for a signed-in student, so a theme
  // chosen on another device follows them here.
  useEffect(() => {
    if (me && me.settings.theme !== theme) setTheme(me.settings.theme);
  }, [me, theme, setTheme]);

  if (!me) return null;

  const { user, subscription } = me;
  const gated =
    subscription.status === 'not_started' &&
    !['/app/trial', '/app/plans', '/app/settings'].includes(location.pathname);

  if (gated) return <Navigate to="/app/trial" replace />;

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: 'تم تسجيل الخروج', variant: 'info' });
      navigate('/');
    } catch {
      toast({ title: 'تعذّر تسجيل الخروج', description: 'يرجى المحاولة مجددًا.', variant: 'error' });
    }
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
      {/* Sidebar — first grid column in RTL sits on the right */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-line bg-surface/70 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center px-5">
          <Brand />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="التنقل الرئيسي">
          <p className="nav-section">مساحة الدراسة</p>
          {studyNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn('nav-link', isActive && 'is-active')}
            >
              <item.icon className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}

          <p className="nav-section">رؤيتك</p>
          {insightNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn('nav-link', isActive && 'is-active')}
            >
              <item.icon className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}

          <p className="nav-section">الحساب</p>
          {accountNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn('nav-link', isActive && 'is-active')}
            >
              <item.icon className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-line p-3">
          <TrialCard subscription={subscription} />
          <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-ink">{user.name}</p>
              <p className="truncate text-[10.5px] text-muted" dir="ltr">
                {user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="btn btn-ghost btn-icon btn-sm text-muted"
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="topbar">
          <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="lg:hidden">
                <Brand compact />
              </div>
              <div className="hidden items-center gap-2 text-[11.5px] text-muted lg:flex">
                <span>مساحة التعلّم</span>
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="font-medium text-ink">{pageTitle(location.pathname)}</span>
              </div>
              <span className="truncate text-[12.5px] font-medium text-ink lg:hidden">
                {pageTitle(location.pathname)}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <TrialChip subscription={subscription} className="hidden md:inline-flex" />
              <ThemeSegmented compact />
              <Link
                to="/app/settings"
                className="rounded-full lg:hidden"
                aria-label="الإعدادات والحساب"
              >
                <Avatar name={user.name} size="sm" />
              </Link>
            </div>
          </div>
        </header>

        <main id="main" className="app-content px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div key={location.pathname} className="mx-auto w-full max-w-[1160px] animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile navigation */}
      <nav className="mobile-nav" aria-label="التنقل السفلي">
        <div className="grid grid-cols-5 items-stretch">
          {mobilePrimary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn('mobile-nav-link', isActive && 'is-active', item.featured && 'pt-2')
              }
            >
              <span
                className={cn(
                  'flex items-center justify-center',
                  item.featured
                    ? 'h-9 w-9 -translate-y-1 rounded-full bg-primary-soft text-primary'
                    : 'h-5 w-5',
                )}
              >
                <item.icon className={item.featured ? 'h-4.5 w-4.5' : 'h-5 w-5'} strokeWidth={1.8} aria-hidden="true" />
              </span>
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            className={cn(
              'mobile-nav-link',
              ['/app/analytics', '/app/plans', '/app/settings'].includes(location.pathname) && 'is-active',
            )}
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
          >
            <span className="flex h-5 w-5 items-center justify-center">
              <Ellipsis className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            المزيد
          </button>
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="المزيد" size="sm">
        <nav className="space-y-1" aria-label="روابط إضافية">
          {moreLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-2"
            >
              <item.icon className="h-4.5 w-4.5 text-muted" strokeWidth={1.8} aria-hidden="true" />
              {item.label}
            </Link>
          ))}
          <div className="my-2 h-px bg-line" />
          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-ink">{user.name}</p>
              <p className="truncate text-[10.5px] text-muted" dir="ltr">
                {user.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger transition hover:bg-danger-soft"
          >
            <LogOut className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden="true" />
            تسجيل الخروج
          </button>
        </nav>
      </Modal>
    </div>
  );
}
