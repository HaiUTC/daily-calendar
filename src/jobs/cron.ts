import cron from 'node-cron';
import { Bot } from 'grammy';
import { config } from '../config';
import { getAllChatIds, getActiveSession, getMenuMessageId, saveMenuMessageId } from '../db/sessions';
import { stopActivity } from '../services/activityService';
import { getLiveDailyProgress, getMonthlyProgress } from '../services/summaryService';
import { buildMorningMenuKeyboard } from '../bot/keyboards';
import { morningMenuText, eveningReminderText, nightSummaryText } from '../bot/messages';
import { stopTimer } from '../bot/timerManager';

function todayDate(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: config.timezone });
}

export function startCronJobs(bot: Bot): void {
  cron.schedule(
    config.cron.morningMenu,
    async () => {
      const chatIds = await getAllChatIds();
      const today = todayDate();
      for (const chatId of chatIds) {
        try {
          // Xoá menu ngày hôm trước nếu còn
          const oldId = await getMenuMessageId(chatId);
          if (oldId) {
            try {
              await bot.api.deleteMessage(chatId, oldId);
            } catch {
              // Message đã bị xoá hoặc quá cũ — bỏ qua
            }
          }

          const sent = await bot.api.sendMessage(chatId, morningMenuText(today), {
            reply_markup: buildMorningMenuKeyboard(),
          });
          await saveMenuMessageId(chatId, sent.message_id);
        } catch (e) {
          console.error(`Morning menu failed for ${chatId}:`, e);
        }
      }
    },
    { timezone: config.timezone }
  );

  cron.schedule(
    config.cron.eveningRemind,
    async () => {
      const chatIds = await getAllChatIds();
      const today = todayDate();
      for (const chatId of chatIds) {
        try {
          const progress = await getLiveDailyProgress(chatId, today);
          if (!progress.some((p) => p.pct < 100)) continue;
          await bot.api.sendMessage(chatId, eveningReminderText(progress));
        } catch (e) {
          console.error(`Evening reminder failed for ${chatId}:`, e);
        }
      }
    },
    { timezone: config.timezone }
  );

  cron.schedule(
    config.cron.nightSummary,
    async () => {
      const chatIds = await getAllChatIds();
      const today = todayDate();
      for (const chatId of chatIds) {
        try {
          // Dừng hoạt động đang chạy và timer trong memory
          const active = await getActiveSession(chatId);
          if (active) {
            await stopActivity(chatId);
            stopTimer(chatId);
          }

          const daily = await getLiveDailyProgress(chatId, today);
          const monthly = await getMonthlyProgress(chatId);
          await bot.api.sendMessage(chatId, nightSummaryText(daily, monthly));
        } catch (e) {
          console.error(`Night summary failed for ${chatId}:`, e);
        }
      }
    },
    { timezone: config.timezone }
  );
}
