import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('w-full', className)}>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ms-1 text-danger">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="error-text" role="alert">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="hint">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leadingIcon?: ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { invalid, leadingIcon, className, ...rest },
  ref,
) {
  return (
    <div className="relative w-full">
      {leadingIcon ? (
        <span className="input-icon" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        className={cn('input', leadingIcon && 'ps-10', className)}
        aria-invalid={invalid || undefined}
        {...rest}
      />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn('textarea', className)} {...rest} />;
  },
);

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  leadingIcon?: ReactNode;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { leadingIcon, className, children, ...rest },
  ref,
) {
  return (
    <div className="relative w-full">
      {leadingIcon ? (
        <span className="input-icon" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <select ref={ref} className={cn('select', leadingIcon ? 'ps-10' : '', className)} {...rest}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
        style={{ insetInlineEnd: '0.75rem' }}
        aria-hidden="true"
      />
    </div>
  );
});

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label: ReactNode;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ label, id, checked, onChange, className, ...rest }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn('flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-muted', className)}
    >
      <input
        id={id}
        type="checkbox"
        className="checkbox mt-0.5"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}
