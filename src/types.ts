export type RuntimeMode = "demo" | "live";
export type Rarity = "SSR" | "SR" | "R";
export type DrawPhase =
  | "ready"
  | "praying"
  | "shaking"
  | "stick"
  | "wallet"
  | "confirming"
  | "paper"
  | "revealed"
  | "error";

export interface FortuneDefinition {
  id: number;
  kanji: string;
  name: string;
  nameZh: string;
  rarity: Rarity;
  weight: number;
  career: number;
  love: number;
  wealth: number;
  message: string;
  messageZh: string;
  theme: "gold" | "rose" | "violet" | "blue" | "slate" | "red";
}

export interface FortuneStats {
  career: number;
  love: number;
  wealth: number;
}

export interface DrawResult {
  id: string;
  fortuneId: number;
  walletAddress: `0x${string}` | string;
  txHash: `0x${string}` | string;
  blockNumber?: string;
  createdAt: string;
  chainId: number;
  claimed: boolean;
  favorite: boolean;
  mode: RuntimeMode;
}

export interface WalletRecord {
  id: string;
  address: string;
  chainId: number;
  isPrimary: boolean;
  createdAt: string;
}

export type FortuneRecord = DrawResult;

export interface DemoProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  signedIn: boolean;
}

export type AppRoute = "home" | "draw" | "result" | "collection" | "profile";
