import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Brand } from '@/components/ui/Brand';
import { ThemeSegmented } from '@/components/ui/ThemeSegmented';

const marketingLinks = [
  { href: '#features', label: 'المزايا' },
  { href: '#how', label: 'كيف يعمل' },
  { href: '#subjects', label: 'المواد' },
  { href: '#trial', label: 'التجربة المجانية' },
  { href: '#faq', label: 'الأسئلة' },
];

export function SiteHeader() {
  const { me } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-xl">
      <div className="marketing-shell flex h-16 items-center justify-between gap-4">
        <Brand />
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="روابط الصفحة">
          {marketingLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-[12.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeSegmented compact className="hidden sm:inline-flex" />
          {me ? (
            <Link to="/app/dashboard" className="btn btn-primary btn-sm">
              لوحة التحكم
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
                تسجيل الدخول
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                ابدأ مجانًا
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ supportEmail = 'support@bactrack.dz' }: { supportEmail?: string }) {
  return (
    <footer className="border-t border-line bg-surface/60">
      <div className="marketing-shell py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-[12.5px] leading-relaxed text-muted">
              مساحة مراجعة عربية للبكالوريا الجزائرية: تتبّع امتحاناتك، راجع ببطاقات ذكية، وشاهد تقدّمك
              الحقيقي يومًا بيوم.
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-muted transition hover:text-primary"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              <span dir="ltr">{supportEmail}</span>
            </a>
          </div>
          <div>
            <h3 className="text-[12px] font-semibold text-ink">المنتج</h3>
            <ul className="mt-3 space-y-2 text-[12.5px] text-muted">
              <li><a href="#features" className="transition hover:text-primary">المزايا</a></li>
              <li><a href="#how" className="transition hover:text-primary">كيف يعمل</a></li>
              <li><a href="#trial" className="transition hover:text-primary">التجربة المجانية</a></li>
              <li><Link to="/app/plans" className="transition hover:text-primary">الباقات</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-[12px] font-semibold text-ink">الحساب</h3>
            <ul className="mt-3 space-y-2 text-[12.5px] text-muted">
              <li><Link to="/register" className="transition hover:text-primary">إنشاء حساب</Link></li>
              <li><Link to="/login" className="transition hover:text-primary">تسجيل الدخول</Link></li>
              <li><Link to="/app/settings" className="transition hover:text-primary">الإعدادات</Link></li>
              <li><Link to="/app/analytics" className="transition hover:text-primary">تحليلات التقدّم</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-[12px] font-semibold text-ink">قانوني</h3>
            <ul className="mt-3 space-y-2 text-[12.5px] text-muted">
              <li><Link to="/privacy" className="transition hover:text-primary">سياسة الخصوصية</Link></li>
              <li><Link to="/terms" className="transition hover:text-primary">شروط الاستخدام</Link></li>
              <li><a href={`mailto:${supportEmail}`} className="transition hover:text-primary">الدعم</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 text-[11px] text-subtle sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} BacTrack DZ. جميع الحقوق محفوظة.</p>
          <p>
            صُمّم للطلبة الجزائريين · <span className="text-muted">الدفع غير مُفعّل حاليًا</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
