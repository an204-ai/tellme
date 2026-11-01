"use client";
import { useId } from "react";

export function OtpCodeField({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const id = useId();
  return <><label className="account-input-label" htmlFor={id}>Mã xác nhận 6 số<span className="auth-field"><input id={id} className="input recovery-code-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required minLength={6} maxLength={6} autoFocus disabled={disabled} aria-describedby={`${id}-hint`} value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} /></span></label><p className="recovery-code-hint" id={`${id}-hint`}>Mã có hiệu lực 10 phút và chỉ dùng một lần. Nhập sai 5 lần, bạn cần yêu cầu mã mới.</p></>;
}
