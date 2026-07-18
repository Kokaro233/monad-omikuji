import type { RuntimeMode } from "@/src/types";

const env = import.meta.env;
const currentContractAddress = "0x02f76e26db659657b7543898f428917a2a50caea";
const retiredContractAddresses = new Set([
  "0x3b31775c81d0da5ca59574d29c1bf86a6fda4993",
  "0x4be10ce76e9698978afa2414a2b65b8ed771823b",
]);
const configuredContractAddress = (env.VITE_CONTRACT_ADDRESS ?? "").toLowerCase();

export const runtime = {
  supabaseUrl: env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY ?? "",
  contractAddress: (configuredContractAddress && !retiredContractAddresses.has(configuredContractAddress) ? configuredContractAddress : currentContractAddress) as `0x${string}`,
  rpcUrl: env.VITE_MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz",
  explorerUrl: env.VITE_MONAD_EXPLORER_URL ?? "https://testnet.monadexplorer.com",
  walletConnectProjectId: env.VITE_WALLETCONNECT_PROJECT_ID ?? "demo-project-id",
  forceDemo: env.VITE_DEMO_MODE === "true",
  googleAuth: env.VITE_ENABLE_GOOGLE_AUTH === "true",
};

export const runtimeMode: RuntimeMode =
  runtime.forceDemo || !runtime.supabaseUrl || !runtime.supabaseAnonKey || !runtime.contractAddress
    ? "demo"
    : "live";

export const shortAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected";
