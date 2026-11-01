import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, date, send, statusNames, type Page } from "../api";
import { Dialog, ErrorState, Pagination } from "../components";
interface Job { _id: string; kind: string; status: string; attempts: number; createdAt: string }
export function Jobs({ canWrite }: { canWrite: boolean }) {
  const [status, setStatus] = useState(""); const [cursor, setCursor] = useState(0); const [retry, setRetry] = useState<Job | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const client = useQueryClient();
  const jobs = useQuery({ queryKey: ["admin", "jobs", status, cursor], queryFn: () => api<Page<Job>>(`/admin/jobs?cursor=${cursor}&limit=20${status ? `&status=${status}` : ""}`), refetchInterval: 15000 });
  return <><div className="section-toolbar"><p>Theo dõi tác vụ xử lý ảnh, bảng tin và thông báo.</p><label>Trạng thái<select value={status} onChange={(event) => { setCursor(0); setStatus(event.target.value); }}><option value="">Tất cả</option>{Object.entries(statusNames).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label></div>
    {jobs.isPending ? <p role="status">Đang tải tác vụ…</p> : jobs.isError ? <ErrorState error={jobs.error} retry={() => jobs.refetch()} /> : <><div className="table-scroll"><table><thead><tr><th>Tác vụ</th><th>Trạng thái</th><th>Số lần thử</th><th>Tạo lúc</th><th>Thao tác</th></tr></thead><tbody>{jobs.data.items.map((job) => <tr key={job._id}><td><strong>{job.kind}</strong><small className="cell-note id-value" title={job._id}>{job._id}</small></td><td><span className={`status ${job.status}`}>{statusNames[job.status] || job.status}</span></td><td>{job.attempts}</td><td>{date(job.createdAt)}</td><td>{job.status === "failed" ? <button className="secondary" disabled={!canWrite} onClick={() => { setError(""); setRetry(job); }}>Chạy lại</button> : "—"}</td></tr>)}</tbody></table></div>{!jobs.data.items.length && <p className="admin-empty">Không có tác vụ ở trạng thái này.</p>}<Pagination cursor={cursor} total={jobs.data.total} hasNext={jobs.data.nextCursor !== null} onChange={setCursor} /></>}
    {retry && <Dialog title="Chạy lại tác vụ?" close={() => { if (!busy) setRetry(null); }}><p>{retry.kind} sẽ được đưa lại vào hàng đợi xử lý.</p>{error && <p className="error" role="alert">{error}</p>}<div className="dialog-actions"><button className="secondary" disabled={busy} onClick={() => setRetry(null)}>Hủy</button><button className="primary" disabled={busy} onClick={async () => {
      setBusy(true); try { await send(`/admin/jobs/${retry._id}/retry`); setRetry(null); await client.invalidateQueries({ queryKey: ["admin"] }); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
    }}>{busy ? "Đang đưa vào hàng đợi…" : "Chạy lại tác vụ"}</button></div></Dialog>}
  </>;
}
