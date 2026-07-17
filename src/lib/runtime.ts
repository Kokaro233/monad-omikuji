import type { RuntimeMode } from "@/src/types";

const env = import.meta.env;

export const runtime = {
  supabaseUrl: env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY ?? "",
  contractAddress: (env.VITE_CONTRACT_ADDRESS ?? "") as `0x${string}`,
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
