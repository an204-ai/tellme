import { useQuery } from "@tanstack/react-query";
import { api, number } from "../api";
import { ErrorState, Loading } from "../components";

interface Status { totals: { users: number; posts: number; stories: number; pendingReports: number } }
export function Dashboard() {
  const query = useQuery({ queryKey: ["admin", "status"], queryFn: () => api<Status>("/admin/status") });
  if (query.isPending) return <Loading label="Đang tải tổng quan…" />;
  if (query.isError) return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const { totals } = query.data;
  return <>
    <dl className="admin-totals">{[["Người dùng", totals.users], ["Bài viết", totals.posts], ["Chuỗi khoảnh khắc", totals.stories], ["Báo cáo chờ xử lý", totals.pendingReports]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number(Number(value))}</dd></div>)}</dl>
    <div className="inline-actions"><a className="secondary" href="#reports">Xem báo cáo</a><a className="secondary" href="#infrastructure">Xem tài nguyên và kết nối</a></div>
  </>;
}
