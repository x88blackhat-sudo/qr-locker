import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const numberFormatter = new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 });

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}

const shortDateFormatter = new Intl.DateTimeFormat('ar-DZ', {
  day: 'numeric',
  month: 'short',
});
const longDateFormatter = new Intl.DateTimeFormat('ar-DZ', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('ar-DZ', {
  hour: '2-digit',
  minute: '2-digit',
});
const weekdayFormatter = new Intl.DateTimeFormat('ar-DZ', { weekday: 'long' });

export function formatDate(ts: number, style: 'short' | 'long' = 'long'): string {
  return style === 'short' ? shortDateFormatter.format(new Date(ts)) : longDateFormatter.format(new Date(ts));
}

export function formatWeekday(ts: number): string {
  return weekdayFormatter.format(new Date(ts));
}

export function formatTime(ts: number): string {
  return timeFormatter.format(new Date(ts));
}

export function todayLabel(): string {
  return `${weekdayFormatter.format(new Date())}، ${longDateFormatter.format(new Date())}`;
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'ليلة هادئة';
  if (hour < 12) return 'صباح الخير';
  if (hour < 17) return 'نهارك سعيد';
  return 'مساء الخير';
}

export function formatMinutes(total: number): string {
  const minutes = Math.max(0, Math.round(total));
  if (minutes < 60) return `${formatNumber(minutes)} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return hours === 1 ? 'ساعة واحدة' : hours === 2 ? 'ساعتان' : `${formatNumber(hours)} ساعات`;
  const hoursLabel = hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتان' : `${formatNumber(hours)} ساعات`;
  return `${hoursLabel} و${formatNumber(rest)} دقيقة`;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `قبل ${formatNumber(minutes)} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${formatNumber(hours)} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'أمس';
  if (days < 30) return `قبل ${formatNumber(days)} يومًا`;
  return formatDate(ts, 'short');
}

export function dueLabel(dueAt: number | null): string {
  if (dueAt === null) return 'جديدة';
  if (dueAt <= Date.now()) return 'مستحقة الآن';
  const days = Math.ceil((dueAt - Date.now()) / 86_400_000);
  if (days <= 1) return 'غدًا';
  if (days === 2) return 'بعد يومين';
  return `بعد ${formatNumber(days)} أيام`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '؟';
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[1]?.[0] ?? '' : '';
  return `${first}${second}`.toUpperCase();
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function pluralCards(count: number): string {
  if (count === 0) return 'لا بطاقات';
  if (count === 1) return 'بطاقة واحدة';
  if (count === 2) return 'بطاقتان';
  if (count <= 10) return `${formatNumber(count)} بطاقات`;
  return `${formatNumber(count)} بطاقة`;
}

export function pluralDays(count: number): string {
  if (count === 0) return 'أقل من يوم';
  if (count === 1) return 'يوم واحد';
  if (count === 2) return 'يومان';
  if (count <= 10) return `${formatNumber(count)} أيام`;
  return `${formatNumber(count)} يومًا`;
}

export function pluralExercises(count: number): string {
  if (count === 1) return 'تمرين واحد';
  if (count === 2) return 'تمرينان';
  if (count <= 10) return `${formatNumber(count)} تمارين`;
  return `${formatNumber(count)} تمرينًا`;
}

export function safeNextPath(from: unknown): string {
  if (typeof from === 'string' && from.startsWith('/app') && !from.startsWith('//')) return from;
  return '/app/dashboard';
}
