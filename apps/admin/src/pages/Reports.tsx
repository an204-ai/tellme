import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, date, reasonNames, send, type Page } from "../api";
import { Dialog, ErrorState, Pagination } from "../components";
interface Report { _id: string; targetType?: "post" | "story" | "user"; reason: string; at: string; reporter?: string; resolution?: { action: string; at: string } }
interface Detail { report: Report; target: { title: string; text: string; images: string[]; href?: string } | null }
const names = { post: "Bài viết", story: "Chuỗi khoảnh khắc", user: "Tài khoản" };
function Review({ id, canWrite, close }: { id: string; canWrite: boolean; close: () => void }) {
  const detail = useQuery({ queryKey: ["admin", "report", id], queryFn: () => api<Detail>(`/admin/reports/${id}`) });
  const client = useQueryClient(); const [removing, setRemoving] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const resolve = async (action: string) => {
    setBusy(true); setError("");
    try { await send(`/admin/reports/${id}/resolve`, { action }); await client.invalidateQueries({ queryKey: ["admin"] }); close(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  };
  return <Dialog title="Xem xét báo cáo" close={() => { if (!busy) close(); }}>{detail.isPending ? <p role="status">Đang tải nội dung…</p> : detail.isError ? <ErrorState error={detail.error} retry={() => detail.refetch()} /> : <>
    <p className="report-reason"><strong>{reasonNames[detail.data.report.reason] || detail.data.report.reason}</strong><span>{date(detail.data.report.at)}</span></p>
    {detail.data.target ? <section className="report-preview"><h3>{detail.data.target.title}</h3><p>{detail.data.target.text || "Không có chú thích."}</p><div className="report-images">{detail.data.target.images.map((image, index) => <img key={`${image}:${index}`} src={image} alt={`Ảnh được báo cáo ${index + 1}`} loading="lazy" />)}</div>{detail.data.target.href && <a className="text-link" href={detail.data.target.href} target="_blank" rel="noreferrer">Mở trên Tellme</a>}</section> : <p className="admin-notice">Nội dung này không còn tồn tại.</p>}
    {detail.data.report.resolution ? <p className="admin-notice">Đã xử lý: {detail.data.report.resolution.action === "dismiss" ? "Bỏ qua báo cáo" : "Gỡ nội dung"} · {date(detail.data.report.resolution.at)}</p> : <>
      {removing && <div className="admin-notice"><strong>Gỡ nội dung này khỏi Tellme?</strong><p>Thao tác xóa bài viết hoặc toàn bộ chuỗi khoảnh khắc và dọn ảnh liên quan. Không thể hoàn tác.</p></div>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions">{removing ? <><button className="secondary" disabled={busy} onClick={() => setRemoving(false)}>Hủy</button><button className="danger" disabled={busy || !canWrite} onClick={() => void resolve("remove-post")}>{busy ? "Đang gỡ…" : "Xác nhận gỡ nội dung"}</button></> : <><button className="secondary" disabled={busy || !canWrite} onClick={() => void resolve("dismiss")}>{busy ? "Đang xử lý…" : "Bỏ qua báo cáo"}</button>{detail.data.target && detail.data.report.targetType !== "user" && <button className="danger" disabled={busy || !canWrite} onClick={() => setRemoving(true)}>Gỡ nội dung</button>}</>}</div>
    </>}
  </>}</Dialog>;
}
export function Reports({ canWrite }: { canWrite: boolean }) {
  const [status, setStatus] = useState("pending"); const [cursor, setCursor] = useState(0); const [selected, setSelected] = useState<string | null>(null);
  const reports = useQuery({ queryKey: ["admin", "reports", status, cursor], queryFn: () => api<Page<Report>>(`/admin/reports?status=${status}&cursor=${cursor}&limit=20`) });
  return <><div className="section-toolbar"><p>Xem nội dung được báo cáo trước khi quyết định xử lý.</p><label>Trạng thái<select value={status} onChange={(event) => { setCursor(0); setStatus(event.target.value); }}><option value="pending">Chờ xử lý</option><option value="resolved">Đã xử lý</option><option value="all">Tất cả</option></select></label></div>
    {reports.isPending ? <p role="status">Đang tải báo cáo…</p> : reports.isError ? <ErrorState error={reports.error} retry={() => reports.refetch()} /> : <><div className="table-scroll"><table><thead><tr><th>Nội dung</th><th>Lý do</th><th>Người báo cáo</th><th>Gửi lúc</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{reports.data.items.map((report) => <tr key={report._id}><td>{names[report.targetType || "post"]}</td><td>{reasonNames[report.reason] || report.reason}</td><td>{report.reporter}</td><td>{date(report.at)}</td><td><span className={`status ${report.resolution ? "completed" : "pending"}`}>{report.resolution ? "Đã xử lý" : "Chờ xử lý"}</span></td><td><button className="secondary" onClick={() => setSelected(report._id)}>Xem xét</button></td></tr>)}</tbody></table></div>{!reports.data.items.length && <p className="admin-empty">Không có báo cáo trong danh sách này.</p>}<Pagination cursor={cursor} total={reports.data.total} hasNext={reports.data.nextCursor !== null} onChange={setCursor} /></>}
    {selected && <Review id={selected} canWrite={canWrite} close={() => setSelected(null)} />}
  </>;
}
