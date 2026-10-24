import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Supabase Client Initialization
 * Gracefully defaults to null when Supabase credentials are not provided,
 * allowing the application to operate in local-auth mode.
 */
export const supabase: SupabaseClient | null =
  env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY)
    ? createClient(env.SUPABASE_URL, (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY)!)
    : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

/**
 * Validates a Bearer token with Supabase Auth if Supabase is active.
 * Returns verified user profile or null if token is not a Supabase JWT.
 */
export async function verifySupabaseToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }

    return {
      userId: data.user.id,
      email: data.user.email || '',
    };
  } catch {
    return null;
  }
}
