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

export async function signOutCloudAccount() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updateCloudProfile(username: string, avatar = "🌸") {
  if (!supabase) return;
  const normalized = username.trim() || "御签守护者";
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("请先登录账户");
  const { error } = await supabase.from("profiles").update({ username: normalized, avatar }).eq("id", user.id);
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

interface CloudGuestFortuneRow {
  local_id: string;
  fortune_id: number;
  tx_hash: string;
  favorite: boolean;
  created_at: string;
}

export async function syncGuestFortunes(results: DrawResult[]) {
  if (!supabase || results.length === 0) return 0;
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return 0;
  const rows = results.filter((item) => item.mode === "demo").map((item) => ({
    user_id: user.id,
    local_id: item.id,
    fortune_id: item.fortuneId,
    tx_hash: item.txHash,
    favorite: item.favorite,
    created_at: item.createdAt,
  }));
  if (!rows.length) return 0;
  const { error } = await supabase.from("guest_fortunes").upsert(rows, { onConflict: "user_id,local_id", ignoreDuplicates: true });
  if (error) throw error;
  return rows.length;
}

export async function loadCloudAccount() {
  if (!supabase) return null;
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;

  const [profileResponse, fortuneResponse, guestResponse] = await Promise.all([
    supabase.from("profiles").select("username,avatar").eq("id", user.id).maybeSingle(),
    supabase.from("fortunes").select("id,fortune_id,tx_hash,block_number,chain_id,favorite,created_at,wallets(wallet_address)").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("guest_fortunes").select("local_id,fortune_id,tx_hash,favorite,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (profileResponse.error) throw profileResponse.error;
  if (fortuneResponse.error) throw fortuneResponse.error;
  if (guestResponse.error) throw guestResponse.error;

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

  const guestFortunes = ((guestResponse.data ?? []) as CloudGuestFortuneRow[]).map<DrawResult>((row) => ({
    id: row.local_id,
    fortuneId: row.fortune_id,
    walletAddress: "访客体验",
    txHash: row.tx_hash,
    createdAt: row.created_at,
    chainId: 10143,
    claimed: true,
    favorite: row.favorite,
    mode: "demo",
  }));

  return {
    user,
    profile: profileResponse.data,
    fortunes: [...fortunes, ...guestFortunes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function updateCloudFavorite(id: string, favorite: boolean) {
  if (!supabase) return;
  const { error } = await supabase.from("fortunes").update({ favorite }).eq("id", id);
  if (error) throw error;
}

export async function updateCloudGuestFavorite(localId: string, favorite: boolean) {
  if (!supabase) return;
  const { error } = await supabase.from("guest_fortunes").update({ favorite }).eq("local_id", localId);
  if (error) throw error;
}

export async function syncBoundWalletFortunes(address: string, txHashes: string[]) {
  if (!supabase || txHashes.length === 0) return { claimed: 0, bindingRequired: false };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { claimed: 0, bindingRequired: false };
  const response = await fetch(`${runtime.supabaseUrl}/functions/v1/wallet-claim/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ address, chainId: 10143, txHashes }),
  });
  const body = await response.json();
  if (response.status === 403 && body.code === "wallet_binding_required") return { claimed: 0, bindingRequired: true };
  if (!response.ok) throw new Error(body.error ?? "Wallet sync failed");
  return { claimed: Array.isArray(body.claimed) ? body.claimed.length : 0, bindingRequired: false };
}
