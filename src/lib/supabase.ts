import { createClient } from "@supabase/supabase-js";
import { runtime, runtimeMode } from "@/src/lib/runtime";

export const supabase = runtimeMode === "live"
  ? createClient(runtime.supabaseUrl, runtime.supabaseAnonKey, {
      auth: { persistSession: true, detectSessionInUrl: true },
    })
  : null;

export async function requestMagicLink(email: string) {
  if (!supabase) return { demo: true };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/profile` },
  });
  if (error) throw error;
  return { demo: false };
}

export async function signInWithGoogle() {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/profile` },
  });
  if (error) throw error;
}
