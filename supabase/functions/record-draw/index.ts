import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createPublicClient, decodeEventLog, http } from "https://esm.sh/viem@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const contractAbi = [{
  type: "event",
  name: "FortuneDrawn",
  anonymous: false,
  inputs: [
    { indexed: true, name: "user", type: "address" },
    { indexed: false, name: "fortuneId", type: "uint256" },
    { indexed: false, name: "timestamp", type: "uint256" },
  ],
}] as const;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await request.json();
    const txHash = String(body.txHash ?? "").toLowerCase();
    const chainId = Number(body.chainId ?? 10143);
    if (!/^0x[0-9a-f]{64}$/.test(txHash) || chainId !== 10143) {
      return json({ error: "Invalid transaction hash or chain" }, 400);
    }

    const rpcUrl = Deno.env.get("MONAD_RPC_URL");
    const contractAddress = Deno.env.get("CONTRACT_ADDRESS")?.toLowerCase();
    if (!rpcUrl || !contractAddress) return json({ error: "Indexer is not configured" }, 500);

    const client = createPublicClient({ transport: http(rpcUrl) });
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (receipt.status !== "success") return json({ error: "Transaction did not succeed" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const recorded = [];
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contractAddress) continue;
      try {
        const decoded = decodeEventLog({ abi: contractAbi, data: log.data, topics: log.topics });
        if (decoded.eventName !== "FortuneDrawn") continue;
        const record = {
          wallet_address: decoded.args.user.toLowerCase(),
          fortune_id: Number(decoded.args.fortuneId),
          tx_hash: txHash,
          log_index: log.logIndex,
          block_number: receipt.blockNumber.toString(),
          chain_id: chainId,
          created_at: new Date(Number(decoded.args.timestamp) * 1000).toISOString(),
        };
        const { error } = await supabase
          .from("verified_fortune_draws")
          .upsert(record, { onConflict: "chain_id,tx_hash,log_index", ignoreDuplicates: true });
        if (error) throw error;
        recorded.push(record);
      } catch (error) {
        if (error instanceof Error && error.message.includes("verified_fortune_draws")) throw error;
      }
    }

    if (!recorded.length) return json({ error: "No FortuneDrawn event found for this contract" }, 404);
    return json({ recorded });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to verify transaction" }, 400);
  }
});
