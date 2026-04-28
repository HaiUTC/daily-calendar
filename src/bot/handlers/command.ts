import { Bot } from 'grammy';
import { upsertUser, saveMenuMessageId } from '../../db/sessions';
import { stopActivity, getStatus } from '../../services/activityService';
import {
  getDailyProgressToday,
  getLiveWeeklyProgress,
  getMonthlyProgress,
  getCompletedTodaySecs,
  todayDate,
  currentWeekRange,
  currentMonthStart,
} from '../../services/summaryService';
import { buildMorningMenuKeyboard, buildActiveKeyboard } from '../keyboards';
import {
  morningMenuText,
  activeStateText,
  eveningReminderText,
  timeReportText,
} from '../messages';
import type { TimePeriod } from '../messages';
import { config } from '../../config';

export function registerCommandHandlers(bot: Bot): void {
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id;
    const username = ctx.from?.username ?? null;
    await upsertUser(chatId, username);

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: config.timezone });
    const sent = await ctx.reply(morningMenuText(today), {
      reply_markup: buildMorningMenuKeyboard(),
    });
    await saveMenuMessageId(chatId, sent.message_id);
  });

  bot.command('status', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = await getStatus(chatId);

    if (!session) {
      await ctx.reply('Không có hoạt động nào đang chạy.', {
        reply_markup: buildMorningMenuKeyboard(),
      });
      return;
    }

    const completedSecs = await getCompletedTodaySecs(chatId, session.activity);
    const totalTodaySecs = completedSecs + session.elapsedSecs;
    await ctx.reply(activeStateText(session, totalTodaySecs), {
      reply_markup: buildActiveKeyboard(session.activity),
    });
  });

  bot.command('summary', async (ctx) => {
    const chatId = ctx.chat.id;
    const progress = await getDailyProgressToday(chatId);
    await ctx.reply(eveningReminderText(progress));
  });

  bot.command('stop', async (ctx) => {
    const chatId = ctx.chat.id;
    const result = await stopActivity(chatId);

    if (!result) {
      await ctx.reply('Không có hoạt động nào đang chạy.');
      return;
    }

    const h = Math.floor(result.durationSecs / 3600);
    const m = Math.floor((result.durationSecs % 3600) / 60);
    await ctx.reply(
      `⏹ Đã dừng hoạt động. Thời gian: ${h}h ${String(m).padStart(2, '0')}m`,
      { reply_markup: buildMorningMenuKeyboard() }
    );
  });

  bot.command('time', async (ctx) => {
    const chatId = ctx.chat.id;
    const arg = (ctx.match ?? '').trim().toLowerCase() as TimePeriod | '';
    const period: TimePeriod = arg === 'w' || arg === 'm' ? arg : 'd';

    if (period === 'd') {
      const today = todayDate();
      const progress = await getDailyProgressToday(chatId);
      await ctx.reply(timeReportText('d', progress, { date: today }));
    } else if (period === 'w') {
      const { start, end } = currentWeekRange();
      const progress = await getLiveWeeklyProgress(chatId);
      await ctx.reply(timeReportText('w', progress, { weekStart: start, weekEnd: end }));
    } else {
      const month = currentMonthStart();
      const progress = await getMonthlyProgress(chatId);
      await ctx.reply(timeReportText('m', progress, { month }));
    }
  });
}
