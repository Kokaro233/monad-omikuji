import { createClient } from "@supabase/supabase-js";
import { runtime, runtimeMode } from "@/src/lib/runtime";
import type { DrawResult } from "@/src/types";

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

interface CloudFortuneRow {
  id: string;
  fortune_id: number;
  tx_hash: string;
  block_number: string | number;
  chain_id: number;
  favorite: boolean;
  created_at: string;
  wallets: { wallet_address: string } | { wallet_address: string }[] | null;
}

export async function loadCloudAccount() {
  if (!supabase) return null;
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;

  const [profileResponse, fortuneResponse] = await Promise.all([
    supabase.from("profiles").select("username,avatar").eq("id", user.id).maybeSingle(),
    supabase.from("fortunes").select("id,fortune_id,tx_hash,block_number,chain_id,favorite,created_at,wallets(wallet_address)").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (profileResponse.error) throw profileResponse.error;
  if (fortuneResponse.error) throw fortuneResponse.error;

  const fortunes = ((fortuneResponse.data ?? []) as CloudFortuneRow[]).map<DrawResult>((row) => {
    const wallet = Array.isArray(row.wallets) ? row.wallets[0] : row.wallets;
    return {
      id: row.id,
      fortuneId: row.fortune_id,
      walletAddress: wallet?.wallet_address ?? "",
      txHash: row.tx_hash,
      blockNumber: String(row.block_number),
      createdAt: row.created_at,
      chainId: row.chain_id,
      claimed: true,
      favorite: row.favorite,
      mode: "live",
    };
  });

  return {
    user,
    profile: profileResponse.data,
    fortunes,
  };
}

export async function updateCloudFavorite(id: string, favorite: boolean) {
  if (!supabase) return;
  const { error } = await supabase.from("fortunes").update({ favorite }).eq("id", id);
  if (error) throw error;
}
