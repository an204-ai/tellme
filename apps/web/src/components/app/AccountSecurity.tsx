"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";
import { request } from "@/lib/api-repository";
import { Button, Input } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/stores/app.store";

export function AccountSecurity() {
  const account = useQuery({ queryKey: ["tellme", "account"], queryFn: () => request<{ email: string; emailVerified: boolean; emailAvailable: boolean }>("/auth/account") });
  const [editing, setEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useAppStore((s) => s.notify);
  const close = () => { setEditing(false); setCurrentPassword(""); setPassword(""); setConfirm(""); setError(""); };
  return <section className="settings-section"><h2><LockKeyhole size={21} /> Bảo mật tài khoản</h2>
    {account.data ? <div className="account-email-status"><div><strong>{account.data.email}</strong><p>{account.data.emailVerified ? "Email đã xác thực" : "Email chưa xác thực"}</p></div>{!account.data.emailVerified && <Link className="text-link" href="/auth/verify-email">Xác thực email</Link>}</div> : <p>{account.isError ? "Chưa tải được thông tin email." : "Đang tải thông tin email…"}</p>}
    <div className="setting-toggle-row"><div><strong>Mật khẩu</strong><p>Đổi mật khẩu sẽ đăng xuất các phiên khác.</p></div><Button variant="secondary" onClick={() => setEditing(true)}>Đổi mật khẩu</Button></div>
    {editing && <Modal title="Đổi mật khẩu" onClose={close}><form className="dialog-body account-password-form" onSubmit={async (event) => {
      event.preventDefault(); setError(""); if (password !== confirm) { setError("Hai mật khẩu mới chưa khớp."); return; } setBusy(true);
      try { await request("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, password }) }); close(); notify("Đã đổi mật khẩu và đăng xuất các phiên khác."); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
    }}>
      <label htmlFor="current-password">Mật khẩu hiện tại</label><Input id="current-password" type="password" autoComplete="current-password" required minLength={8} maxLength={128} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      <label htmlFor="new-password">Mật khẩu mới (8–128 ký tự)</label><Input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
      <label htmlFor="confirm-password">Nhập lại mật khẩu mới</label><Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <Link href="/auth/forgot-password" className="text-link">Quên mật khẩu hiện tại?</Link>{error && <p role="alert" className="field-error">{error}</p>}<Button type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu mật khẩu mới"}</Button>
    </form></Modal>}
  </section>;
}
