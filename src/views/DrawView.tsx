"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { decodeErrorResult, decodeEventLog, type Hex } from "viem";
import { useAccount, useChainId, usePublicClient, useWaitForTransactionReceipt, useWalletClient, useWriteContract } from "wagmi";
import { useOmikuji } from "@/src/components/OmikujiApp";
import { monadTestnet } from "@/src/config/chain";
import { fortuneContractAbi } from "@/src/config/contract";
import { drawWeightedFortune } from "@/src/lib/fortunes";
import { runtime, runtimeMode } from "@/src/lib/runtime";
import { canDrawDemoToday, GUEST_TRIAL_LIMIT, storage } from "@/src/lib/storage";
import { recordPublicVerifiedDraw } from "@/src/lib/supabase";
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
const MONAD_CHAIN_HEX = "0x279f";

function walletErrorCode(cause: unknown): number | undefined {
  if (!cause || typeof cause !== "object") return undefined;
  const value = cause as { code?: number; cause?: { code?: number } };
  return value.code ?? value.cause?.code;
}

function findHexErrorData(cause: unknown, seen = new Set<unknown>()): Hex | undefined {
  if (typeof cause === "string") {
    const [match] = cause.match(/0x[a-fA-F0-9]{8,}/) ?? [];
    return match as Hex | undefined;
  }
  if (!cause || typeof cause !== "object" || seen.has(cause)) return undefined;
  seen.add(cause);
  const record = cause as Record<string, unknown>;
  for (const key of ["data", "error", "cause", "details", "body"]) {
    const found = findHexErrorData(record[key], seen);
    if (found) return found;
  }
  return undefined;
}

function formatUtcTimestamp(seconds: bigint) {
  return new Date(Number(seconds) * 1000).toISOString().replace(".000Z", " UTC");
}

function decodeContractError(cause: unknown) {
  const data = findHexErrorData(cause);
  if (!data) return undefined;
  try {
    const decoded = decodeErrorResult({ abi: fortuneContractAbi, data });
    if (decoded.errorName === "DailyLimitReached") {
      const [nextDrawTimestamp] = decoded.args;
      return `链上返回 DailyLimitReached：这个钱包今天的正式求签次数已经用完，请在 ${formatUtcTimestamp(nextDrawTimestamp)} 后再来。`;
    }
    return `链上返回 ${decoded.errorName}，本次交易已在提交前停止。`;
  } catch {
    return undefined;
  }
}

function friendlyWalletError(cause: unknown) {
  const decoded = decodeContractError(cause);
  if (decoded) return decoded;
  const code = walletErrorCode(cause);
  const message = cause instanceof Error ? cause.message.toLowerCase() : "";
  if (code === 4001 || message.includes("user rejected") || message.includes("user denied")) return "你取消了钱包操作。请在钱包中确认切换到 Monad Testnet 后再试。";
  if (message.includes("insufficient funds")) return "钱包中的 Monad 测试币不足，领取测试币后再来求签吧。";
  if (message.includes("already drawn") || message.includes("daily")) return "这个钱包今天的十次链上求签机会已经用完，请在 UTC 00:00 后再来。";
  if (message.includes("chain") || message.includes("network") || code === 4902) return "钱包尚未切换到 Monad Testnet。请允许网站添加并切换网络（链 ID 10143），然后再试一次。";
  return "钱包没有完成本次交易，请确认网络与测试币余额后再试。";
}

