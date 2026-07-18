"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Coins, Gauge, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Frame, useOmikuji } from "@/src/components/OmikujiApp";
import { runtimeMode } from "@/src/lib/runtime";
import { supabase } from "@/src/lib/supabase";

export function HomeView() {
  const { navigate } = useOmikuji();
  const [onchainDrawCount, setOnchainDrawCount] = useState<number | null>(null);
  const [guestDrawCount, setGuestDrawCount] = useState<number | null>(null);
  const [countUnavailable, setCountUnavailable] = useState(false);

  useEffect(() => {
    if (runtimeMode !== "live" || !supabase) return;
    const client = supabase;
    let cancelled = false;
    async function readVerifiedCount() {
      try {
        const [verifiedResponse, guestResponse] = await Promise.all([
          client.rpc("get_verified_fortune_count"),
          client.rpc("get_guest_fortune_count"),
        ]);
        if (verifiedResponse.error) throw verifiedResponse.error;
        if (!cancelled) {
          setOnchainDrawCount(Number(verifiedResponse.data ?? 0));
          setGuestDrawCount(guestResponse.error ? null : Number(guestResponse.data ?? 0));
        }
      } catch {
        if (!cancelled) setCountUnavailable(true);
      }
    }
    void readVerifiedCount();
    return () => { cancelled = true; };
  }, []);

  const countLabel = runtimeMode === "demo"
    ? "演示模式不计入链上"
    : countUnavailable
      ? "待同步验证数据接口"
      : "已核验 Monad 成功交易";
  const totalDrawCount = onchainDrawCount === null
    ? null
    : onchainDrawCount + (guestDrawCount ?? 0);
  return (
    <div className="home-layout">
      <aside className="home-left">
        <motion.div className="hero-title" initial={{ x: -28, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <span className="eyebrow">月光写下的祝福</span>
          <h1><small>Monad</small>Omikuji</h1>
          <p>来抽取你的链上运势签吧～</p>
        </motion.div>
        <Frame>
          <h2 className="panel-title"><Sparkles size={16}/> 如何抽签</h2>
          <ol className="steps">
            <li><b>1</b><span>连接你的钱包</span></li>
            <li><b>2</b><span>诚心抽取御神签</span></li>
            <li><b>3</b><span>签运记录于 Monad</span></li>
            <li><b>4</b><span>收藏并分享祝福</span></li>
          </ol>
        </Frame>
        <div className="fortune-count">
          <span>✦ 已验证御签总数</span>
          <strong>{onchainDrawCount === null ? "—" : onchainDrawCount.toLocaleString()} <i>✿</i></strong>
          <small>{countLabel}</small>
          {totalDrawCount !== null && guestDrawCount !== null && guestDrawCount > 0 && <em>链上与访客祈愿共 {totalDrawCount.toLocaleString()} 份</em>}
        </div>
      </aside>

      <section className="maiden-stage">
        <motion.div className="maiden-character home-character" animate={{ y: [0, -8, 0], scale: [1, 1.008, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <img src="/assets/maiden-idle.png" alt="Shrine maiden welcoming you" className="maiden maiden-idle" />
          <span className="monad-rune home-rune" aria-label="Monad 御守徽章" />
        </motion.div>
        <motion.img src="/assets/fortune-box.png" alt="Omikuji fortune box" className="home-fortune-box" animate={{ y: [0, -3, 0] }} transition={{ duration: 2.2, repeat: Infinity }} />
        <button className="primary-button hero-cta" onClick={() => navigate("draw")}><span>✦</span> 求取御神签 <span>✦</span></button>
        <p className="once-note">每个钱包每日可求十签 · 每日 00:00 刷新</p>
      </section>

      <aside className="home-right">
        <Frame>
          <h2 className="panel-title">Monad 网络</h2>
          <ul className="network-list">
            <li><Gauge size={16}/> 快速确认</li>
            <li><Coins size={16}/> 低成本交互</li>
            <li><BadgeCheck size={16}/> 兼容 EVM</li>
            <li><Sparkles size={16}/> 为创造者而生</li>
          </ul>
        </Frame>
        <div className="daily-blessing"><span>✦ 今日祝福 ✦</span><p>福运总会眷顾<br/>勇敢前行的人。</p></div>
      </aside>
    </div>
  );
}
