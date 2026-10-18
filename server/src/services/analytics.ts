import type { AnalyticsResponse } from '../../../shared/types';
import { db } from '../db';
import { getActivitySeries, getMinutesToday, getStreak } from './activity';
import {
  getMastery,
  getOverallStats,
  getSubjectsProgress,
} from './progress';
import { dateKey, dateKeyToStartTs, DAY_MS, shiftDateKey, weekdayShort } from '../lib/time';

export function getAnalytics(userId: string, now: number = Date.now()): AnalyticsResponse {
  const subjects = getSubjectsProgress(userId, now);
  const overallStats = getOverallStats(userId, now);
  const goalRow = db
    .prepare('SELECT daily_goal_minutes FROM user_settings WHERE user_id = ?')
    .get(userId) as { daily_goal_minutes: number } | undefined;

  const todayKey = dateKey(now);
  // Upcoming review load: today plus the next six days. Overdue cards are
  // reported on today so the student sees work that is already waiting.
  const forecastKeys = Array.from({ length: 7 }, (_, index) => shiftDateKey(todayKey, index));
  const forecastCounts = new Map<string, number>();
  forecastKeys.forEach((key) => forecastCounts.set(key, 0));

  const horizonEnd = dateKeyToStartTs(forecastKeys[forecastKeys.length - 1]) + DAY_MS;
  const dueRows = db
    .prepare('SELECT due_at FROM card_reviews WHERE user_id = ? AND due_at < ?')
    .all(userId, horizonEnd) as { due_at: number }[];
  for (const row of dueRows) {
    const due = Number(row.due_at);
    const key = due < now ? todayKey : dateKey(due);
    if (forecastCounts.has(key)) {
      forecastCounts.set(key, (forecastCounts.get(key) ?? 0) + 1);
    }
  }

  return {
    overall: {
      progress: overallStats.progress,
      subjectCount: overallStats.subjectCount,
      masteredCards: overallStats.masteredCards,
      totalCards: overallStats.totalCards,
      dueNow: overallStats.dueNow,
      streakDays: getStreak(userId, now),
      studyMinutesToday: getMinutesToday(userId, now),
      dailyGoalMinutes: Number(goalRow?.daily_goal_minutes ?? 120),
      completedExams: overallStats.completedExams,
      totalExams: overallStats.totalExams,
    },
    subjects,
    activity: getActivitySeries(userId, 14, now),
    mastery: getMastery(userId),
    exams: { total: overallStats.totalExams, completed: overallStats.completedExams },
    forecast: forecastKeys.map((key) => ({
      date: key,
      label: weekdayShort(dateKeyToStartTs(key)),
      count: forecastCounts.get(key) ?? 0,
      isToday: key === todayKey,
    })),
    weeklyGoal: Number(goalRow?.daily_goal_minutes ?? 120),
  };
}
