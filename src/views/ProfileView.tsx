"use client";

import { CheckCircle2, LogIn, LogOut, Mail, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Frame, useOmikuji } from "@/src/components/OmikujiApp";
import { requestEmailCode, signInWithGoogle, signOutCloudAccount, supabase, updateCloudProfile, verifyEmailCode } from "@/src/lib/supabase";
import { runtime, runtimeMode, shortAddress } from "@/src/lib/runtime";
import { defaultProfile } from "@/src/lib/storage";

export function ProfileView() {
  const { profile, setProfile, history, cloudSyncing, lastCloudSync, syncCloudHistory } = useOmikuji();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [email, setEmail] = useState(profile.email);
  const [username, setUsername] = useState(profile.username);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function requestCode() {
    if (!email.includes("@")) { setNotice("请输入有效的邮箱地址。"); return; }
    setBusy(true);
    try {
      const result = await requestEmailCode(email);
      if (result.demo) {
        setProfile({ ...profile, email, username: username || "御签守护者", signedIn: true, id: "demo-user" });
        setNotice("演示账户已创建，本地御签已经归入你的名下。 ");
      } else {
        setCodeSent(true);
        setNotice("6 位验证码已发送，请检查邮箱。 ");
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : "暂时无法登录。 "); }
    setBusy(false);
  }

  async function confirmCode() {
    if (!/^\d{6}$/.test(emailCode)) { setNotice("请输入邮件中的 6 位验证码。"); return; }
    setBusy(true);
    try {
      const result = await verifyEmailCode(email, emailCode);
      const savedUsername = username.trim() || "御签守护者";
      await updateCloudProfile(savedUsername, profile.avatar);
      setProfile({ ...profile, email, username: savedUsername, signedIn: true, id: result.user?.id ?? "demo-user" });
      const synced = await syncCloudHistory();
      setCodeSent(false);
      setEmailCode("");
      setNotice(`登录成功，已从云端同步 ${synced} 份链上御签。`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "验证码无效或已过期。 "); }
    setBusy(false);
  }

  async function saveProfile() {
    const savedUsername = username.trim();
    if (savedUsername.length < 2) { setNotice("用户名至少需要 2 个字符。"); return; }
    setBusy(true);
    try {
      if (runtimeMode === "live") await updateCloudProfile(savedUsername, profile.avatar);
      setProfile({ ...profile, email, username: savedUsername });
      setNotice("用户名已保存，并会同步到其他设备。");
    } catch (error) { setNotice(error instanceof Error ? error.message : "用户名保存失败。"); }
    setBusy(false);
  }

  async function signOutAccount() {
    setBusy(true);
    try {
      if (runtimeMode === "live") await signOutCloudAccount();
      setProfile(defaultProfile);
      setEmail("");
      setUsername(defaultProfile.username);
      setEmailCode("");
      setCodeSent(false);
      setNotice("已退出登录。");
    } catch (error) { setNotice(error instanceof Error ? error.message : "退出登录失败，请稍后重试。"); }
    setBusy(false);
  }

  async function claimWallet() {
    if (!profile.signedIn) { setNotice("请先使用邮箱注册或登录，再绑定钱包。"); return; }
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
        const pending = history.filter((item) => item.mode === "live" && !item.claimed && item.walletAddress.toLowerCase() === address.toLowerCase()).map((item) => item.txHash);
        const verifyResponse = await fetch(`${runtime.supabaseUrl}/functions/v1/wallet-claim/verify`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ address, chainId: 10143, nonce, signature, txHashes: pending }) });
        if (!verifyResponse.ok) throw new Error("钱包验证失败。 ");
        const synced = await syncCloudHistory();
        setNotice(`钱包验证成功，已同步 ${synced} 份链上御签。`);
      }
    } catch (error) { setNotice(error instanceof Error ? error.message.split("\n")[0] : "未能完成签名。 "); }
    setBusy(false);
  }

  return (
    <div className="profile-layout">
      <section className="profile-hero"><div className="profile-avatar"><img src="/assets/maiden-happy.png" alt="御签守护者头像"/><span>✿</span></div><div><span className="eyebrow">参拜者档案</span><h1>{profile.signedIn ? profile.username : "欢迎你，远道而来的旅人"}</h1><p>{profile.signedIn ? "无论连接哪个钱包，你的祝福都会与你同行。" : "创建账户，认领并珍藏属于你的链上签运。"}</p></div></section>
      <div className="profile-grid">
        <Frame><div className="account-panel"><h2><LogIn/> 神社账户</h2><label>用户名<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="首次登录时创建，之后可随时修改" /></label><label>邮箱地址<div className="input-icon"><Mail/><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setCodeSent(false); }} placeholder="you@example.com" disabled={profile.signedIn} /></div></label>{!profile.signedIn && <p className="login-help">新邮箱将自动注册，已有邮箱会直接登录，无需设置密码。</p>}{codeSent && <label>邮箱验证码<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="请输入 6 位验证码" /></label>}<button className="primary-button compact" onClick={profile.signedIn ? saveProfile : codeSent ? confirmCode : requestCode} disabled={busy}>{profile.signedIn ? "保存用户名" : codeSent ? "验证并登录" : "注册 / 登录"}</button>{profile.signedIn && <button className="sign-out-button" onClick={signOutAccount} disabled={busy}><LogOut size={16}/> 退出登录</button>}{codeSent && <button className="google-button" onClick={requestCode} disabled={busy}>重新发送验证码</button>}{runtime.googleAuth && <button className="google-button" onClick={signInWithGoogle}>使用 Google 继续</button>}</div></Frame>
        <Frame><div className="account-panel"><h2><WalletCards/> 已连接钱包</h2><div className="wallet-record"><span className={isConnected ? "online" : ""}/><div><strong>{isConnected ? shortAddress(address) : "尚未连接钱包"}</strong><small>{isConnected ? "首次签名绑定后，今后的链上御签会自动同步" : "请使用页面顶部的连接钱包按钮"}</small></div></div><button className="purple-button full" onClick={claimWallet} disabled={!isConnected || !profile.signedIn || busy}><ShieldCheck/> {profile.signedIn ? "签名并绑定钱包" : "请先注册 / 登录"}</button><p className="security-note"><ShieldCheck/> 一次性签名只用于证明钱包归属，绝不会授予资产支出权限。</p></div></Frame>
      </div>
      <div className="claim-summary"><Sparkles/><div><strong>云端已同步 {history.filter((item) => item.mode === "live" && item.claimed).length} 份链上御签</strong><span>{history.filter((item) => item.mode === "demo").length} 份访客体验签{profile.signedIn ? "已归入账户" : "等待登录后归入账户"} · {lastCloudSync ? `最近同步 ${new Date(lastCloudSync).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` : "登录后可跨设备同步"}</span></div>{profile.signedIn ? <button className="sync-cloud-button" disabled={cloudSyncing} onClick={async () => { try { const count = await syncCloudHistory(); setNotice(`云端同步完成，共 ${count} 份收藏。`); } catch { setNotice("云端同步失败，请稍后重试。"); } }}>{cloudSyncing ? "同步中…" : "立即同步"}</button> : <CheckCircle2 className="success"/>}</div>
      <div className="profile-footer-blessing" aria-hidden="true">
        <img src="/assets/maiden-praying.png" alt="" />
        <div><span>✦ 月下结缘 ✦</span><p>愿每一次连接，都通往一份好消息。</p></div>
      </div>
      {notice && <div className="toast-message">{notice}</div>}
    </div>
  );
}
