import { createClient } from "npm:@supabase/supabase-js@2";

export function getSupabaseUrl() {
  const value = Deno.env.get("SUPABASE_URL");
  if (!value) throw new Error("SUPABASE_URL is not set");
  return value;
}

export function getPublishableKey() {
  const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (publishableKeys) {
    return JSON.parse(publishableKeys).default as string;
  }
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is not set");
  return anonKey;
}

export function getSecretKey() {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    return JSON.parse(secretKeys).default as string;
  }
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return serviceRoleKey;
}

export function userClient(accessToken: string) {
  return createClient(getSupabaseUrl(), getPublishableKey(), {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function adminClient() {
  return createClient(getSupabaseUrl(), getSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
