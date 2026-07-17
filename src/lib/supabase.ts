import { createClient } from "@supabase/supabase-js";
import { runtime, runtimeMode } from "@/src/lib/runtime";

export const supabase = runtimeMode === "live"
  ? createClient(runtime.supabaseUrl, runtime.supabaseAnonKey, {
      auth: { persistSession: true, detectSessionInUrl: true },
    })
  : null;

export async function requestEmailCode(email: string) {
  if (!supabase) return { demo: true };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
  return { demo: false };
}

export async function verifyEmailCode(email: string, token: string) {
  if (!supabase) return { demo: true, user: null };
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
  return { demo: false, user: data.user };
}

export async function signInWithGoogle() {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/profile` },
  });
  if (error) throw error;
}
