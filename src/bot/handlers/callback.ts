import { Bot } from 'grammy';
import { startActivity, stopActivity, switchActivity } from '../../services/activityService';
import { getCompletedTodaySecs } from '../../services/summaryService';
import { buildMorningMenuKeyboard, buildActiveKeyboard } from '../keyboards';
import { activeStateText, switchFooterText, formatHM } from '../messages';
import { ACTIVITY_LABELS, ACTIVITIES } from '../../types';
import { startTimer, stopTimer, scheduleNextOvertimeNotify } from '../timerManager';
import type { ActivityType } from '../../types';

export function registerCallbackHandlers(bot: Bot): void {
  bot.callbackQuery(/^start:(.+)$/, async (ctx) => {
    const activity = ctx.match[1] as ActivityType;
    if (!ACTIVITIES.includes(activity)) {
      await ctx.answerCallbackQuery('Hoạt động không hợp lệ.');
      return;
    }

    const chatId = ctx.chat!.id;
    const session = await startActivity(chatId, activity);
    const completedSecs = await getCompletedTodaySecs(chatId, activity);
    const totalTodaySecs = completedSecs + session.elapsedSecs;

    await ctx.editMessageText(activeStateText(session, totalTodaySecs), {
      reply_markup: buildActiveKeyboard(activity),
    });

    const messageId = ctx.callbackQuery.message?.message_id;
    if (messageId) startTimer(chatId, messageId, bot);

    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('stop', async (ctx) => {
    const chatId = ctx.chat!.id;
    stopTimer(chatId);

    const result = await stopActivity(chatId);
    if (!result) {
      await ctx.answerCallbackQuery('Không có hoạt động nào đang chạy.');
      return;
    }

    const label = ACTIVITY_LABELS[result.activity];
    const duration = formatHM(result.durationSecs);

    await ctx.editMessageText(
      `⏹ Đã dừng ${label} — ${duration}\n\nChọn hoạt động để tiếp tục:`,
      { reply_markup: buildMorningMenuKeyboard() }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^switch:(.+)$/, async (ctx) => {
    const newActivity = ctx.match[1] as ActivityType;
    if (!ACTIVITIES.includes(newActivity)) {
      await ctx.answerCallbackQuery('Hoạt động không hợp lệ.');
      return;
    }

    const chatId = ctx.chat!.id;
    stopTimer(chatId);

    const { stopped, started } = await switchActivity(chatId, newActivity);
    const completedSecs = await getCompletedTodaySecs(chatId, newActivity);
    const totalTodaySecs = completedSecs + started.elapsedSecs;

    const footer = switchFooterText(stopped ?? null);
    await ctx.editMessageText(activeStateText(started, totalTodaySecs) + footer, {
      reply_markup: buildActiveKeyboard(newActivity),
    });

    const messageId = ctx.callbackQuery.message?.message_id;
    if (messageId) startTimer(chatId, messageId, bot);

    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('ot_continue', async (ctx) => {
    const chatId = ctx.chat!.id;
    scheduleNextOvertimeNotify(chatId);

    await ctx.editMessageText(ctx.callbackQuery.message!.text! + '\n\n✅ Đã ghi nhận, tiếp tục nào!');
    await ctx.answerCallbackQuery('Nhắc lại sau 5 phút!');
  });

  bot.callbackQuery('ot_stop', async (ctx) => {
    const chatId = ctx.chat!.id;
    stopTimer(chatId);

    const result = await stopActivity(chatId);
    if (!result) {
      await ctx.answerCallbackQuery('Không có hoạt động nào đang chạy.');
      return;
    }

    const label = ACTIVITY_LABELS[result.activity];
    const duration = formatHM(result.durationSecs);

    await ctx.editMessageText(
      `⏹ Đã dừng ${label} — ${duration}\n\nChọn hoạt động để tiếp tục:`,
    );
    await ctx.answerCallbackQuery();

    await ctx.api.sendMessage(chatId, 'Chọn hoạt động để tiếp tục:', {
      reply_markup: buildMorningMenuKeyboard(),
    });
  });
}
