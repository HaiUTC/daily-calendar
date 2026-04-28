import { createSession, endSession, getActiveSession } from '../db/sessions';
import type { ActiveSession, ActivityType } from '../types';

function buildActiveSession(row: {
  id: string;
  activity: ActivityType;
  started_at: string;
}): ActiveSession {
  const startedAt = new Date(row.started_at);
  const elapsedSecs = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  return { sessionId: row.id, activity: row.activity, startedAt, elapsedSecs };
}

export async function startActivity(
  chatId: number,
  activity: ActivityType
): Promise<ActiveSession> {
  const existing = await getActiveSession(chatId);
  if (existing) {
    const startedAt = new Date(existing.started_at);
    const ageMs = Date.now() - startedAt.getTime();
    const cappedEnd =
      ageMs > 12 * 3600 * 1000
        ? new Date(startedAt.getTime() + 12 * 3600 * 1000)
        : new Date();
    await endSession(existing.id, startedAt, cappedEnd);
  }

  const now = new Date();
  const sessionId = await createSession(chatId, activity, now);
  return { sessionId, activity, startedAt: now, elapsedSecs: 0 };
}

export async function stopActivity(
  chatId: number
): Promise<{ activity: ActivityType; durationSecs: number } | null> {
  const existing = await getActiveSession(chatId);
  if (!existing) return null;

  const startedAt = new Date(existing.started_at);
  const durationSecs = await endSession(existing.id, startedAt, new Date());
  return { activity: existing.activity, durationSecs };
}

export async function switchActivity(
  chatId: number,
  newActivity: ActivityType
): Promise<{
  stopped: { activity: ActivityType; durationSecs: number } | null;
  started: ActiveSession;
}> {
  const stopped = await stopActivity(chatId);
  const started = await startActivity(chatId, newActivity);
  return { stopped, started };
}

export async function getStatus(chatId: number): Promise<ActiveSession | null> {
  const row = await getActiveSession(chatId);
  if (!row) return null;
  return buildActiveSession(row);
}
