"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OtpCodeField } from "@/components/ui/OtpCodeField";
import { Brand } from "@/components/ui/Primitives";
import { request, apiRepository } from "@/lib/api-repository";
import { BRAND_DESCRIPTION } from "@/lib/brand";

type Mode = "forgot" | "reset" | "verify";
type RecoveryStep = "email" | "code" | "password" | "done";
const recoveryContextKey = "tellme:recovery-email";
export function AccountAccessScreen({ mode }: { mode: Mode }) {
  const verifyingEmail = mode === "verify";
  const router = useRouter();
  const [step, setStep] = useState<RecoveryStep>(mode === "reset" ? "code" : "email");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const client = useQueryClient();
  const contextLoaded = useRef(false);
  const account = useQuery({ queryKey: ["tellme", "account"], queryFn: () => request<{ email: string; emailVerified: boolean; emailAvailable: boolean; verificationRetryAfter: number }>("/auth/account"), enabled: verifyingEmail, retry: false });
  useEffect(() => {
    if (contextLoaded.current) return;
    contextLoaded.current = true;
    if (mode === "reset") {
      try {
        const saved = JSON.parse(sessionStorage.getItem(recoveryContextKey) || "null");
        if (typeof saved?.email === "string" && saved.email.length <= 254 && typeof saved?.sentAt === "number") {
          setEmail(saved.email);
          setCooldown(Math.max(0, Math.min(60, 60 - Math.floor((Date.now() - saved.sentAt) / 1000))));
        }
      } catch { /* The form stays usable when storage is unavailable. */ }
    }
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (verifyingEmail && new URLSearchParams(window.location.search).get("delivery") === "failed") setError("Tài khoản đã tạo nhưng chưa gửi được email. Bạn có thể gửi lại bên dưới.");
  }, [mode, verifyingEmail]);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown((n) => n - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
  useEffect(() => {
    if (verifyingEmail && account.data) setCooldown(account.data.verificationRetryAfter || 0);
  }, [verifyingEmail, account.data?.verificationRetryAfter]);
  const alreadyVerified = verifyingEmail && !!account.data?.emailVerified;
  const title = verifyingEmail ? alreadyVerified ? "Email đã xác thực" : "Xác thực email" : step === "code" ? "Nhập mã xác nhận" : step === "password" ? "Đặt mật khẩu mới" : step === "done" ? "Đã đặt lại mật khẩu" : "Quên mật khẩu?";
  const description = verifyingEmail
    ? alreadyVerified ? "Email của bạn đã được xác thực. Bạn có thể vào Tellme để chia sẻ." : `Nhập mã 6 số trong email${account.data?.email ? ` gửi tới ${account.data.email}` : " của bạn"}. Kiểm tra cả thư mục spam nhé.`
    : step === "email" ? "Nhập email đã đăng ký để nhận mã xác nhận 6 số." : step === "code" ? email ? `Nhập mã gửi tới ${email}. Mã có hiệu lực trong 10 phút. Kiểm tra cả thư mục spam nhé.` : "Nhập email và mã 6 số bạn vừa nhận được. Mã có hiệu lực trong 10 phút." : step === "password" ? "Mã đã được xác nhận. Đặt mật khẩu mới từ 8 đến 128 ký tự." : "Các phiên đăng nhập cũ đã được đăng xuất. Bạn đăng nhập bằng mật khẩu mới nhé.";
  const sendCode = async () => {
    const result = await request<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    try { sessionStorage.setItem(recoveryContextKey, JSON.stringify({ email, sentAt: Date.now() })); } catch { /* Storage is optional. */ }
    setMessage(result.message); setCooldown(60); setCode(""); setToken(""); setStep("code");
    if (mode === "forgot") router.replace("/auth/reset-password");
  };
  const restart = () => {
    try { sessionStorage.removeItem(recoveryContextKey); } catch { /* Storage is optional. */ }
    if (mode === "reset") router.replace("/auth/forgot-password");
    setStep("email"); setCode(""); setToken(""); setPassword(""); setConfirm(""); setError(""); setMessage(""); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      if (verifyingEmail) {
        if (!account.data) throw new Error("Đăng nhập để xác thực email của bạn nhé.");
        await request("/auth/verify-email", { method: "POST", body: JSON.stringify({ code }) });
        setCode("");
        setDone(true); setMessage("Email đã được xác thực. Bạn có thể bắt đầu chia sẻ.");
        apiRepository.clear(); client.clear();
      } else if (step === "email") {
        await sendCode();
      } else if (step === "code") {
        const result = await request<{ token: string }>("/auth/verify-reset-code", { method: "POST", body: JSON.stringify({ email, code }) });
        setToken(result.token); setCode(""); setStep("password");
      } else if (step === "password") {
        if (password !== confirm) { setError("Hai mật khẩu mới chưa khớp."); return; }
        await request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
        try { sessionStorage.removeItem(recoveryContextKey); } catch { /* Storage is optional. */ }
        setPassword(""); setConfirm(""); setToken(""); setStep("done"); apiRepository.clear(); client.clear();
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa xử lý được. Bạn thử lại nhé."); }
    finally { setBusy(false); }
  };
  return <main className="auth-page"><section className="auth-visual" aria-label="Tellme"><Link href="/community/today" className="auth-brand"><Brand /></Link><div className="auth-visual-copy"><h1>Đi làm cũng có<br /><strong>chuyện để kể.</strong></h1><p>{BRAND_DESCRIPTION}</p><span>Your day. Your stories.</span></div></section>
    <section className="auth-form-area"><div className="uiv-form"><div className="container auth-card">
      <h1 className="heading">{title}</h1><p className="auth-description">{description}</p>
      {(!verifyingEmail && step !== "done" || verifyingEmail && !done && !alreadyVerified) && <form className="form account-access-form" onSubmit={submit}>
        {!verifyingEmail && (step === "email" || step === "code") && <label className="account-input-label">Email đã đăng ký<span className="auth-field"><input className="input" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value.trim())} /></span></label>}
        {(verifyingEmail || step === "code") && <OtpCodeField value={code} onChange={setCode} disabled={busy} />}

        {!verifyingEmail && step === "password" && <><label className="account-input-label">Mật khẩu mới<span className="auth-field"><input key="recovery-password" className="input" type="password" autoComplete="new-password" required minLength={8} maxLength={128} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} /></span></label><label className="account-input-label">Nhập lại mật khẩu mới<span className="auth-field"><input className="input" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></span></label></>}
        <button className="login-button" disabled={busy || verifyingEmail && !account.data} type="submit">{busy ? "Đang xử lý…" : verifyingEmail ? "Xác nhận mã" : step === "email" ? "Gửi mã xác nhận" : step === "code" ? "Xác nhận mã" : "Lưu mật khẩu mới"}</button>
      </form>}
      {error && <p className="field-error account-result" role="alert">{error}</p>}{message && <p className="account-result" role="status">{message}</p>}
      {!verifyingEmail && step === "code" && <div className="recovery-code-actions"><button className="text-link" type="button" disabled={busy || cooldown > 0} onClick={async () => { setBusy(true); setError(""); try { await sendCode(); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); } }}>{cooldown ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}</button><button className="text-link" type="button" disabled={busy} onClick={restart}>Đổi email</button></div>}
      {!verifyingEmail && step === "password" && <div className="account-resend"><button className="text-link" type="button" disabled={busy} onClick={restart}>Yêu cầu mã mới</button></div>}
      {verifyingEmail && !done && !account.data?.emailVerified && <div className="account-resend">{account.data ? <button type="button" className="text-link" disabled={busy || cooldown > 0 || !account.data.emailAvailable} onClick={async () => {
        setBusy(true); setError(""); try { await request("/auth/resend-verification", { method: "POST" }); setMessage("Đã gửi mã xác thực mới. Mã cũ không còn hiệu lực."); setCode(""); setCooldown(60); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
      }}>{cooldown ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}</button> : <Link href="/auth/login">Đăng nhập để nhận mã xác thực</Link>}</div>}
      <div className="account-access-links"><Link href={verifyingEmail && (done || alreadyVerified) ? "/community/today" : "/auth/login"}>{verifyingEmail && (done || alreadyVerified) ? "Vào Tellme" : "Về đăng nhập"}</Link><Link href="/community/today">Ghé xem Tellme</Link></div>
    </div></div></section>
  </main>;
}
