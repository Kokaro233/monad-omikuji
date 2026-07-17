import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createPublicClient, decodeEventLog, http, recoverMessageAddress } from "https://esm.sh/viem@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const contractAbi = [{ type: "event", name: "FortuneDrawn", anonymous: false, inputs: [{ indexed: true, name: "user", type: "address" }, { indexed: false, name: "fortuneId", type: "uint256" }, { indexed: false, name: "timestamp", type: "uint256" }] }] as const;
const catalog = [
  ["Great Blessing", "SSR", "Great things are coming your way."], ["Rising Fortune", "SR", "A patient heart opens the gate."], ["Gentle Blessing", "SR", "Small joys gather into light."], ["Good Fortune", "R", "A kind encounter awaits."], ["Future Fortune", "R", "Your season will come."], ["Caution", "R", "Move gently today."], ["Great Caution", "R", "Even the darkest night passes."],
] as const;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Authentication required" }, 401);
    const body = await request.json();
    const address = String(body.address ?? "").toLowerCase();
    const chainId = Number(body.chainId ?? 10143);
    if (!/^0x[0-9a-f]{40}$/.test(address) || chainId !== 10143) return json({ error: "Invalid wallet or chain" }, 400);
    const action = new URL(request.url).pathname.split("/").pop();

    if (action === "nonce") {
      const nonce = crypto.randomUUID();
      const message = `Monad Omikuji Wallet Claim\nUser: ${user.id}\nWallet: ${address}\nChain: ${chainId}\nNonce: ${nonce}\nThis signature does not authorize transactions.`;
      const { error } = await supabase.from("wallet_nonces").insert({ user_id: user.id, wallet_address: address, chain_id: chainId, nonce, message });
      if (error) throw error;
      return json({ nonce, message, expiresIn: 600 });
    }

    if (action !== "verify") return json({ error: "Unknown action" }, 404);
    const { data: nonceRow, error: nonceError } = await supabase.from("wallet_nonces").select("*").eq("user_id", user.id).eq("wallet_address", address).eq("nonce", body.nonce).is("used_at", null).gt("expires_at", new Date().toISOString()).single();
    if (nonceError || !nonceRow) return json({ error: "Nonce is invalid or expired" }, 400);
    const signer = await recoverMessageAddress({ message: nonceRow.message, signature: body.signature });
    if (signer.toLowerCase() !== address) return json({ error: "Signature does not match wallet" }, 403);

    const { data: existingWallet } = await supabase.from("wallets").select("id,user_id").eq("chain_id", chainId).eq("wallet_address", address).maybeSingle();
    if (existingWallet && existingWallet.user_id !== user.id) return json({ error: "Wallet already belongs to another account" }, 409);
    const { data: wallet, error: walletError } = await supabase.from("wallets").upsert({ user_id: user.id, wallet_address: address, chain_id: chainId }, { onConflict: "chain_id,wallet_address" }).select().single();
    if (walletError) throw walletError;

    const client = createPublicClient({ transport: http(Deno.env.get("MONAD_RPC_URL")!) });
    const contractAddress = Deno.env.get("CONTRACT_ADDRESS")!.toLowerCase();
    const claimed = [];
    for (const txHash of (body.txHashes ?? []).slice(0, 20)) {
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") continue;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== contractAddress) continue;
        try {
          const decoded = decodeEventLog({ abi: contractAbi, data: log.data, topics: log.topics });
          if (decoded.eventName !== "FortuneDrawn" || decoded.args.user.toLowerCase() !== address) continue;
          const fortuneId = Number(decoded.args.fortuneId);
          const definition = catalog[fortuneId];
          if (!definition) continue;
          const record = { user_id: user.id, wallet_id: wallet.id, fortune_id: fortuneId, fortune_type: definition[0], rarity: definition[1], message: definition[2], tx_hash: txHash.toLowerCase(), log_index: log.logIndex, block_number: receipt.blockNumber.toString(), chain_id: chainId, created_at: new Date(Number(decoded.args.timestamp) * 1000).toISOString() };
          const { error } = await supabase.from("fortunes").upsert(record, { onConflict: "chain_id,tx_hash,log_index", ignoreDuplicates: true });
          if (!error) claimed.push(record);
        } catch { /* unrelated log */ }
      }
    }
    await supabase.from("wallet_nonces").update({ used_at: new Date().toISOString() }).eq("id", nonceRow.id);
    return json({ wallet, claimed });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Verification failed" }, 400);
  }
});
