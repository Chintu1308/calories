import { createClient, type SupabaseClient, type User as SupabaseAuthUser } from '@supabase/supabase-js';
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

/**
 * Retrieves a user record by ID from Supabase Auth admin API.
 */
export async function getSupabaseUserById(userId: string): Promise<SupabaseAuthUser | null> {
  if (!supabase || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  } catch (err) {
    console.warn('[Supabase] Failed to fetch user by ID:', err);
    return null;
  }
}

/**
 * Updates Terms & Conditions and Privacy Policy acceptance status and timestamp in Supabase Auth user_metadata.
 */
export async function updateSupabaseUserTerms(
  userId: string,
  termsAccepted: boolean,
  termsAcceptedAt: string
): Promise<boolean> {
  if (!supabase || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }

  try {
    const existing = await getSupabaseUserById(userId);
    const existingMetadata = existing?.user_metadata || {};

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existingMetadata,
        termsAccepted,
        termsAcceptedAt,
      },
    });

    if (error) {
      console.warn('[Supabase Terms Update] Error updating user_metadata:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[Supabase Terms Update] Exception:', err);
    return false;
  }
}
