import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export function ErrorState({ error, retry }: { error: Error; retry: () => unknown }) {
  return <div className="admin-empty" role="alert"><strong>Chưa tải được dữ liệu</strong><p>{error.message || "Kiểm tra kết nối rồi thử lại nhé."}</p><button className="secondary" onClick={() => void retry()}>Thử lại</button></div>;
}
export function Pagination({ cursor, total, hasNext, onChange }: { cursor: number; total: number; hasNext: boolean; onChange: (value: number) => void }) {
  return <div className="pagination"><span>{total ? `${cursor + 1}–${Math.min(cursor + 20, total)} / ${total}` : "0 kết quả"}</span><div><button className="secondary" disabled={!cursor} onClick={() => onChange(Math.max(0, cursor - 20))}>Trước</button><button className="secondary" disabled={!hasNext} onClick={() => onChange(cursor + 20)}>Tiếp</button></div></div>;
}
export function Dialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { const node = ref.current; node?.showModal(); return () => node?.close(); }, []);
  const requestClose = () => { if (!ref.current?.querySelector('[aria-busy="true"]')) close(); };
  return <dialog ref={ref} className="admin-dialog" aria-labelledby={id} onCancel={(event) => { event.preventDefault(); requestClose(); }}><header><h2 id={id}>{title}</h2><button type="button" className="icon-button" aria-label="Đóng" onClick={requestClose}><X size={22} /></button></header><div className="admin-dialog-body">{children}</div></dialog>;
}
export function ReasonForm({ action, description, danger = false, children, onConfirm, onCancel }: { action: string; description: string; danger?: boolean; children?: ReactNode; onConfirm: (reason: string) => Promise<unknown>; onCancel: () => void }) {
  const [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const id = useId();
  return <form className="reason-form" aria-busy={busy} onSubmit={async (event) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try { await onConfirm(reason.trim()); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
  }}><p>{description}</p>{children}<label htmlFor={id}>Lý do thao tác<textarea id={id} value={reason} onChange={(event) => setReason(event.target.value)} required minLength={5} maxLength={500} rows={3} disabled={busy} placeholder="Ghi rõ để quản trị viên khác có thể tra lại…" /></label><small>5–500 ký tự · Lưu trong nhật ký quản trị</small>{error && <p className="error" role="alert">{error}</p>}<div className="dialog-actions"><button className="secondary" type="button" disabled={busy} onClick={onCancel}>Hủy</button><button className={danger ? "danger" : "primary"} disabled={busy || reason.trim().length < 5} type="submit">{busy ? "Đang xử lý…" : action}</button></div></form>;
}
export function Loading({ label = "Đang tải dữ liệu…" }: { label?: string }) { return <div className="admin-skeleton" role="status" aria-label={label}><span>{label}</span><i /><i /><i /></div>; }
