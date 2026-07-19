import type { DemoProfile, DrawResult } from "@/src/types";

const HISTORY_KEY = "monad-omikuji:history:v1";
const PROFILE_KEY = "monad-omikuji:profile:v1";
const LAST_RESULT_KEY = "monad-omikuji:last-result:v1";
const GUEST_TRIALS_KEY = "monad-omikuji:guest-trials:v1";
export const GUEST_TRIAL_LIMIT = 5;
export const DAILY_DRAW_LIMIT = 10;
type GuestTrialState = { date: string; count: number };

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

function localDrawDay(date = new Date()) {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function readGuestTrials(): GuestTrialState {
  const today = localDrawDay();
  const value = read<GuestTrialState | number | null>(GUEST_TRIALS_KEY, null);
  if (!value || typeof value === "number" || value.date !== today) return { date: today, count: 0 };
  return { date: today, count: Math.min(GUEST_TRIAL_LIMIT, Math.max(0, Number(value.count) || 0)) };
}

function isDeviceGuestResult(item: DrawResult) {
  return item.mode === "demo" && item.walletAddress !== "访客体验";
}

export const storage = {
  getHistory: () => read<DrawResult[]>(HISTORY_KEY, []),
  saveHistory: (history: DrawResult[]) => localStorage.setItem(HISTORY_KEY, JSON.stringify(history)),
  getDeviceGuestHistory: () => read<DrawResult[]>(HISTORY_KEY, []).filter(isDeviceGuestResult),
  resetToDeviceGuestHistory: () => {
    const guestHistory = read<DrawResult[]>(HISTORY_KEY, []).filter(isDeviceGuestResult);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(guestHistory));
    return guestHistory;
  },
  getProfile: () => read<DemoProfile>(PROFILE_KEY, defaultProfile),
  saveProfile: (profile: DemoProfile) => localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)),
  getLastResult: () => read<DrawResult | null>(LAST_RESULT_KEY, null),
  saveLastResult: (result: DrawResult) => localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result)),
  getGuestTrialCount: () => readGuestTrials().count,
  useGuestTrial: () => {
    const current = readGuestTrials();
    const next = { date: current.date, count: Math.min(GUEST_TRIAL_LIMIT, current.count + 1) };
    localStorage.setItem(GUEST_TRIALS_KEY, JSON.stringify(next));
    return next.count;
  },
};

export function canDrawDemoToday(address: string) {
  const today = localDrawDay();
  return storage.getHistory().filter(
    (item) => item.walletAddress.toLowerCase() === address.toLowerCase() && localDrawDay(new Date(item.createdAt)) === today,
  ).length < DAILY_DRAW_LIMIT;
}

export function demoDrawsRemaining(address: string) {
  const today = localDrawDay();
  const used = storage.getHistory().filter((item) => item.walletAddress.toLowerCase() === address.toLowerCase() && localDrawDay(new Date(item.createdAt)) === today).length;
  return Math.max(0, DAILY_DRAW_LIMIT - used);
}
