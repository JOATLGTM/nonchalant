import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;

// Lazy init so the app still boots when env vars are missing in dev.
// `createClient` throws synchronously on an empty URL, which would otherwise
// take down the entire module graph and leave a blank screen.
function getSupabase(): SupabaseClient {
  if (client) return client;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in app/.env.local'
    );
  }
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  return client;
}

export const supabase = {
  from: (table: string) => getSupabase().from(table),
};
