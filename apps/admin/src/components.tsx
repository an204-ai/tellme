import { useEffect, useId, useRef, type ReactNode } from "react";
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
  return <dialog ref={ref} className="admin-dialog" aria-labelledby={id} onCancel={(event) => { event.preventDefault(); close(); }}><header><h2 id={id}>{title}</h2><button className="icon-button" aria-label="Đóng" onClick={close}><X size={22} /></button></header><div className="admin-dialog-body">{children}</div></dialog>;
}
