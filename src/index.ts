import 'dotenv/config';
import { createBot } from './bot/bot';
import { startCronJobs } from './jobs/cron';

async function main(): Promise<void> {
  const bot = createBot();
  startCronJobs(bot);

  process.once('SIGINT', () => bot.stop());
  process.once('SIGTERM', () => bot.stop());

  console.log('Bot starting...');
  await bot.start({
    onStart: (info) => console.log(`Bot @${info.username} is running`),
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
