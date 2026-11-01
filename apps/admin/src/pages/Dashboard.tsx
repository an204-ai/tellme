import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { api, statusNames } from "../api";
import { ErrorState } from "../components";
interface Status { redis: boolean; workers: Record<string, boolean>; email: boolean; push: boolean; jobs: { _id: string; count: number }[]; totals: { users: number; posts: number; stories: number; pendingReports: number } }
export function Dashboard() {
  const query = useQuery({ queryKey: ["admin", "status"], queryFn: () => api<Status>("/admin/status"), refetchInterval: 15000 });
  if (query.isPending) return <p role="status">Đang tải trạng thái hệ thống…</p>;
  if (query.isError) return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const data = query.data;
  const services = [["Redis", data.redis], ["Xử lý ảnh", data.workers.media], ["Dựng bảng tin", data.workers.feed], ["Gửi thông báo", data.workers.notification], ["Email tài khoản", data.email], ["Web Push", data.push]] as const;
  return <>
    <div className="section-toolbar"><p>Theo dõi cộng đồng và các luồng đang hoạt động.</p><button className="secondary" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} />Làm mới</button></div>
    <dl className="admin-totals">{[["Người dùng", data.totals.users], ["Bài viết", data.totals.posts], ["Chuỗi khoảnh khắc", data.totals.stories], ["Báo cáo chờ xử lý", data.totals.pendingReports]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{Number(value).toLocaleString("vi-VN")}</dd></div>)}</dl>
    <div className="overview-columns"><section><h2>Hệ thống</h2><p className="section-note">Worker phản ánh heartbeat. Email và Web Push phản ánh cấu hình.</p><dl className="service-list">{services.map(([label, ready]) => <div key={label}><dt>{label}</dt><dd className={`status ${ready ? "ready" : "offline"}`}>{ready ? "Sẵn sàng" : "Chưa sẵn sàng"}</dd></div>)}</dl></section>
    <section><h2>Hàng đợi</h2><dl className="service-list">{Object.entries(statusNames).map(([status, label]) => <div key={status}><dt>{label}</dt><dd>{data.jobs.find((job) => job._id === status)?.count || 0}</dd></div>)}</dl><a className="text-link" href="#jobs">Xem tác vụ nền</a>{data.totals.pendingReports > 0 && <a className="primary review-link" href="#reports">Xử lý {data.totals.pendingReports} báo cáo</a>}</section></div>
  </>;
}
