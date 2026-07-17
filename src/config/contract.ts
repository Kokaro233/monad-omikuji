export const fortuneContractAbi = [
  { type: "function", name: "drawFortune", stateMutability: "nonpayable", inputs: [], outputs: [{ name: "fortuneId", type: "uint256" }] },
  { type: "function", name: "canDraw", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "getLatestFortune", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "wallet", type: "address" }, { name: "fortuneId", type: "uint256" }, { name: "timestamp", type: "uint256" }] },
  { type: "event", name: "FortuneDrawn", anonymous: false, inputs: [{ indexed: true, name: "user", type: "address" }, { indexed: false, name: "fortuneId", type: "uint256" }, { indexed: false, name: "timestamp", type: "uint256" }] },
] as const;
