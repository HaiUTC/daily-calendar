import { supabase } from './client';
import { ACTIVITIES, ACTIVITY_GOALS_SECS } from '../types';
import type { ActivityType, DailyProgress } from '../types';

function buildProgress(
  totals: Map<ActivityType, number>,
  goalMultiplier: number = 1
): DailyProgress[] {
  return ACTIVITIES.map((activity) => {
    const totalSecs = totals.get(activity) ?? 0;
    const goalSecs = ACTIVITY_GOALS_SECS[activity] * goalMultiplier;
    const pct = Math.min(100, Math.round((totalSecs / goalSecs) * 100));
    const remaining = Math.max(0, goalSecs - totalSecs);
    const overtime = Math.max(0, totalSecs - goalSecs);
    return { activity, totalSecs, goalSecs, pct, remaining, overtime };
  });
}

async function queryTotals(
  chatId: number,
  fromDate: string,
  toDate: string
): Promise<Map<ActivityType, number>> {
  const { data, error } = await supabase
    .from('activity_sessions')
    .select('activity, duration_secs')
    .eq('chat_id', chatId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .not('ended_at', 'is', null);

  if (error) throw new Error(`queryTotals: ${error.message}`);

  const totals = new Map<ActivityType, number>();
  for (const row of (data ?? []) as { activity: ActivityType; duration_secs: number }[]) {
    totals.set(row.activity, (totals.get(row.activity) ?? 0) + row.duration_secs);
  }
  return totals;
}

export async function getDailyProgress(chatId: number, date: string): Promise<DailyProgress[]> {
  const totals = await queryTotals(chatId, date, date);
  return buildProgress(totals, 1);
}

export async function getWeeklyProgress(
  chatId: number,
  weekStart: string,
  weekEnd: string
): Promise<DailyProgress[]> {
  const totals = await queryTotals(chatId, weekStart, weekEnd);
  return buildProgress(totals, 7);
}

export async function getMonthlyCumulative(
  chatId: number,
  month: string
): Promise<DailyProgress[]> {
  const year = parseInt(month.slice(0, 4));
  const monthNum = parseInt(month.slice(5, 7));
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const now = new Date();
  const daysElapsed =
    now.getFullYear() === year && now.getMonth() === monthNum - 1
      ? now.getDate()
      : daysInMonth;

  const monthEnd = `${month.slice(0, 7)}-${String(daysInMonth).padStart(2, '0')}`;
  const totals = await queryTotals(chatId, month, monthEnd);
  return buildProgress(totals, daysElapsed);
}
