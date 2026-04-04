import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Returns a Supabase client using the anon key.
 * Suitable for read-only operations from the MCP server.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      getEnvOrThrow('SUPABASE_URL'),
      getEnvOrThrow('SUPABASE_ANON_KEY'),
    );
  }
  return client;
}

/**
 * Returns a Supabase client using the service role key.
 * Suitable for pipeline scripts that need to write data (bypasses RLS).
 */
export function getSupabaseServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(
      getEnvOrThrow('SUPABASE_URL'),
      getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }
  return serviceClient;
}
