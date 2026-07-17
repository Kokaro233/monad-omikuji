import { defineChain } from "viem";
import { runtime } from "@/src/lib/runtime";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [runtime.rpcUrl] } },
  blockExplorers: { default: { name: "Monad Explorer", url: runtime.explorerUrl } },
  testnet: true,
});
