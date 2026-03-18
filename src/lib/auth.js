import { createClient } from "@supabase/supabase-js";

let supabaseClient;
let publicOtpClient;

export function getSupabaseBrowserClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });

  return supabaseClient;
}

export function getSupabasePublicOtpClient() {
  if (publicOtpClient) {
    return publicOtpClient;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  }

  publicOtpClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: "picdrop-public-auth",
    },
  });

  return publicOtpClient;
}

export async function getSession() {
  const client = getSupabaseBrowserClient();
  await client.auth.initialize();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session || null;
}

export async function getAccessToken() {
  const session = await getSession();
  return session?.access_token || "";
}

export async function signInWithGoogle() {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/admin`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const client = getSupabaseBrowserClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getPublicOtpSession() {
  const client = getSupabasePublicOtpClient();
  await client.auth.initialize();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session || null;
}

export async function sendPublicEmailOtp(email, emailRedirectTo) {
  const client = getSupabasePublicOtpClient();
  const { data, error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}
