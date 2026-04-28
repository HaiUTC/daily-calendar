import 'dotenv/config';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const config = {
  telegramToken: requireEnv('TELEGRAM_BOT_TOKEN'),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  targetChatId: parseInt(requireEnv('TARGET_CHAT_ID'), 10),
  timezone: process.env['TIMEZONE'] ?? 'Asia/Ho_Chi_Minh',

  cron: {
    morningMenu: process.env['CRON_MORNING'] ?? '0 7 * * *',
    eveningRemind: process.env['CRON_EVENING'] ?? '0 20 * * *',
    nightSummary: process.env['CRON_NIGHT'] ?? '0 23 * * *',
  },
} as const;
