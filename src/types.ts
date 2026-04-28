export type ActivityType = 'work' | 'study' | 'exercise' | 'reading';

export const ACTIVITIES: ActivityType[] = ['work', 'study', 'exercise', 'reading'];

export const ACTIVITY_GOALS_SECS: Record<ActivityType, number> = {
  work: 14400,
  study: 32400,
  exercise: 4500,
  reading: 3600,
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  work: '💼 Work',
  study: '📚 Study',
  exercise: '🏃 Exercise',
  reading: '📖 Reading',
};

export interface SessionRow {
  id: string;
  chat_id: number;
  activity: ActivityType;
  started_at: string;
  ended_at: string | null;
  duration_secs: number;
  date: string;
  created_at: string;
}

export interface BotUserRow {
  chat_id: number;
  username: string | null;
  timezone: string;
  registered_at: string;
}

export interface ActiveSession {
  sessionId: string;
  activity: ActivityType;
  startedAt: Date;
  elapsedSecs: number;
}

export interface DailyProgress {
  activity: ActivityType;
  totalSecs: number;
  goalSecs: number;
  pct: number;       // capped at 100
  remaining: number; // 0 khi đã đạt hoặc vượt mục tiêu
  overtime: number;  // giây vượt quá mục tiêu, 0 nếu chưa đạt
}