export function DrawView() {
  const { navigate, addResult } = useOmikuji();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: monadTestnet.id });
  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState<DrawPhase>("ready");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [guestTrials, setGuestTrials] = useState(0);
  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash, confirmations: 1 });
  const processing = !["ready", "revealed", "error"].includes(phase);
  const hasConnectedWallet = Boolean(isConnected && address);
  const guestLimitReached = runtimeMode === "live" && !hasConnectedWallet && guestTrials >= GUEST_TRIAL_LIMIT;
  const drawWalletAddress = hasConnectedWallet ? address! : "0xDemoShrineKeeper000000000000000000000001";
  const completedRef = useRef(false);

  useEffect(() => { setGuestTrials(storage.getGuestTrialCount()); }, []);

  async function ensureMonadNetwork() {
    if (!walletClient) throw new Error("钱包连接尚未准备好");
    if (await walletClient.getChainId() === monadTestnet.id) return;
    try {
      await walletClient.request({ method: "wallet_switchEthereumChain", params: [{ chainId: MONAD_CHAIN_HEX }] });
    } catch (switchError) {
      if (walletErrorCode(switchError) === 4001) throw switchError;
      await walletClient.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: MONAD_CHAIN_HEX, chainName: monadTestnet.name, nativeCurrency: monadTestnet.nativeCurrency, rpcUrls: [runtime.rpcUrl], blockExplorerUrls: [runtime.explorerUrl] }],
      });
      await walletClient.request({ method: "wallet_switchEthereumChain", params: [{ chainId: MONAD_CHAIN_HEX }] });
    }
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (await walletClient.getChainId() === monadTestnet.id) return;
      await delay(250);
    }
    throw new Error("wallet network switch did not finish");
  }

  async function preflightDraw() {
    if (!publicClient || !address) throw new Error("钱包连接尚未准备好");
    const request = {
      address: runtime.contractAddress,
      abi: fortuneContractAbi,
      functionName: "drawFortune",
      account: address,
    } as const;
    await publicClient.simulateContract(request);
    return publicClient.estimateContractGas(request);
  }

  const character = phase === "ready" || phase === "error" ? "/assets/maiden-idle.png" : phase === "revealed" ? "/assets/maiden-happy.png" : "/assets/maiden-praying.png";

  async function completeResult(fortuneId: number, hash: string, blockNumber?: bigint, guestTrial = false) {
    if (completedRef.current) return;
    completedRef.current = true;
    setPhase("paper");
    await delay(1300);
    const result: DrawResult = {
      id: `${hash}-${Date.now()}`,
      fortuneId,
      walletAddress: drawWalletAddress,
      txHash: hash,
      blockNumber: blockNumber?.toString(),
      createdAt: new Date().toISOString(),
      chainId: 10143,
      claimed: runtimeMode === "demo" || guestTrial,
      favorite: false,
      mode: guestTrial ? "demo" : runtimeMode,
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
    void recordPublicVerifiedDraw(receipt.transactionHash).catch(() => undefined);
    void completeResult(fortuneId, receipt.transactionHash, receipt.blockNumber);
  }, [receipt]);

  async function beginRitual() {
    setError("");
    completedRef.current = false;
    const guestTrial = runtimeMode === "live" && !hasConnectedWallet;
    if (guestTrial && guestTrials >= GUEST_TRIAL_LIMIT) {
      setError("今天五次访客体验已经用完，请连接钱包正式上链，或在 UTC 00:00 后再来。 ");
      setPhase("error");
      return;
    }
    if (runtimeMode === "demo" && !canDrawDemoToday(drawWalletAddress)) {
      setError("这个钱包今天的十次签运已经全部用完。请在 UTC 00:00 后再来，或连接另一个钱包。 ");
      setPhase("error");
      return;
    }
    try {
      setPhase("praying"); await delay(1050);
      setPhase("shaking"); await delay(1800);
      setPhase("stick"); await delay(1100);
      if (runtimeMode === "demo" || guestTrial) {
        setPhase("confirming"); await delay(1400);
        const fortune = drawWeightedFortune();
        const hash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
        if (guestTrial) setGuestTrials(storage.useGuestTrial());
        await completeResult(fortune.id, hash, undefined, guestTrial);
        return;
      }
      if (chainId !== 10143) await ensureMonadNetwork();
      const gas = await preflightDraw();
      setPhase("wallet");
      const hash = await writeContractAsync({ address: runtime.contractAddress, abi: fortuneContractAbi, functionName: "drawFortune", chainId: 10143, gas });
      setTxHash(hash);
      setPhase("confirming");
    } catch (cause) {
      setError(friendlyWalletError(cause));
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
        {!hasConnectedWallet && runtimeMode === "live" && guestTrials < GUEST_TRIAL_LIMIT && <small>今日访客体验剩余 {GUEST_TRIAL_LIMIT - guestTrials} 次 · 仅保存在本设备，不会补录上链</small>}
        {error && <small><AlertTriangle size={14}/>{error}</small>}
      </div>
      {guestLimitReached ? <ConnectButton.Custom>{({ openConnectModal }) => <button className="primary-button ritual-button" onClick={openConnectModal}><Sparkles/> 连接钱包继续求签</button>}</ConnectButton.Custom> : <button className="primary-button ritual-button" onClick={beginRitual} disabled={processing}>
        {processing ? <><LoaderCircle className="spin"/> 仪式进行中</> : phase === "error" ? <><RotateCcw/> 再试一次</> : <><Sparkles/> 开始祈愿</>}
      </button>}
    </div>
  );
}
