"use client";

import { CheckCircle2, LogIn, Mail, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Frame, useOmikuji } from "@/src/components/OmikujiApp";
import { requestMagicLink, signInWithGoogle, supabase } from "@/src/lib/supabase";
import { runtime, runtimeMode, shortAddress } from "@/src/lib/runtime";

export function ProfileView() {
  const { profile, setProfile, history } = useOmikuji();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [email, setEmail] = useState(profile.email);
  const [username, setUsername] = useState(profile.username);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function login() {
    if (!email.includes("@")) { setNotice("Enter a valid email address."); return; }
    setBusy(true);
    try {
      const result = await requestMagicLink(email);
      if (result.demo) {
        setProfile({ ...profile, email, username: username || "御签守护者", signedIn: true, id: "demo-user" });
        setNotice("演示账户已创建，本地御签已经归入你的名下。 ");
      } else setNotice("登录链接已发送，请检查你的邮箱。 ");
    } catch (error) { setNotice(error instanceof Error ? error.message : "暂时无法登录。 "); }
    setBusy(false);
  }

  async function claimWallet() {
    if (!address) { setNotice("请先连接钱包。 "); return; }
    setBusy(true);
    try {
      if (runtimeMode === "demo") {
        await signMessageAsync({ message: `Monad Omikuji Demo Wallet Claim\nWallet: ${address}\nIssued: ${new Date().toISOString()}` });
        setNotice("签名验证成功，钱包与本地御签已在演示模式中完成绑定。 ");
      } else {
        const session = (await supabase?.auth.getSession())?.data.session;
        const nonceResponse = await fetch(`${runtime.supabaseUrl}/functions/v1/wallet-claim/nonce`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ address, chainId: 10143 }) });
        const { nonce, message } = await nonceResponse.json();
        const signature = await signMessageAsync({ message });
        const pending = history.filter((item) => !item.claimed).map((item) => item.txHash);
        const verifyResponse = await fetch(`${runtime.supabaseUrl}/functions/v1/wallet-claim/verify`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ address, chainId: 10143, nonce, signature, txHashes: pending }) });
        if (!verifyResponse.ok) throw new Error("钱包验证失败。 ");
        setNotice("钱包验证成功，符合条件的御签已完成认领。 ");
      }
    } catch (error) { setNotice(error instanceof Error ? error.message.split("\n")[0] : "未能完成签名。 "); }
    setBusy(false);
  }

  return (
    <div className="profile-layout">
      <section className="profile-hero"><div className="profile-avatar"><img src="/assets/maiden-happy.png" alt="御签守护者头像"/><span>✿</span></div><div><span className="eyebrow">参拜者档案</span><h1>{profile.signedIn ? profile.username : "欢迎你，远道而来的旅人"}</h1><p>{profile.signedIn ? "无论连接哪个钱包，你的祝福都会与你同行。" : "创建账户，认领并珍藏属于你的链上签运。"}</p></div></section>
      <div className="profile-grid">
        <Frame><div className="account-panel"><h2><LogIn/> 神社账户</h2><label>显示名称<input value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>邮箱地址<div className="input-icon"><Mail/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></label><button className="primary-button compact" onClick={login} disabled={busy}>{profile.signedIn ? "保存个人资料" : "使用邮箱继续"}</button>{runtime.googleAuth && <button className="google-button" onClick={signInWithGoogle}>使用 Google 继续</button>}</div></Frame>
        <Frame><div className="account-panel"><h2><WalletCards/> 已连接钱包</h2><div className="wallet-record"><span className={isConnected ? "online" : ""}/><div><strong>{isConnected ? shortAddress(address) : "尚未连接钱包"}</strong><small>{isConnected ? "Monad 测试网 · 当前钱包" : "请使用页面顶部的连接钱包按钮"}</small></div></div><button className="purple-button full" onClick={claimWallet} disabled={!isConnected || busy}><ShieldCheck/> 签名并认领钱包</button><p className="security-note"><ShieldCheck/> 一次性签名只用于证明钱包归属，绝不会授予资产支出权限。</p></div></Frame>
      </div>
      <div className="claim-summary"><Sparkles/><div><strong>已认领 {history.filter((item) => item.claimed).length} 份祝福</strong><span>{history.filter((item) => !item.claimed).length} 份御签等待认领</span></div>{profile.signedIn && <CheckCircle2 className="success"/>}</div>
      <div className="profile-footer-blessing" aria-hidden="true">
        <img src="/assets/maiden-praying.png" alt="" />
        <div><span>✦ 月下结缘 ✦</span><p>愿每一次连接，都通往一份好消息。</p></div>
      </div>
      {notice && <div className="toast-message">{notice}</div>}
    </div>
  );
}
