"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { decodeEventLog } from "viem";
import { useAccount, useChainId, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useOmikuji } from "@/src/components/OmikujiApp";
import { fortuneContractAbi } from "@/src/config/contract";
import { drawWeightedFortune } from "@/src/lib/fortunes";
import { runtime, runtimeMode } from "@/src/lib/runtime";
import { canDrawDemoToday } from "@/src/lib/storage";
import type { DrawPhase, DrawResult } from "@/src/types";

const dialogue: Record<DrawPhase, string> = {
  ready: "放缓呼吸，待心绪澄明，便可开始。",
  praying: "你的愿望，已经传达至神社……",
  shaking: "御神签正在聆听命运的回响……",
  stick: "万千道路中，有一条选择了你。",
  wallet: "请在钱包中确认这场祈愿仪式。",
  confirming: "正在等待 Monad 链上确认……",
  paper: "你的命运，正在被缓缓写下……",
  revealed: "神明已作出回应。",
  error: "仪式暂时中断，可以重新尝试。",
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function DrawView() {
  const { navigate, addResult } = useOmikuji();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState<DrawPhase>("ready");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash, confirmations: 1 });
  const processing = !["ready", "revealed", "error"].includes(phase);
  const demoAddress = address ?? "0xDemoShrineKeeper000000000000000000000001";
  const completedRef = useRef(false);

  const character = phase === "ready" || phase === "error" ? "/assets/maiden-idle.png" : phase === "revealed" ? "/assets/maiden-happy.png" : "/assets/maiden-praying.png";

  async function completeResult(fortuneId: number, hash: string, blockNumber?: bigint) {
    if (completedRef.current) return;
    completedRef.current = true;
    setPhase("paper");
    await delay(1300);
    const result: DrawResult = {
      id: `${hash}-${Date.now()}`,
      fortuneId,
      walletAddress: demoAddress,
      txHash: hash,
      blockNumber: blockNumber?.toString(),
      createdAt: new Date().toISOString(),
      chainId: 10143,
      claimed: runtimeMode === "demo",
      favorite: false,
      mode: runtimeMode,
    };
    addResult(result);
    setPhase("revealed");
    await delay(650);
    navigate("result");
  }

  useEffect(() => {
    if (!receipt || completedRef.current) return;
    let fortuneId = 3;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: fortuneContractAbi, data: log.data, topics: log.topics });
        if (decoded.eventName === "FortuneDrawn") fortuneId = Number(decoded.args.fortuneId);
      } catch { /* another contract log */ }
    }
    void completeResult(fortuneId, receipt.transactionHash, receipt.blockNumber);
  }, [receipt]);

  async function beginRitual() {
    setError("");
    completedRef.current = false;
    if (runtimeMode === "live" && !isConnected) {
      setError("开始仪式前，请先连接钱包。你也可以清空链上配置，使用演示模式体验。 ");
      setPhase("error");
      return;
    }
    if (runtimeMode === "demo" && !canDrawDemoToday(demoAddress)) {
      setError("这个钱包今天的五次签运已经全部用完。请在 UTC 00:00 后再来，或连接另一个钱包。 ");
      setPhase("error");
      return;
    }
    try {
      setPhase("praying"); await delay(1050);
      setPhase("shaking"); await delay(1800);
      setPhase("stick"); await delay(1100);
      if (runtimeMode === "demo") {
        setPhase("confirming"); await delay(1400);
        const fortune = drawWeightedFortune();
        const hash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
        await completeResult(fortune.id, hash);
        return;
      }
      if (chainId !== 10143) await switchChainAsync({ chainId: 10143 });
      setPhase("wallet");
      const hash = await writeContractAsync({ address: runtime.contractAddress, abi: fortuneContractAbi, functionName: "drawFortune", chainId: 10143 });
      setTxHash(hash);
      setPhase("confirming");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message.split("\n")[0] : "本次仪式未能完成。 ");
      setPhase("error");
    }
  }

  const progress = useMemo(() => ({ ready: 0, praying: 18, shaking: 38, stick: 56, wallet: 68, confirming: 78, paper: 92, revealed: 100, error: 0 }[phase]), [phase]);

  return (
    <div className="draw-layout">
      <div className="ritual-heading"><span>✦ 御神签祈愿仪式 ✦</span><div className="ritual-progress"><i style={{ width: `${progress}%` }} /></div></div>
      <section className="ritual-stage">
        <motion.div className="maiden-character draw-character" animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
          <motion.img key={character} src={character} className="maiden draw-maiden" alt="Shrine maiden performing the fortune ritual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .25 }} />
          <motion.span className="monad-rune draw-rune" aria-label="Monad 御守徽章" animate={{ boxShadow: ["0 0 6px #836ef9", "0 0 15px #b9a8ff", "0 0 6px #836ef9"] }} transition={{ duration: 3, repeat: Infinity }} />
        </motion.div>
        <AnimatePresence>
          {(["shaking", "stick", "wallet", "confirming", "paper"] as DrawPhase[]).includes(phase) && (
            <motion.img src="/assets/fortune-box.png" className="ritual-box" alt="Shaking fortune box" initial={{ opacity: 0, scale: .85 }} animate={phase === "shaking" ? { opacity: 1, rotate: [-3, 4, -4, 3, 0], x: [-3, 4, -4, 3, 0] } : { opacity: 1 }} transition={phase === "shaking" ? { duration: .45, repeat: Infinity } : {}} />
          )}
          {(["stick", "wallet", "confirming", "paper"] as DrawPhase[]).includes(phase) && <motion.img src="/assets/fortune-stick.png" className="ritual-stick" alt="Fortune stick" initial={{ opacity: 0, y: 80, rotate: -18 }} animate={{ opacity: 1, y: 0, rotate: 10 }} />}
          {phase === "paper" && <motion.img src="/assets/fortune-paper.png" className="ritual-paper" alt="Revealing fortune paper" initial={{ opacity: 0, scaleY: .05, rotateY: 90 }} animate={{ opacity: 1, scaleY: 1, rotateY: 0 }} transition={{ duration: 1.1 }} />}
        </AnimatePresence>
      </section>
      <div className="dialogue-panel">
        <p>{phase === "confirming" && <LoaderCircle className="spin" size={20}/>} {dialogue[phase]}</p>
        {error && <small><AlertTriangle size={14}/>{error}</small>}
      </div>
      <button className="primary-button ritual-button" onClick={beginRitual} disabled={processing}>
        {processing ? <><LoaderCircle className="spin"/> 仪式进行中</> : phase === "error" ? <><RotateCcw/> 再试一次</> : <><Sparkles/> 开始祈愿</>}
      </button>
    </div>
  );
}
