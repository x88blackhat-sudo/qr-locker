export const DAY_MS = 24 * 60 * 60 * 1000;
export const TZ = 'Africa/Algiers';

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const weekdayFormatter = new Intl.DateTimeFormat('ar-DZ', {
  timeZone: TZ,
  weekday: 'short',
});

const monthDayFormatter = new Intl.DateTimeFormat('ar-DZ', {
  timeZone: TZ,
  day: 'numeric',
  month: 'short',
});

const fullDateFormatter = new Intl.DateTimeFormat('ar-DZ', {
  timeZone: TZ,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** YYYY-MM-DD in the students' local timezone (Algeria, UTC+1). */
export function dateKey(ts: number = Date.now()): string {
  return dateKeyFormatter.format(new Date(ts)).replaceAll('/', '-');
}

/** Converts a YYYY-MM-DD local date back to its UTC boundary timestamp. */
export function dateKeyToStartTs(key: string): number {
  return new Date(`${key}T00:00:00+01:00`).getTime();
}

export function addDays(ts: number, days: number): number {
  return ts + days * DAY_MS;
}

export function shiftDateKey(key: string, days: number): string {
  return dateKey(dateKeyToStartTs(key) + days * DAY_MS);
}

export function weekdayShort(ts: number): string {
  return weekdayFormatter.format(new Date(ts));
}

export function monthDayShort(ts: number): string {
  return monthDayFormatter.format(new Date(ts));
}

export function fullDateAr(ts: number): string {
  return fullDateFormatter.format(new Date(ts));
}

export function daysLeftCeil(endsAt: number, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((endsAt - now) / DAY_MS));
}

export function relativeArabic(ts: number, now: number = Date.now()): string {
  const diff = now - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'أمس';
  if (days < 30) return `قبل ${days} يومًا`;
  return fullDateAr(ts);
}

export function lastNDateKeys(n: number, now: number = Date.now()): string[] {
  const today = dateKey(now);
  return Array.from({ length: n }, (_, i) => shiftDateKey(today, -(n - 1 - i)));
}
