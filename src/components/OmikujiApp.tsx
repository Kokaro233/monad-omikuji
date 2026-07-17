"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, CircleUserRound, House, Menu, Sparkles, WalletCards, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount } from "wagmi";
import { Providers } from "@/src/components/Providers";
import { runtimeMode, shortAddress } from "@/src/lib/runtime";
import { defaultProfile, storage } from "@/src/lib/storage";
import { loadCloudAccount, supabase, syncBoundWalletFortunes, syncGuestFortunes, updateCloudFavorite, updateCloudGuestFavorite } from "@/src/lib/supabase";
import type { AppRoute, DemoProfile, DrawResult } from "@/src/types";
import { HomeView } from "@/src/views/HomeView";
import { DrawView } from "@/src/views/DrawView";
import { ResultView } from "@/src/views/ResultView";
import { CollectionView } from "@/src/views/CollectionView";
import { ProfileView } from "@/src/views/ProfileView";

interface AppState {
  route: AppRoute;
  navigate: (route: AppRoute) => void;
  history: DrawResult[];
  lastResult: DrawResult | null;
  addResult: (result: DrawResult) => void;
  toggleFavorite: (id: string) => void;
  profile: DemoProfile;
  setProfile: (profile: DemoProfile) => void;
  cloudSyncing: boolean;
  lastCloudSync: string | null;
  syncCloudHistory: () => Promise<number>;
}

const AppContext = createContext<AppState | null>(null);

export function useOmikuji() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useOmikuji must be used within Monad Omikuji");
  return context;
}

function routeFromPath(path: string): AppRoute {
  const segment = path.split("/").filter(Boolean)[0];
  return (["draw", "result", "collection", "profile"] as AppRoute[]).includes(segment as AppRoute)
    ? (segment as AppRoute)
    : "home";
}

function Petals() {
  return <div className="petals" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties}>✦</i>)}</div>;
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="pixel-frame"><div className="pixel-frame__inner">{children}</div></div>;
}

const routes: { key: AppRoute; label: string; icon: typeof House }[] = [
  { key: "home", label: "首页", icon: House },
  { key: "draw", label: "抽签", icon: Sparkles },
  { key: "collection", label: "御签收藏", icon: BookOpen },
  { key: "profile", label: "我的", icon: CircleUserRound },
];

