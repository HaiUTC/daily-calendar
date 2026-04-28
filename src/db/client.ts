import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

export const supabase: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseKey,
  {
    auth: { persistSession: false },
  }
);
