import { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';
export type { SupabaseClient, SupabaseClientOptions };
export declare function createSupabaseClient(url: string, anonKey: string, options?: SupabaseClientOptions<'public'>): SupabaseClient;
