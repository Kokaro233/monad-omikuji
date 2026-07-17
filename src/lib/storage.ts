import type { DemoProfile, DrawResult } from "@/src/types";

const HISTORY_KEY = "monad-omikuji:history:v1";
const PROFILE_KEY = "monad-omikuji:profile:v1";
const LAST_RESULT_KEY = "monad-omikuji:last-result:v1";

export const defaultProfile: DemoProfile = {
  id: "guest",
  username: "御签守护者",
  email: "",
  avatar: "🌸",
  signedIn: false,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

export const storage = {
  getHistory: () => read<DrawResult[]>(HISTORY_KEY, []),
  saveHistory: (history: DrawResult[]) => localStorage.setItem(HISTORY_KEY, JSON.stringify(history)),
  getProfile: () => read<DemoProfile>(PROFILE_KEY, defaultProfile),
  saveProfile: (profile: DemoProfile) => localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)),
  getLastResult: () => read<DrawResult | null>(LAST_RESULT_KEY, null),
  saveLastResult: (result: DrawResult) => localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result)),
};

export function canDrawDemoToday(address: string) {
  const today = new Date().toISOString().slice(0, 10);
  return storage.getHistory().filter(
    (item) => item.walletAddress.toLowerCase() === address.toLowerCase() && item.createdAt.slice(0, 10) === today,
  ).length < 5;
}

export function demoDrawsRemaining(address: string) {
  const today = new Date().toISOString().slice(0, 10);
  const used = storage.getHistory().filter((item) => item.walletAddress.toLowerCase() === address.toLowerCase() && item.createdAt.slice(0, 10) === today).length;
  return Math.max(0, 5 - used);
}
