import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { safeNextPath } from '@/lib/utils';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useToast } from '@/components/ui/Toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const { me, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const next = safeNextPath((location.state as { from?: unknown } | null)?.from);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (me) {
    return (
      <Navigate
        to={me.subscription.status === 'not_started' ? '/app/trial' : next}
        replace
      />
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) nextErrors.email = 'أدخل بريدًا إلكترونيًا صالحًا.';
    if (!password) nextErrors.password = 'أدخل كلمة المرور.';
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast({ title: 'مرحبًا بعودتك', description: 'أكمل من حيث توقفت.', variant: 'success' });
      navigate(next, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) setErrors(error.fields);
        setFormError(error.message);
      } else {
        setFormError('تعذّر تسجيل الدخول الآن. يرجى المحاولة مجددًا.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-7">
        <span className="section-eyebrow">تسجيل الدخول</span>
        <h1 className="mt-2 text-balance text-[27px] font-semibold leading-snug">أهلًا بعودتك.</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          أدخل بياناتك لمتابعة خطتك، مراجعتك، وتقدّمك المحفوظ.
        </p>
      </div>

      {formError ? (
        <div className="alert alert-danger mb-5" role="alert">
          {formError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="البريد الإلكتروني" htmlFor="login-email" error={errors.email} required>
          <TextInput
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            dir="ltr"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            invalid={Boolean(errors.email)}
            leadingIcon={<Mail className="h-4 w-4" />}
          />
        </Field>

        <Field label="كلمة المرور" htmlFor="login-password" error={errors.password} required>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            placeholder="أدخل كلمة المرور"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            invalid={Boolean(errors.password)}
          />
        </Field>

        <Button type="submit" size="lg" block loading={submitting}>
          تسجيل الدخول
        </Button>
      </form>

      <div className="mt-6 space-y-4">
        <p className="text-center text-[12.5px] text-muted">
          ليس لديك حساب؟{' '}
          <Link to="/register" className="link font-medium">
            أنشئ حسابًا وابدأ التجربة المجانية
          </Link>
        </p>

        <div className="rounded-xl border border-line bg-surface-2/70 px-4 py-3">
          <p className="flex items-center gap-2 text-[11.5px] font-medium text-ink">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-primary">
              <ArrowLeft className="h-3 w-3" aria-hidden="true" />
            </span>
            تجربة مجانية 30 يومًا للحسابات الجديدة
          </p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
            دون بطاقة بنكية. تفعيل التجربة يتم من داخل حسابك في خطوة واحدة.
          </p>
        </div>

        <p className="text-center text-[10.5px] text-subtle">
          تواجه مشكلة في الدخول؟{' '}
          <a className="link" href="mailto:support@bactrack.dz">راسل الدعم</a>
        </p>
      </div>
    </AuthLayout>
  );
}
