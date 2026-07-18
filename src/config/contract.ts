export const fortuneContractAbi = [
  { type: "error", name: "DailyLimitReached", inputs: [{ name: "nextDrawTimestamp", type: "uint256" }] },
  { type: "function", name: "MAX_DAILY_DRAWS", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "drawFortune", stateMutability: "nonpayable", inputs: [], outputs: [{ name: "fortuneId", type: "uint256" }] },
  { type: "function", name: "canDraw", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "drawsPerDay", stateMutability: "view", inputs: [{ name: "user", type: "address" }, { name: "day", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "getLatestFortune", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "wallet", type: "address" }, { name: "fortuneId", type: "uint256" }, { name: "timestamp", type: "uint256" }] },
  { type: "event", name: "FortuneDrawn", anonymous: false, inputs: [{ indexed: true, name: "user", type: "address" }, { indexed: false, name: "fortuneId", type: "uint256" }, { indexed: false, name: "timestamp", type: "uint256" }] },
] as const;
