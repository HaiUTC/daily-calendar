import { getDailyProgress, getWeeklyProgress, getMonthlyCumulative } from '../db/summaries';
import { getActiveSession } from '../db/sessions';
import { config } from '../config';
import type { DailyProgress } from '../types';

export function todayDate(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: config.timezone });
}

export function currentMonthStart(): string {
  const d = todayDate();
  return `${d.slice(0, 7)}-01`;
}

export function currentWeekRange(): { start: string; end: string } {
  const todayStr = todayDate();
  const today = new Date(todayStr);
  const dow = today.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday.toLocaleDateString('sv-SE'),
    end: sunday.toLocaleDateString('sv-SE'),
  };
}

async function addActiveElapsed(
  chatId: number,
  date: string,
  progress: DailyProgress[]
): Promise<void> {
  const active = await getActiveSession(chatId);
  if (!active) return;

  const activeDate = new Date(active.started_at).toLocaleDateString('sv-SE', {
    timeZone: config.timezone,
  });
  if (activeDate !== date) return;

  const elapsedSecs = Math.floor(
    (Date.now() - new Date(active.started_at).getTime()) / 1000
  );
  for (const p of progress) {
    if (p.activity === active.activity) {
      p.totalSecs += elapsedSecs;
      p.pct = Math.min(100, Math.round((p.totalSecs / p.goalSecs) * 100));
      p.remaining = Math.max(0, p.goalSecs - p.totalSecs);
      p.overtime = Math.max(0, p.totalSecs - p.goalSecs);
    }
  }
}

export async function getLiveDailyProgress(
  chatId: number,
  date: string
): Promise<DailyProgress[]> {
  const progress = await getDailyProgress(chatId, date);
  await addActiveElapsed(chatId, date, progress);
  return progress;
}

export async function getDailyProgressToday(chatId: number): Promise<DailyProgress[]> {
  return getLiveDailyProgress(chatId, todayDate());
}

export async function getLiveWeeklyProgress(chatId: number): Promise<DailyProgress[]> {
  const { start, end } = currentWeekRange();
  const progress = await getWeeklyProgress(chatId, start, end);
  await addActiveElapsed(chatId, todayDate(), progress);
  return progress;
}

export async function getMonthlyProgress(chatId: number): Promise<DailyProgress[]> {
  const month = currentMonthStart();
  const progress = await getMonthlyCumulative(chatId, month);
  await addActiveElapsed(chatId, todayDate(), progress);
  return progress;
}

export async function getCompletedTodaySecs(
  chatId: number,
  activity: import('../types').ActivityType
): Promise<number> {
  const progress = await getDailyProgress(chatId, todayDate());
  return progress.find((p) => p.activity === activity)?.totalSecs ?? 0;
}
