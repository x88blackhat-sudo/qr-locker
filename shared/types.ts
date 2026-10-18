/**
 * Shared API contract between the Express server and the React client.
 * Only serialisable, presentation-safe data lives here — never secrets.
 */

export type SubscriptionStatus =
  | 'not_started'
  | 'trialing'
  | 'expired'
  | 'active_paid'
  | 'cancelled';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface UserSettings {
  theme: ThemePreference;
  dailyGoalMinutes: number;
}

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  trialStartedAt: number | null;
  trialEndsAt: number | null;
  trialUsed: boolean;
  /** Whole days left in the trial (ceil), null when there is no trial. */
  daysRemaining: number | null;
  hoursRemaining: number | null;
  subscriptionProvider: string | null;
  currentPeriodEnd: number | null;
  /** Server-computed access level; never trust a client-provided value. */
  access: 'none' | 'trial' | 'paid' | 'expired';
  /** False unless a payment provider is actually wired on the server. */
  paymentsConfigured: boolean;
  /** True when the trial is in its final five days. */
  endingSoon: boolean;
}

export interface MeResponse {
  user: User;
  subscription: SubscriptionInfo;
  settings: UserSettings;
}

export interface SubjectProgress {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  icon: string;
  coefficient: number;
  progress: number;
  examPct: number;
  exercisePct: number;
  masteryPct: number;
  totals: {
    papers: number;
    completedPapers: number;
    exercises: number;
    doneExercises: number;
    cards: number;
    masteredCards: number;
    dueCards: number;
    units: number;
  };
}

export interface PlanItem {
  id: string;
  kind: 'review' | 'exercise' | 'exam' | 'series';
  title: string;
  subtitle: string;
  minutes: number;
  completed: boolean;
  href: string;
  subjectSlug: string | null;
  subjectName: string | null;
  subjectColor: string | null;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subjectName: string | null;
  subjectColor: string | null;
  at: number;
  minutes: number | null;
}

export interface WeeklyPoint {
  date: string;
  label: string;
  minutes: number;
  cards: number;
  isToday: boolean;
}

export interface DashboardResponse {
  welcomeName: string;
  dateKey: string;
  trial: SubscriptionInfo;
  overall: {
    progress: number;
    subjectCount: number;
    masteredCards: number;
    totalCards: number;
    dueNow: number;
    streakDays: number;
    studyMinutesToday: number;
    dailyGoalMinutes: number;
    completedExams: number;
    totalExams: number;
  };
  plan: {
    items: PlanItem[];
    totalMinutes: number;
    completedMinutes: number;
    completedCount: number;
  };
  attention: SubjectProgress[];
  reviews: {
    dueNow: number;
    dueToday: number;
    next7Days: number;
    nextDueAt: number | null;
    newCards: number;
  };
  recentActivity: ActivityItem[];
  weekly: WeeklyPoint[];
  primaryAction: { href: string; label: string; hint: string };
}

export interface SubjectsResponse {
  subjects: SubjectProgress[];
}

export interface UnitInfo {
  id: string;
  title: string;
  description: string;
  progress: number;
  exerciseCount: number;
  doneExercises: number;
  cardCount: number;
  masteredCards: number;
  seriesCount: number;
}

export type ExamSession = 'principale' | 'rattrapage' | 'blanc';

export interface ExamPaper {
  id: string;
  title: string;
  year: number;
  session: ExamSession;
  durationMinutes: number;
  totalPoints: number;
  completed: boolean;
  completedAt: number | null;
  topics: string[];
  subject: { id: string; name: string; slug: string; color: string };
}

export interface StudySeries {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  estMinutes: number;
  doneItems: number;
  unitTitle: string | null;
}

export interface ExerciseInfo {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estMinutes: number;
  status: 'todo' | 'in_progress' | 'done';
  unitTitle: string;
}

export interface SubjectDetailResponse {
  subject: SubjectProgress;
  units: UnitInfo[];
  exams: ExamPaper[];
  series: StudySeries[];
  exercises: ExerciseInfo[];
  dueCards: number;
  newCards: number;
}

export interface ExamsResponse {
  papers: ExamPaper[];
  filters: {
    years: number[];
    subjects: { id: string; name: string; slug: string; color: string }[];
    sessions: ExamSession[];
  };
  summary: { total: number; completed: number };
}

export interface ReviewCard {
  id: string;
  front: string;
  back: string;
  hint: string | null;
  subject: { name: string; slug: string; color: string };
  unitTitle: string | null;
  isNew: boolean;
  dueAt: number | null;
  repetitions: number;
}

export interface RevisionQueueResponse {
  cards: ReviewCard[];
  dueNow: number;
  dueToday: number;
  newCards: number;
  totalCards: number;
  reviewedToday: number;
  nextDueAt: number | null;
  subjectName: string | null;
}

export interface ReviewResult {
  cardId: string;
  dueAt: number;
  intervalDays: number;
  ease: number;
  repetitions: number;
  remainingDue: number;
}

export interface AnalyticsResponse {
  overall: DashboardResponse['overall'];
  subjects: SubjectProgress[];
  activity: WeeklyPoint[];
  mastery: { fresh: number; learning: number; mastered: number };
  exams: { total: number; completed: number };
  forecast: { date: string; label: string; count: number; isToday: boolean }[];
  weeklyGoal: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface AdminTrialSnapshot {
  userId: string;
  status: SubscriptionStatus;
  trialStartedAt: number | null;
  trialEndsAt: number | null;
  trialUsed: boolean;
}
