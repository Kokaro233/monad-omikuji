import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: { version: "0.8.28" },
      production: { version: "0.8.28", settings: { optimizer: { enabled: true, runs: 200 } } },
    },
  },
  networks: {
    hardhatMainnet: { type: "edr-simulated", chainType: "l1" },
    monadTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("MONAD_RPC_URL"),
      accounts: [configVariable("MONAD_PRIVATE_KEY")],
    },
  },
});
