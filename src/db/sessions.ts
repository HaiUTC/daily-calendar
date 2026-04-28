import { supabase } from './client';
import { config } from '../config';
import type { ActivityType, SessionRow } from '../types';

export async function createSession(
  chatId: number,
  activity: ActivityType,
  startedAt: Date
): Promise<string> {
  const date = startedAt.toLocaleDateString('sv-SE', { timeZone: config.timezone });

  const { data, error } = await supabase
    .from('activity_sessions')
    .insert({
      chat_id: chatId,
      activity,
      started_at: startedAt.toISOString(),
      date,
    })
    .select('id')
    .single();

  if (error) throw new Error(`createSession: ${error.message}`);
  return (data as { id: string }).id;
}

export async function endSession(
  sessionId: string,
  startedAt: Date,
  endedAt: Date
): Promise<number> {
  const durationSecs = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

  const { error } = await supabase
    .from('activity_sessions')
    .update({ ended_at: endedAt.toISOString(), duration_secs: durationSecs })
    .eq('id', sessionId);

  if (error) throw new Error(`endSession: ${error.message}`);
  return durationSecs;
}

export async function getActiveSession(chatId: number): Promise<SessionRow | null> {
  const { data, error } = await supabase
    .from('activity_sessions')
    .select('*')
    .eq('chat_id', chatId)
    .is('ended_at', null)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getActiveSession: ${error.message}`);
  return data as SessionRow | null;
}

export async function getSessionsForDate(
  chatId: number,
  date: string
): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('activity_sessions')
    .select('*')
    .eq('chat_id', chatId)
    .eq('date', date)
    .not('ended_at', 'is', null);

  if (error) throw new Error(`getSessionsForDate: ${error.message}`);
  return (data ?? []) as SessionRow[];
}

export async function upsertUser(chatId: number, username: string | null): Promise<void> {
  const { error } = await supabase
    .from('bot_users')
    .upsert({ chat_id: chatId, username }, { onConflict: 'chat_id' });

  if (error) throw new Error(`upsertUser: ${error.message}`);
}

export async function getAllChatIds(): Promise<number[]> {
  const { data, error } = await supabase.from('bot_users').select('chat_id');

  if (error) throw new Error(`getAllChatIds: ${error.message}`);
  return ((data ?? []) as { chat_id: number }[]).map((r) => r.chat_id);
}

export async function saveMenuMessageId(chatId: number, messageId: number): Promise<void> {
  const { error } = await supabase
    .from('bot_users')
    .update({ last_menu_message_id: messageId })
    .eq('chat_id', chatId);

  if (error) throw new Error(`saveMenuMessageId: ${error.message}`);
}

export async function getMenuMessageId(chatId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('bot_users')
    .select('last_menu_message_id')
    .eq('chat_id', chatId)
    .maybeSingle();

  if (error) throw new Error(`getMenuMessageId: ${error.message}`);
  return (data as { last_menu_message_id: number | null } | null)?.last_menu_message_id ?? null;
}
