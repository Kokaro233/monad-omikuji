import "dotenv/config";
import { readFile } from "node:fs/promises";
import solc from "solc";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

if (!process.env.MONAD_PRIVATE_KEY) throw new Error("MONAD_PRIVATE_KEY is missing.");
if (!process.env.MONAD_RPC_URL) throw new Error("MONAD_RPC_URL is missing.");

const source = await readFile(new URL("../contracts/FortuneContract.sol", import.meta.url), "utf8");
const input = {
  language: "Solidity",
  sources: { "FortuneContract.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
if (errors.length) throw new Error(errors.map((entry) => entry.formattedMessage).join("\n"));

const compiled = output.contracts["FortuneContract.sol"].FortuneContract;
const privateKey = process.env.MONAD_PRIVATE_KEY.startsWith("0x")
  ? process.env.MONAD_PRIVATE_KEY
  : `0x${process.env.MONAD_PRIVATE_KEY}`;
const account = privateKeyToAccount(privateKey);
const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [process.env.MONAD_RPC_URL] } },
  blockExplorers: { default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" } },
  testnet: true,
});
const transport = http(process.env.MONAD_RPC_URL);
const publicClient = createPublicClient({ chain: monadTestnet, transport });
const walletClient = createWalletClient({ account, chain: monadTestnet, transport });

if ((await publicClient.getChainId()) !== 10143) throw new Error("RPC is not Monad Testnet (10143).");

const transactionHash = await walletClient.deployContract({
  abi: compiled.abi,
  account,
  bytecode: `0x${compiled.evm.bytecode.object}`,
});
const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash, confirmations: 2 });
if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Contract deployment reverted.");

const code = await publicClient.getCode({ address: receipt.contractAddress });
if (!code || code === "0x") throw new Error("No contract bytecode found after deployment.");
const dailyLimit = await publicClient.readContract({
  address: receipt.contractAddress,
  abi: compiled.abi,
  functionName: "MAX_DAILY_DRAWS",
});

console.log(JSON.stringify({
  deployer: account.address,
  contractAddress: receipt.contractAddress,
  transactionHash,
  blockNumber: receipt.blockNumber.toString(),
  gasUsed: receipt.gasUsed.toString(),
  dailyLimit: dailyLimit.toString(),
}, null, 2));
