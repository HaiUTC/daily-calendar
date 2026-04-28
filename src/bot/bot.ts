import { Bot } from 'grammy';
import { config } from '../config';
import { registerCommandHandlers } from './handlers/command';
import { registerCallbackHandlers } from './handlers/callback';

export function createBot(): Bot {
  const bot = new Bot(config.telegramToken);

  bot.catch((err) => {
    console.error('Grammy error:', err.message, err.ctx?.update);
  });

  registerCommandHandlers(bot);
  registerCallbackHandlers(bot);

  return bot;
}
