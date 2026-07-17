"use client";

import { ExternalLink, Heart, Search, SlidersHorizontal, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useOmikuji } from "@/src/components/OmikujiApp";
import { getFortune } from "@/src/lib/fortunes";
import { runtime, shortAddress } from "@/src/lib/runtime";
import type { Rarity } from "@/src/types";

export function CollectionView() {
  const { history, toggleFavorite, profile, navigate, cloudSyncing, lastCloudSync, syncCloudHistory } = useOmikuji();
  const { address } = useAccount();
  const [filter, setFilter] = useState<"ALL" | Rarity | "FAVORITES">("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const filtered = useMemo(() => history.filter((item) => {
    const fortune = getFortune(item.fortuneId);
    const matchesFilter = filter === "ALL" || (filter === "FAVORITES" ? item.favorite : fortune.rarity === filter);
    return matchesFilter && `${fortune.kanji} ${fortune.name} ${item.txHash}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => sort === "newest" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)), [history, filter, query, sort]);

  return (
    <div className="collection-shell">
      <header className="inventory-header"><div><span>✦ 神社御签阁</span><h1>我的御签收藏</h1></div><label><SlidersHorizontal size={15}/><select value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest")}><option value="newest">最新优先</option><option value="oldest">最早优先</option></select></label></header>
      <div className="inventory-body">
        <aside className="profile-sidebar">
          <div className="avatar-medallion"><img src="/assets/maiden-happy.png" alt="Profile avatar"/></div><h2>{profile.username}</h2><p><Wallet size={14}/>{shortAddress(address ?? history[0]?.walletAddress)}</p>
          <div className="collection-stats"><div><strong>{history.length}</strong><span>御签</span></div><div><strong>{history.filter((item) => getFortune(item.fortuneId).rarity === "SSR").length}</strong><span>SSR</span></div><div><strong>{history.filter((item) => item.favorite).length}</strong><span>珍藏</span></div></div>
          {profile.signedIn && <button className="collection-sync-button" disabled={cloudSyncing} onClick={() => void syncCloudHistory()}>{cloudSyncing ? "正在同步云端…" : lastCloudSync ? "✓ 已连接云端 · 点击刷新" : "同步云端御签"}</button>}
          <nav className="filter-list">{(["ALL", "SSR", "SR", "R", "FAVORITES"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "ALL" ? "✦ 全部御签" : item === "FAVORITES" ? "♥ 我的珍藏" : `✧ ${item}`}</button>)}</nav>
        </aside>
        <section className="collection-content">
          <label className="search-box"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索签运或交易哈希……"/></label>
          {filtered.length ? <div className="card-grid">{filtered.map((item) => {
            const fortune = getFortune(item.fortuneId);
            return <article className={`mini-card theme-${fortune.theme}`} key={item.id} onClick={() => { localStorage.setItem("monad-omikuji:last-result:v1", JSON.stringify(item)); window.location.href = "/result"; }}>
              <span className="mini-rarity">{fortune.rarity}</span><h2>{fortune.kanji}</h2><h3>{fortune.nameZh}</h3><p>{new Date(item.createdAt).toLocaleDateString("zh-CN")}</p>
              <button aria-label="Toggle favorite" onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id); }}><Heart size={16} fill={item.favorite ? "currentColor" : "none"}/></button>
              {item.mode === "live" && <a href={`${runtime.explorerUrl}/tx/${item.txHash}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} aria-label="Open transaction"><ExternalLink size={14}/></a>}
            </article>;
          })}</div> : <div className="collection-empty"><span>?</span><h2>这层签阁还是空的</h2><p>调整筛选条件，或去求取一份新的祝福。</p><button className="primary-button" onClick={() => navigate("draw")}>前往抽签</button></div>}
        </section>
      </div>
    </div>
  );
}
