import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, User } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, TextInput } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useToast } from '@/components/ui/Toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Register() {
  const { me, register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (me) {
    return <Navigate to={me.subscription.status === 'not_started' ? '/app/trial' : '/app/dashboard'} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = 'أدخل اسمك الكامل (حرفان على الأقل).';
    if (!EMAIL_RE.test(email.trim())) nextErrors.email = 'أدخل بريدًا إلكترونيًا صالحًا.';
    if (password.length < 8) nextErrors.password = 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.';
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      nextErrors.password = 'استعمل حرفًا واحدًا ورقمًا واحدًا على الأقل.';
    }
    if (confirm !== password) nextErrors.confirm = 'كلمتا المرور غير متطابقتين.';
    if (!acceptTerms) nextErrors.acceptTerms = 'يجب الموافقة على شروط الاستخدام وسياسة الخصوصية.';
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, acceptTerms: true });
      toast({
        title: 'تم إنشاء حسابك',
        description: 'خطوتك التالية: تفعيل التجربة المجانية لمدة 30 يومًا.',
        variant: 'success',
      });
      navigate('/app/trial', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) setErrors(error.fields);
        setFormError(error.message);
      } else {
        setFormError('تعذّر إنشاء الحساب الآن. يرجى المحاولة مجددًا.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      panelTitle="أول خطوة نحو بكالوريا أكثر وضوحًا."
      panelSubtitle="أنشئ حسابك، فعّل تجربتك المجانية لمدة 30 يومًا، وستجد خطة مراجعة مبنية على بياناتك الحقيقية من اليوم الأول."
    >
      <div className="mb-7">
        <span className="section-eyebrow">حساب جديد</span>
        <h1 className="mt-2 text-balance text-[27px] font-semibold leading-snug">أنشئ حسابك في دقيقة.</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          ثم فعّل تجربة مجانية 30 يومًا بكامل المزايا — دون أي وسيلة دفع.
        </p>
      </div>

      {formError ? (
        <div className="alert alert-danger mb-5" role="alert">
          {formError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="الاسم الكامل" htmlFor="register-name" error={errors.name} required>
          <TextInput
            id="register-name"
            name="name"
            autoComplete="name"
            placeholder="مثال: سارة بن علي"
            value={name}
            onChange={(event) => setName(event.target.value)}
            invalid={Boolean(errors.name)}
            leadingIcon={<User className="h-4 w-4" />}
          />
        </Field>

        <Field label="البريد الإلكتروني" htmlFor="register-email" error={errors.email} required>
          <TextInput
            id="register-email"
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

        <Field
          label="كلمة المرور"
          htmlFor="register-password"
          error={errors.password}
          hint="8 أحرف على الأقل، مع حرف ورقم."
          required
        >
          <PasswordInput
            id="register-password"
            name="new-password"
            autoComplete="new-password"
            placeholder="أنشئ كلمة مرور قوية"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            invalid={Boolean(errors.password)}
          />
        </Field>

        <Field label="تأكيد كلمة المرور" htmlFor="register-confirm" error={errors.confirm} required>
          <PasswordInput
            id="register-confirm"
            name="confirm-password"
            autoComplete="new-password"
            placeholder="أعد كتابة كلمة المرور"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            invalid={Boolean(errors.confirm)}
          />
        </Field>

        <div>
          <Checkbox
            id="register-terms"
            checked={acceptTerms}
            onChange={setAcceptTerms}
            label={
              <>
                أوافق على{' '}
                <Link to="/terms" className="link" target="_blank" rel="noreferrer">
                  شروط الاستخدام
                </Link>{' '}
                و{' '}
                <Link to="/privacy" className="link" target="_blank" rel="noreferrer">
                  سياسة الخصوصية
                </Link>
                .
              </>
            }
          />
          {errors.acceptTerms ? (
            <p className="error-text mt-1.5" role="alert">
              {errors.acceptTerms}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" block loading={submitting}>
          إنشاء الحساب
        </Button>
      </form>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface-2/70 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-[10.5px] leading-relaxed text-muted">
          تجربة واحدة لكل حساب، محمية على مستوى الخادم. لا نطلب أي معلومات بنكية، وبياناتك الدراسية
          خاصة بك وحدك.
        </p>
      </div>

      <p className="mt-6 text-center text-[12.5px] text-muted">
        لديك حساب بالفعل؟{' '}
        <Link to="/login" className="link font-medium">
          تسجيل الدخول
        </Link>
      </p>
    </AuthLayout>
  );
}
