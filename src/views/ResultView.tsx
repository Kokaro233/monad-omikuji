"use client";

import { motion } from "framer-motion";
import { BadgeCheck, ExternalLink, Heart, RotateCcw, Share2 } from "lucide-react";
import { useState } from "react";
import { useOmikuji } from "@/src/components/OmikujiApp";
import { getFortune, stars } from "@/src/lib/fortunes";
import { runtime, shortAddress } from "@/src/lib/runtime";

export function ResultView() {
  const { lastResult, navigate, toggleFavorite } = useOmikuji();
  const [shared, setShared] = useState(false);
  if (!lastResult) return <div className="empty-state"><span>?</span><h1>还没有揭晓御签</h1><p>走进神社，让命运为你选择一条道路。</p><button className="primary-button" onClick={() => navigate("draw")}>前往抽签</button></div>;
  const fortune = getFortune(lastResult.fortuneId);

  async function share() {
    const text = `我的 Monad 御神签是「${fortune.kanji} · ${fortune.nameZh}」！`;
    try {
      if (navigator.share) await navigator.share({ title: "Monad Omikuji", text, url: window.location.href });
      else await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      setShared(true);
    } catch { /* share cancelled */ }
  }

  return (
    <div className={`result-layout theme-${fortune.theme}`}>
      <section className="result-card-wrap">
        <div className="fortune-stage">
          <div className="result-rays" aria-hidden="true" />
          <div className="result-label">你的御神签</div>
          <motion.article className="fortune-card" initial={{ rotateY: 90, scale: .7 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: "spring", stiffness: 90, damping: 13 }}>
            <div className="card-corner top-left">❀</div><div className="card-corner top-right">❀</div>
            <span className="rarity">{fortune.rarity}</span>
            <h1>{fortune.kanji}</h1>
            <h2>{fortune.nameZh}</h2>
            <div className="divider">✦</div>
            <dl className="stats">
              <div><dt>事业</dt><dd>{stars(fortune.career)}</dd></div>
              <div><dt>姻缘</dt><dd>{stars(fortune.love)}</dd></div>
              <div><dt>财运</dt><dd>{stars(fortune.wealth)}</dd></div>
            </dl>
            <p>{fortune.messageZh}</p><small>{fortune.message}</small>
            <div className="card-flower">✿</div>
          </motion.article>
        </div>
        <div className="result-actions">
          <button className="red-button" onClick={share}><Share2 size={17}/>{shared ? "已复制" : "分享御签"}</button>
          <button className="purple-button" onClick={() => navigate("draw")}><RotateCcw size={17}/> 再求一签</button>
          <button className={`favorite-button ${lastResult.favorite ? "active" : ""}`} aria-label="Favorite this fortune" onClick={() => toggleFavorite(lastResult.id)}><Heart size={19} fill={lastResult.favorite ? "currentColor" : "none"}/></button>
        </div>
      </section>

      <aside className="verification-panel">
        <h2><BadgeCheck/> 已由 Monad 验证</h2>
        <dl><div><dt>钱包</dt><dd>{shortAddress(lastResult.walletAddress)}</dd></div><div><dt>交易哈希</dt><dd>{shortAddress(lastResult.txHash)}</dd></div><div><dt>区块</dt><dd>{lastResult.blockNumber ?? "演示"}</dd></div><div><dt>时间</dt><dd>{new Date(lastResult.createdAt).toLocaleString("zh-CN")}</dd></div></dl>
        {lastResult.mode === "live" ? <a href={`${runtime.explorerUrl}/tx/${lastResult.txHash}`} target="_blank" rel="noreferrer">查看链上交易 <ExternalLink size={14}/></a> : <div className="demo-proof">演示凭证 · 配置真实服务后即可进行链上验证</div>}
      </aside>
      <div className="recorded-note">⚡ 这支御签已永久记录{lastResult.mode === "live" ? "于链上" : "在你的演示收藏中"}。</div>
      <div className="result-footer-blessing" aria-label="御签收尾祝福">
        <span>✿</span><p>愿今日之签，照亮你前行的路。</p>
        <button onClick={() => navigate("collection")}>收入御签阁</button>
      </div>
    </div>
  );
}
