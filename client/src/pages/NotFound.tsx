import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Brand } from '@/components/ui/Brand';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="marketing-shell flex h-16 items-center justify-between">
        <Brand />
        <Link to="/" className="btn btn-ghost btn-sm">الرئيسية</Link>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface text-primary shadow-card">
            <Compass className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
          </span>
          <p className="mt-6 font-display text-[13px] font-semibold tracking-widest text-subtle">404</p>
          <h1 className="mt-2 text-balance text-[26px] font-semibold">هذه الصفحة ليست في خطتنا.</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            الرابط الذي تحاول الوصول إليه غير موجود أو تغيّر. لنعد إلى مساحة الدراسة.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/app/dashboard" className="btn btn-primary">
              لوحة التحكم
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/" className="btn btn-secondary">الصفحة الرئيسية</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