function Shell() {
  const { route, navigate, history, lastResult, addResult, toggleFavorite, profile, setProfile, syncCloudHistory } = useOmikuji();
  const { address, isConnected, chain } = useAccount();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!profile.signedIn || !isConnected || !address || runtimeMode !== "live") return;
    const pending = history.filter((item) => item.mode === "live" && !item.claimed && item.walletAddress.toLowerCase() === address.toLowerCase()).map((item) => item.txHash);
    if (!pending.length) return;
    void syncBoundWalletFortunes(address, pending).then((result) => {
      if (!result.bindingRequired) return syncCloudHistory();
      return 0;
    }).catch(() => undefined);
  }, [address, history, isConnected, profile.signedIn, syncCloudHistory]);

  return (
    <main className={`game-shell route-${route}`}>
      <Petals />
      <div className="vignette" aria-hidden="true" />
      <header className="topbar">
        <button className="brand" onClick={() => navigate("home")} aria-label="Monad Omikuji home">
          <span className="brand__monad" aria-hidden="true"/><span>MONAD OMIKUJI</span>
        </button>
        <nav className={`desktop-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
          {routes.map(({ key, label }) => <button key={key} className={route === key ? "active" : ""} onClick={() => { navigate(key); setMenuOpen(false); }}>{label}</button>)}
          {lastResult && <button className={route === "result" ? "active" : ""} onClick={() => navigate("result")}>最近御签</button>}
        </nav>
        <div className="wallet-area">
          {runtimeMode === "demo" && <span className="demo-badge">DEMO MODE</span>}
          <ConnectButton.Custom>
            {({ account, chain: walletChain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              if (!mounted || !account || !walletChain) return <button className="wallet-button" onClick={openConnectModal}><WalletCards size={16} /> 连接钱包</button>;
              if (walletChain.unsupported) return <button className="wallet-button warning" onClick={openChainModal}>切换网络</button>;
              return <button className="wallet-button" onClick={openAccountModal}><span className="status-dot" />{account.displayName}</button>;
            }}
          </ConnectButton.Custom>
          <button className="menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <section className="scene" data-route={route}>
        <AnimatePresence mode="wait">
          <motion.div key={route} className="view-stage" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .28 }}>
            {route === "home" ? <HomeView /> : route === "draw" ? <DrawView /> : route === "result" ? <ResultView /> : route === "collection" ? <CollectionView /> : <ProfileView />}
          </motion.div>
        </AnimatePresence>
      </section>

      <div className="connection-pill">
        <span className={isConnected ? "online" : ""} />
        {isConnected ? `${shortAddress(address)} · ${chain?.name ?? "Monad"}` : "钱包未连接"}
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {routes.map(({ key, label, icon: Icon }) => <button key={key} className={route === key ? "active" : ""} onClick={() => navigate(key)}><Icon size={20}/><span>{label}</span></button>)}
      </nav>
    </main>
  );
}

export function OmikujiApp() {
  const [route, setRoute] = useState<AppRoute>("home");
  const [history, setHistory] = useState<DrawResult[]>([]);
  const [lastResult, setLastResult] = useState<DrawResult | null>(null);
  const [profile, setProfileState] = useState<DemoProfile>(defaultProfile);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);

  const syncCloudHistory = useCallback(async () => {
    if (!supabase) return 0;
    setCloudSyncing(true);
    try {
      await syncGuestFortunes(storage.getHistory().filter((item) => item.mode === "demo"));
      const account = await loadCloudAccount();
      if (!account) return 0;
      const nextProfile: DemoProfile = {
        id: account.user.id,
        username: account.profile?.username ?? account.user.user_metadata?.name ?? "御签守护者",
        email: account.user.email ?? "",
        avatar: account.profile?.avatar ?? "🌸",
        signedIn: true,
      };
      setProfileState(nextProfile);
      storage.saveProfile(nextProfile);
      setHistory((current) => {
        const cloudKeys = new Set(account.fortunes.map((item) => `${item.chainId}:${item.txHash.toLowerCase()}`));
        const localOnly = current.filter((item) => !cloudKeys.has(`${item.chainId}:${item.txHash.toLowerCase()}`));
        const merged = [...account.fortunes, ...localOnly].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        storage.saveHistory(merged);
        return merged;
      });
      setLastCloudSync(new Date().toISOString());
      return account.fortunes.length;
    } finally {
      setCloudSyncing(false);
    }
  }, []);

  useEffect(() => {
    setRoute(routeFromPath(window.location.pathname));
    setHistory(storage.getHistory());
    setLastResult(storage.getLastResult());
    setProfileState(storage.getProfile());
    const handlePop = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    void syncCloudHistory().catch(() => undefined);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) window.setTimeout(() => void syncCloudHistory().catch(() => undefined), 0);
      else {
        setProfileState(defaultProfile);
        storage.saveProfile(defaultProfile);
        setLastCloudSync(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [syncCloudHistory]);

  const navigate = useCallback((next: AppRoute) => {
    const path = next === "home" ? "/" : `/${next}`;
    window.history.pushState({}, "", path);
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const addResult = useCallback((result: DrawResult) => {
    setLastResult(result);
    storage.saveLastResult(result);
    setHistory((current) => {
      const next = [result, ...current.filter((item) => item.id !== result.id)];
      storage.saveHistory(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setHistory((current) => {
      const target = current.find((item) => item.id === id);
      const favorite = !(target?.favorite ?? false);
      const next = current.map((item) => item.id === id ? { ...item, favorite } : item);
      storage.saveHistory(next);
      if (target?.mode === "live" && target.claimed) void updateCloudFavorite(id, favorite).catch(() => undefined);
      if (target?.mode === "demo" && profile.signedIn) void updateCloudGuestFavorite(id, favorite).catch(() => undefined);
      if (lastResult?.id === id) {
        const updated = { ...lastResult, favorite };
        setLastResult(updated);
        storage.saveLastResult(updated);
      }
      return next;
    });
  }, [lastResult, profile.signedIn]);

  const setProfile = useCallback((next: DemoProfile) => { setProfileState(next); storage.saveProfile(next); }, []);
  const value = useMemo(() => ({ route, navigate, history, lastResult, addResult, toggleFavorite, profile, setProfile, cloudSyncing, lastCloudSync, syncCloudHistory }), [route, navigate, history, lastResult, addResult, toggleFavorite, profile, setProfile, cloudSyncing, lastCloudSync, syncCloudHistory]);

  return <Providers><AppContext.Provider value={value}><Shell /></AppContext.Provider></Providers>;
}

export { Frame };
