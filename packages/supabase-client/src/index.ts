import { createClient, SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';

export type { SupabaseClient, SupabaseClientOptions };

export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<'public'>
): SupabaseClient {
  if (!url || !anonKey) {
    console.warn('[QuickBoard Supabase] URL or Anon Key is missing. Check environment variables.');
  }
  return createClient(url, anonKey, options);
}

