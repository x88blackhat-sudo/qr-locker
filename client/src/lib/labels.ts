import type { ExamSession } from '@shared/types';

export const sessionLabels: Record<ExamSession, string> = {
  principale: 'الدورة العادية',
  rattrapage: 'دورة الاستدراك',
  blanc: 'بكالوريا بيضاء',
};

export const sessionShortLabels: Record<ExamSession, string> = {
  principale: 'عادية',
  rattrapage: 'استدراك',
  blanc: 'بيضاء',
};

export const difficultyLabels = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'متقدم',
} as const;

export const difficultyClasses = {
  easy: 'chip-success',
  medium: 'chip-warning',
  hard: 'chip-danger',
} as const;

export const exerciseStatusLabels = {
  todo: 'لم يبدأ',
  in_progress: 'قيد الإنجاز',
  done: 'مكتمل',
} as const;

export const themeLabels = {
  light: 'فاتح',
  dark: 'داكن',
  system: 'حسب النظام',
} as const;

export const subscriptionStatusLabels = {
  not_started: 'لم تبدأ التجربة',
  trialing: 'تجربة مجانية نشطة',
  expired: 'انتهت التجربة',
  active_paid: 'اشتراك نشط',
  cancelled: 'اشتراك ملغى',
} as const;

export const planKindLabels = {
  review: 'مراجعة بطاقات',
  exercise: 'تمرين',
  exam: 'موضوع امتحان',
  series: 'سلسلة تمارين',
} as const;
