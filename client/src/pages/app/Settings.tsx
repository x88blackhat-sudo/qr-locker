import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CircleAlert,
  Download,
  KeyRound,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  User,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { MeResponse, ThemePreference, UserSettings } from '@shared/types';
import { api, ApiError, downloadDataExport } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useThemePreference } from '@/lib/useThemePreference';
import { queryKeys } from '@/lib/query';
import { cn, formatDate, formatNumber, pluralDays } from '@/lib/utils';
import { subscriptionStatusLabels } from '@/lib/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/Progress';
import { Chip } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

const goalOptions = [30, 60, 90, 120, 180, 240];

const themeOptions: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  { value: 'light', label: 'فاتح', description: 'واجهة بيضاء هادئة، مناسبة للنهار.', icon: Sun },
  { value: 'dark', label: 'داكن', description: 'خلفيات مريحة للعين في المراجعة الليلية.', icon: Moon },
  { value: 'system', label: 'حسب النظام', description: 'يتبع إعداد المظهر في جهازك تلقائيًا.', icon: Monitor },
];

function SavedFlag({ visible }: { visible: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10.5px] font-medium text-success transition-opacity',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      aria-live="polite"
    >
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      تم الحفظ
    </span>
  );
}

function SettingsContent({ me }: { me: MeResponse }) {
  const { logout } = useAuth();
  const { theme } = useTheme();
  const { changeTheme, saving: themeSaving } = useThemePreference();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState(me.user.name);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<Record<string, string>>({});
  const [goal, setGoal] = useState(me.settings.dailyGoalMinutes);
  const [goalSaved, setGoalSaved] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const savedTimer = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    };
  }, []);

  const flash = (setter: (value: boolean) => void) => {
    setter(true);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setter(false), 2600);
  };

  const updateMeCache = (updater: (current: MeResponse) => MeResponse) => {
    queryClient.setQueryData<MeResponse>(queryKeys.me, (current) => (current ? updater(current) : current));
  };

  const profileMutation = useMutation({
    mutationFn: (nextName: string) =>
      api<{ user: MeResponse['user'] }>('/profile', {
        method: 'PATCH',
        body: { name: nextName },
      }),
    onSuccess: (result) => {
      updateMeCache((current) => ({ ...current, user: result.user }));
      setProfileError({});
      flash(setProfileSaved);
      toast({ title: 'تم تحديث ملفك الشخصي', variant: 'success' });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.fields) setProfileError(error.fields);
        toast({ title: 'تعذّر حفظ الاسم', description: error.message, variant: 'error' });
      }
    },
  });

  const goalMutation = useMutation({
    mutationFn: (dailyGoalMinutes: number) =>
      api<{ settings: UserSettings }>('/settings', {
        method: 'PATCH',
        body: { dailyGoalMinutes },
      }),
    onSuccess: (result) => {
      updateMeCache((current) => ({ ...current, settings: result.settings }));
      flash(setGoalSaved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics });
      toast({ title: 'تم تحديث هدفك اليومي', variant: 'success' });
    },
    onError: (error) =>
      toast({
        title: 'تعذّر حفظ الهدف',
        description: error instanceof ApiError ? error.message : 'يرجى المحاولة مجددًا.',
        variant: 'error',
      }),
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      api<{ ok: true; message: string }>('/profile/password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      }),
    onSuccess: (result) => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
      flash(setPasswordSaved);
      toast({ title: 'تم تحديث كلمة المرور', description: result.message, variant: 'success' });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.fields) setPasswordErrors(error.fields);
        toast({ title: 'تعذّر تحديث كلمة المرور', description: error.message, variant: 'error' });
      }
    },
  });

  const handlePasswordSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = 'أدخل كلمة المرور الحالية.';
    if (newPassword.length < 8) errors.newPassword = '8 أحرف على الأقل.';
    else if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      errors.newPassword = 'استعمل حرفًا ورقمًا على الأقل.';
    }
    if (confirmPassword !== newPassword) errors.confirmPassword = 'كلمتا المرور غير متطابقتين.';
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;
    passwordMutation.mutate();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadDataExport();
      toast({ title: 'تم تنزيل بياناتك', description: 'حُفظ الملف بصيغة JSON على جهازك.', variant: 'success' });
    } catch (error) {
      toast({
        title: 'تعذّر تصدير البيانات',
        description: error instanceof ApiError ? error.message : 'يرجى المحاولة لاحقًا.',
        variant: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await api('/auth/logout-all', { method: 'POST', body: {} });
      await logout();
      toast({ title: 'تم تسجيل الخروج من كل الأجهزة', variant: 'success' });
      navigate('/login', { replace: true });
    } catch (error) {
      toast({
        title: 'تعذّر إنهاء الجلسات',
        description: error instanceof ApiError ? error.message : 'يرجى المحاولة مجددًا.',
        variant: 'error',
      });
    } finally {
      setLoggingOutAll(false);
      setLogoutAllOpen(false);
    }
  };

  const subscription = me.subscription;

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            حسابك وتفضيلات الدراسة
          </span>
        }
        title="الإعدادات"
        description="اضبط ملفك، مظهر الواجهة، وأهدافك. كل تغيير يُحفظ في حسابك ويظهر على جميع أجهزتك."
        actions={
          <Link to="/app/plans" className="chip chip-primary hover:no-underline">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {subscriptionStatusLabels[subscription.status]}
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <div className="space-y-4">
          <SectionCard
            title="الملف الشخصي"
            subtitle="اسمك كما يظهر في مساحة الدراسة"
            icon={<User className="h-4 w-4" aria-hidden="true" />}
          >
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <Avatar name={me.user.name} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink">{me.user.name}</p>
                <p className="truncate text-[11px] text-muted" dir="ltr">{me.user.email}</p>
                <p className="mt-1 text-[10px] text-subtle">عضو منذ {formatDate(me.user.createdAt, 'long')}</p>
              </div>
            </div>

            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (name.trim().length < 2) {
                  setProfileError({ name: 'أدخل اسمًا من حرفين على الأقل.' });
                  return;
                }
                profileMutation.mutate(name.trim());
              }}
            >
              <Field label="الاسم الكامل" htmlFor="settings-name" error={profileError.name} required>
                <TextInput
                  id="settings-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setProfileError({});
                  }}
                  autoComplete="name"
                  leadingIcon={<User className="h-4 w-4" />}
                  invalid={Boolean(profileError.name)}
                />
              </Field>

              <Field label="البريد الإلكتروني" htmlFor="settings-email" hint="لا يمكن تغيير البريد الإلكتروني من هنا حاليًا.">
                <TextInput
                  id="settings-email"
                  value={me.user.email}
                  readOnly
                  disabled
                  dir="ltr"
                  leadingIcon={<Mail className="h-4 w-4" />}
                />
              </Field>

              <div className="flex items-center justify-between gap-2 pt-1">
                <SavedFlag visible={profileSaved} />
                <Button type="submit" size="sm" loading={profileMutation.isPending}>
                  حفظ الاسم
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="المظهر"
            subtitle="يُحفظ تفضيلك في حسابك ويُستعاد في كل زيارة"
            icon={<Palette className="h-4 w-4" aria-hidden="true" />}
          >
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="مظهر الواجهة">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const active = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={async () => {
                      await changeTheme(option.value);
                      flash(setThemeSaved);
                    }}
                    className={cn(
                      'relative rounded-xl border p-3 text-start transition',
                      active
                        ? 'border-primary/40 bg-primary-soft/60'
                        : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2/60',
                    )}
                  >
                    <Icon
                      className={cn('h-4.5 w-4.5', active ? 'text-primary' : 'text-muted')}
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-[12px] font-medium text-ink">{option.label}</p>
                    <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">{option.description}</p>
                    {active ? (
                      <span className="absolute end-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex min-h-[1.25rem] items-center justify-between">
              <SavedFlag visible={themeSaved} />
              {themeSaving ? <span className="text-[10px] text-subtle">جارٍ حفظ المظهر…</span> : null}
            </div>
          </SectionCard>

          <SectionCard
            title="هدف الدراسة اليومي"
            subtitle="نستخدمه في لوحة التحكم وفي نسبة هدف اليوم"
            icon={<Target className="h-4 w-4" aria-hidden="true" />}
          >
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="هدف الدراسة اليومي">
              {goalOptions.map((value) => {
                const active = goal === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setGoal(value)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-[11.5px] font-medium transition',
                      active
                        ? 'border-primary/40 bg-primary-soft text-primary-strong'
                        : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
                    )}
                  >
                    {formatNumber(value)} دقيقة
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-[10px] text-subtle">
              المدة المختارة: {formatNumber(goal)} دقيقة يوميًا. الافتراضي ساعتان.
            </p>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
              <SavedFlag visible={goalSaved} />
              <Button
                size="sm"
                loading={goalMutation.isPending}
                disabled={goal === me.settings.dailyGoalMinutes}
                onClick={() => goalMutation.mutate(goal)}
              >
                حفظ الهدف
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="كلمة المرور"
            subtitle="تحديث آمن لكلمة المرور، مع إنهاء الجلسات الأخرى"
            icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
          >
            <form className="space-y-3" onSubmit={handlePasswordSubmit} noValidate>
              <Field label="كلمة المرور الحالية" htmlFor="current-password" error={passwordErrors.currentPassword} required>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setPasswordErrors({});
                  }}
                  invalid={Boolean(passwordErrors.currentPassword)}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="كلمة المرور الجديدة"
                  htmlFor="new-password"
                  error={passwordErrors.newPassword}
                  hint="8 أحرف على الأقل، مع حرف ورقم."
                  required
                >
                  <PasswordInput
                    id="new-password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setPasswordErrors({});
                    }}
                    invalid={Boolean(passwordErrors.newPassword)}
                  />
                </Field>
                <Field
                  label="تأكيد كلمة المرور"
                  htmlFor="confirm-password"
                  error={passwordErrors.confirmPassword}
                  required
                >
                  <PasswordInput
                    id="confirm-password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setPasswordErrors({});
                    }}
                    invalid={Boolean(passwordErrors.confirmPassword)}
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <SavedFlag visible={passwordSaved} />
                <Button type="submit" size="sm" loading={passwordMutation.isPending}>
                  تحديث كلمة المرور
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="حالة الاشتراك"
            icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
            action={
              <Chip
                variant={
                  subscription.access === 'trial'
                    ? 'primary'
                    : subscription.access === 'paid'
                      ? 'success'
                      : 'warning'
                }
              >
                {subscriptionStatusLabels[subscription.status]}
              </Chip>
            }
          >
            {subscription.status === 'not_started' ? (
              <>
                <p className="text-[11.5px] leading-relaxed text-muted">
                  لم تبدأ تجربتك بعد. يمكنك تفعيل 30 يومًا كاملة دون أي وسيلة دفع.
                </p>
                <Link to="/app/trial" className="btn btn-primary btn-sm mt-3 w-full">ابدأ التجربة المجانية</Link>
              </>
            ) : subscription.access === 'trial' ? (
              <>
                <p className="font-display text-[22px] font-semibold text-ink">
                  {pluralDays(subscription.daysRemaining ?? 0)} متبقية
                </p>
                <ProgressBar
                  value={((subscription.daysRemaining ?? 0) / 30) * 100}
                  size="sm"
                  className="mt-2"
                  label="استهلاك التجربة"
                />
                <dl className="mt-3 space-y-1.5 text-[10.5px]">
                  <div className="flex justify-between">
                    <dt className="text-muted">بدأت</dt>
                    <dd className="text-ink">{subscription.trialStartedAt ? formatDate(subscription.trialStartedAt, 'short') : '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">تنتهي</dt>
                    <dd className="text-ink">{subscription.trialEndsAt ? formatDate(subscription.trialEndsAt, 'long') : '—'}</dd>
                  </div>
                </dl>
                <Link to="/app/plans" className="btn btn-secondary btn-sm mt-3 w-full">عرض التفاصيل</Link>
              </>
            ) : (
              <>
                <p className="text-[11.5px] leading-relaxed text-muted">
                  {subscription.access === 'paid'
                    ? 'اشتراكك نشط، شكرًا لدعمك.'
                    : 'انتهت فترة التجربة. بياناتك ونتائجك محفوظة بالكامل، ولا توجد وسيلة دفع مُفعّلة حاليًا.'}
                </p>
                <Link to="/app/plans" className="btn btn-secondary btn-sm mt-3 w-full">حالة الاشتراك والباقات</Link>
              </>
            )}
          </SectionCard>

          <SectionCard
            title="الأمان والجلسات"
            icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          >
            <p className="text-[11px] leading-relaxed text-muted">
              إذا استخدمت الحساب على جهاز مشترك، أنهِ كل الجلسات. كلمة المرور والجلسات محمية بتشفير
              على الخادم.
            </p>
            <Button
              variant="danger"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setLogoutAllOpen(true)}
              icon={<LogOut className="h-3.5 w-3.5" />}
            >
              تسجيل الخروج من كل الأجهزة
            </Button>
          </SectionCard>

          <SectionCard title="بياناتك" icon={<Download className="h-4 w-4" aria-hidden="true" />}>
            <p className="text-[11px] leading-relaxed text-muted">
              نزّل نسخة كاملة من بياناتك: الامتحانات، التمارين، البطاقات، الخطة، وسجل النشاط، بصيغة JSON.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              loading={exporting}
              onClick={() => void handleExport()}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              تصدير بياناتي
            </Button>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3 text-[10px]">
              <Link to="/privacy" className="link">سياسة الخصوصية</Link>
              <span className="text-subtle">·</span>
              <Link to="/terms" className="link">شروط الاستخدام</Link>
            </div>
          </SectionCard>

          <div className="rounded-xl border border-line bg-surface-2/50 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
              <CircleAlert className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              ملاحظة عن الدفع
            </p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
              المنصة لا تعالج أي مدفوعات في الوقت الحالي، ولا تطلب معلومات بنكية. أي ميزة اشتراك
              مدفوع ستُعلن بوضوح عند تهيئتها.
            </p>
            <a href="mailto:support@bactrack.dz" className="link mt-2 inline-flex text-[10.5px]">
              التواصل مع الدعم
            </a>
          </div>
        </div>
      </div>

      <Modal
        open={logoutAllOpen}
        onClose={() => setLogoutAllOpen(false)}
        title="تسجيل الخروج من كل الأجهزة؟"
        description="ستحتاج إلى إدخال بريدك وكلمة المرور من جديد على كل جهاز. بياناتك الدراسية لن تتأثر."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setLogoutAllOpen(false)} disabled={loggingOutAll}>
              إلغاء
            </Button>
            <Button variant="danger" size="sm" loading={loggingOutAll} onClick={() => void handleLogoutAll()}>
              تأكيد الخروج من الكل
            </Button>
          </>
        }
      />
    </div>
  );
}

export default function Settings() {
  const { me } = useAuth();
  if (!me) return null;
  return <SettingsContent me={me} />;
}
