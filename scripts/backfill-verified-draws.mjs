import { createPublicClient, http, parseAbiItem } from "viem";

const rpcUrl = process.env.MONAD_RPC_URL ?? process.env.VITE_MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const contractAddress = (process.env.CONTRACT_ADDRESS ?? process.env.VITE_CONTRACT_ADDRESS ?? "0x4be10ce76e9698978afa2414a2b65b8ed771823b").toLowerCase();
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "https://bkxspvrkkaqtdetbeuet.supabase.co";
const configuredFromBlock = process.env.FROM_BLOCK ? BigInt(process.env.FROM_BLOCK) : undefined;
const lookbackBlocks = BigInt(process.env.LOOKBACK_BLOCKS ?? "5000");
const chunkSize = BigInt(process.env.CHUNK_SIZE ?? "100");

const client = createPublicClient({ transport: http(rpcUrl) });
const event = parseAbiItem("event FortuneDrawn(address indexed user, uint256 fortuneId, uint256 timestamp)");

const latest = await client.getBlockNumber();
const fromBlock = configuredFromBlock ?? (latest > lookbackBlocks ? latest - lookbackBlocks : 0n);
let submitted = 0;
let failed = 0;
const txHashes = new Set();
let scannedChunks = 0;

for (let start = fromBlock; start <= latest; start += chunkSize + 1n) {
  const end = start + chunkSize > latest ? latest : start + chunkSize;
  const logs = await client.getLogs({
    address: contractAddress,
    event,
    fromBlock: start,
    toBlock: end,
  });
  for (const log of logs) txHashes.add(log.transactionHash.toLowerCase());
  scannedChunks += 1;
  if (scannedChunks % 20 === 0) console.log(`scanned ${start.toString()}-${end.toString()}, tx=${txHashes.size}`);
}

for (const txHash of txHashes) {
  const response = await fetch(`${supabaseUrl}/functions/v1/record-draw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash, chainId: 10143 }),
  });
  if (response.ok) submitted += 1;
  else failed += 1;
}

console.log(JSON.stringify({ contractAddress, fromBlock: fromBlock.toString(), latest: latest.toString(), found: txHashes.size, submitted, failed }, null, 2));
