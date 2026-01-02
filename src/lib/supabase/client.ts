import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Using 'any' for database type until Supabase is connected and types are generated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = any;

export function createClient(): SupabaseClient<AnyDatabase> {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton client for use in hooks
let clientInstance: SupabaseClient<AnyDatabase> | null = null;

export function getSupabaseClient(): SupabaseClient<AnyDatabase> {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}
