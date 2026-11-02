import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { api, date, statusNames } from "../api";
import { ErrorState, Loading } from "../components";
interface Status { redis: boolean; workers: Record<string, boolean>; email: boolean; push: boolean; jobs: { _id: string; count: number }[]; totals: { users: number; posts: number; stories: number; pendingReports: number } }
export function Dashboard() {
  const query = useQuery({ queryKey: ["admin", "status"], queryFn: () => api<Status>("/admin/status"), refetchInterval: 15000 });
  if (query.isPending) return <Loading label="Đang tải trạng thái hệ thống…" />;
  if (query.isError) return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const data = query.data;
  const services = [["Redis", data.redis], ["Xử lý ảnh", data.workers.media], ["Dựng bảng tin", data.workers.feed], ["Gửi thông báo", data.workers.notification], ["Email tài khoản", data.email], ["Web Push", data.push]] as const;
  return <>
    <div className="section-toolbar"><p>Điểm bắt đầu cho một ca vận hành · {date(new Date(query.dataUpdatedAt).toISOString())}</p><button className="secondary" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} />Làm mới</button></div>
    {(!data.redis || Object.values(data.workers).some((ready) => !ready) || data.jobs.some((job) => job._id === "failed" && job.count > 0)) && <p className="admin-notice">Có dịch vụ chưa sẵn sàng hoặc tác vụ lỗi cần kiểm tra. <a href="#infrastructure">Mở tình trạng hạ tầng</a></p>}
    <dl className="admin-totals">{[["Người dùng", data.totals.users], ["Bài viết", data.totals.posts], ["Chuỗi khoảnh khắc", data.totals.stories], ["Báo cáo chờ xử lý", data.totals.pendingReports]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{Number(value).toLocaleString("vi-VN")}</dd></div>)}</dl>
    <div className="overview-columns"><section><h2>Hệ thống</h2><p className="section-note">Worker phản ánh heartbeat. Email và Web Push phản ánh cấu hình.</p><dl className="service-list">{services.map(([label, ready], index) => <div key={label}><dt>{label}</dt><dd className={`status ${ready ? "ready" : index >= 4 ? "pending" : "offline"}`}>{index >= 4 ? ready ? "Đã cấu hình" : "Chưa cấu hình" : ready ? "Sẵn sàng" : "Chưa sẵn sàng"}</dd></div>)}</dl><a className="text-link" href="#infrastructure">Xem tài nguyên và kết nối</a></section>
    <section><h2>Hàng đợi</h2><dl className="service-list">{Object.entries(statusNames).map(([status, label]) => <div key={status}><dt>{label}</dt><dd>{data.jobs.find((job) => job._id === status)?.count || 0}</dd></div>)}</dl><a className="text-link" href="#jobs">Xem tác vụ nền</a>{data.totals.pendingReports > 0 && <a className="primary review-link" href="#reports">Xử lý {data.totals.pendingReports} báo cáo</a>}</section></div>
    <section className="admin-section"><h2>Tra cứu nhanh</h2><div className="inline-actions"><a className="secondary" href="#jobs">Tác vụ nền</a><a className="secondary" href="#analytics">Xem mức sử dụng</a><a className="secondary" href="#audit">Xem lịch sử quản trị</a></div></section>
  </>;
}
