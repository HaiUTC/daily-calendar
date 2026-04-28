import type { Bot } from 'grammy';
import { getActiveSession } from '../db/sessions';
import { getCompletedTodaySecs } from '../services/summaryService';
import { ACTIVITY_GOALS_SECS } from '../types';
import { buildActiveKeyboard, buildOvertimeKeyboard } from './keyboards';
import { activeStateText, overtimeNotificationText } from './messages';
import type { ActiveSession } from '../types';

const UPDATE_INTERVAL_MS = 60_000;
const OVERTIME_THRESHOLD_SECS = 5 * 60; // 5 phút

const timers = new Map<number, NodeJS.Timeout>();

// null   = chưa gửi thông báo, đang theo dõi
// -1     = đã gửi thông báo, đang chờ user phản hồi
// number = user chọn "Tiếp tục", gửi lại sau timestamp này
const overtimeState = new Map<number, number | null>();

export function scheduleNextOvertimeNotify(chatId: number): void {
  overtimeState.set(chatId, Date.now() + OVERTIME_THRESHOLD_SECS * 1000);
}

export function clearOvertimeState(chatId: number): void {
  overtimeState.delete(chatId);
}

export function startTimer(chatId: number, messageId: number, bot: Bot): void {
  stopTimer(chatId);

  const interval = setInterval(async () => {
    try {
      const row = await getActiveSession(chatId);
      if (!row) {
        stopTimer(chatId);
        return;
      }

      const startedAt = new Date(row.started_at);
      const elapsedSecs = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      const session: ActiveSession = {
        sessionId: row.id,
        activity: row.activity,
        startedAt,
        elapsedSecs,
      };

      const completedSecs = await getCompletedTodaySecs(chatId, row.activity);
      const totalTodaySecs = completedSecs + elapsedSecs;

      // Cập nhật timer message
      try {
        await bot.api.editMessageText(
          chatId,
          messageId,
          activeStateText(session, totalTodaySecs),
          { reply_markup: buildActiveKeyboard(row.activity) }
        );
      } catch (e: unknown) {
        const err = e as { description?: string };
        if (!err?.description?.includes('not modified')) {
          console.error('Timer update error:', err?.description ?? e);
          stopTimer(chatId);
          return;
        }
      }

      // Kiểm tra overtime
      const goalSecs = ACTIVITY_GOALS_SECS[row.activity];
      const overtimeSecs = totalTodaySecs - goalSecs;

      if (overtimeSecs >= OVERTIME_THRESHOLD_SECS) {
        const state = overtimeState.get(chatId) ?? null;
        const shouldNotify = state === null || (state !== -1 && Date.now() >= state);

        if (shouldNotify) {
          await bot.api.sendMessage(
            chatId,
            overtimeNotificationText(row.activity, overtimeSecs),
            { reply_markup: buildOvertimeKeyboard() }
          );
          overtimeState.set(chatId, -1); // chờ phản hồi
        }
      }
    } catch (e) {
      console.error('Timer tick error:', e);
    }
  }, UPDATE_INTERVAL_MS);

  timers.set(chatId, interval);
}

export function stopTimer(chatId: number): void {
  const existing = timers.get(chatId);
  if (existing) {
    clearInterval(existing);
    timers.delete(chatId);
  }
  clearOvertimeState(chatId);
}
