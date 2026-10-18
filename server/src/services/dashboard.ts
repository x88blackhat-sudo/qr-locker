import type {
  ActivityItem,
  DashboardResponse,
  SubjectProgress,
} from '../../../shared/types';
import { db } from '../db';
import { getStreak, getActivitySeries, getMinutesToday } from './activity';
import { ensureTodayPlan } from './plan';
import {
  getOverallStats,
  getReviewCounts,
  getSubjectsProgress,
} from './progress';
import { getSubscriptionInfo, syncExpiredSubscription } from './subscription';

type SqlRow = Record<string, string | number | null>;

interface UserRow {
  name: string;
  daily_goal_minutes: number;
}

export function getRecentActivity(userId: string, limit = 6): ActivityItem[] {
  const rows = db
    .prepare(
      `SELECT a.id, a.type, a.title, a.created_at, a.minutes,
              s.name AS subject_name, s.color AS subject_color
       FROM activity_events a
       LEFT JOIN subjects s ON s.id = a.subject_id
       WHERE a.user_id = ? AND a.type <> 'review_minutes'
       ORDER BY a.created_at DESC
       LIMIT ?`,
    )
    .all(userId, limit) as SqlRow[];
  return rows.map((row) => ({
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    subjectName: row.subject_name === null ? null : String(row.subject_name),
    subjectColor: row.subject_color === null ? null : String(row.subject_color),
    at: Number(row.created_at),
    minutes: Number(row.minutes) > 0 ? Number(row.minutes) : null,
  }));
}

function pickAttentionSubjects(subjects: SubjectProgress[]): SubjectProgress[] {
  const ranked = [...subjects].sort((a, b) => a.progress - b.progress);
  const below = ranked.filter((subject) => subject.progress < 80);
  if (below.length > 0) return below.slice(0, 3);
  return ranked.filter((subject) => subject.progress < 100).slice(0, 2);
}

export function getDashboard(userId: string, now: number = Date.now()): DashboardResponse {
  syncExpiredSubscription(userId);
  const user = db
    .prepare(
      `SELECT u.name, COALESCE(us.daily_goal_minutes, 120) AS daily_goal_minutes
       FROM users u LEFT JOIN user_settings us ON us.user_id = u.id WHERE u.id = ?`,
    )
    .get(userId) as UserRow | undefined;
  if (!user) throw new Error('dashboard: user not found');

  const planItems = ensureTodayPlan(userId, now);
  const subjects = getSubjectsProgress(userId, now);
  const overall = getOverallStats(userId, now);
  const reviews = getReviewCounts(userId, now);
  const subscription = getSubscriptionInfo(userId, now);
  const weekly = getActivitySeries(userId, 7, now);
  const recentActivity = getRecentActivity(userId, 6);
  const streakDays = getStreak(userId, now);
  const studyMinutesToday = getMinutesToday(userId, now);

  const planTotal = planItems.reduce((sum, item) => sum + item.minutes, 0);
  const completedItems = planItems.filter((item) => item.completed);
  const completedMinutes = completedItems.reduce((sum, item) => sum + item.minutes, 0);

  const nextUnfinished = planItems.find((item) => !item.completed);
  let primaryAction: DashboardResponse['primaryAction'];
  if (reviews.dueNow > 0) {
    primaryAction = {
      href: '/app/revision',
      label: 'متابعة المراجعة',
      hint: `${reviews.dueNow} بطاقة مستحقة الآن`,
    };
  } else if (nextUnfinished) {
    primaryAction = {
      href: nextUnfinished.href,
      label: `متابعة: ${nextUnfinished.title}`,
      hint: `${nextUnfinished.minutes} دقيقة · ${nextUnfinished.subtitle}`,
    };
  } else if (reviews.newCards > 0) {
    primaryAction = {
      href: '/app/revision',
      label: 'ابدأ مراجعة بطاقات جديدة',
      hint: `${reviews.newCards} بطاقة في انتظارك`,
    };
  } else {
    primaryAction = {
      href: '/app/subjects',
      label: 'تصفّح المواد',
      hint: 'اختر مادة لمواصلة التقدّم',
    };
  }

  return {
    welcomeName: user.name.split(' ')[0] || user.name,
    dateKey: weekly[weekly.length - 1]?.date ?? '',
    trial: subscription,
    overall: {
      progress: overall.progress,
      subjectCount: overall.subjectCount,
      masteredCards: overall.masteredCards,
      totalCards: overall.totalCards,
      dueNow: overall.dueNow,
      streakDays,
      studyMinutesToday,
      dailyGoalMinutes: Number(user.daily_goal_minutes),
      completedExams: overall.completedExams,
      totalExams: overall.totalExams,
    },
    plan: {
      items: planItems,
      totalMinutes: planTotal,
      completedMinutes,
      completedCount: completedItems.length,
    },
    attention: pickAttentionSubjects(subjects),
    reviews: {
      dueNow: reviews.dueNow,
      dueToday: reviews.dueToday,
      next7Days: reviews.next7Days,
      nextDueAt: reviews.nextDueAt,
      newCards: reviews.newCards,
    },
    recentActivity,
    weekly,
    primaryAction,
  };
}
