import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, date, number } from "../api";
import { ErrorState, Loading } from "../components";
import type { AnalyticsData, DailyUsage } from "../types";
const metrics = { signups: "Tài khoản mới", posts: "Bài viết", stories: "Chuỗi Tell me now", moments: "Khoảnh khắc", comments: "Bình luận", messages: "Tin nhắn" };
type Metric = keyof typeof metrics;
function exportCsv(series: DailyUsage[]) {
  const keys = Object.keys(metrics) as Metric[];
  const csv = "\uFEFF" + [["Ngày", ...keys.map((key) => metrics[key])], ...series.map((row) => [row.day, ...keys.map((key) => row[key])])].map((row) => row.join(",")).join("\r\n");
  const href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), anchor = document.createElement("a"); anchor.href = href; anchor.download = `tellme-usage-${series[0]?.day}-${series.at(-1)?.day}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
}
export function Analytics() {
  const [days, setDays] = useState("30"), [metric, setMetric] = useState<Metric>("posts");
  const query = useQuery({ queryKey: ["admin", "analytics", days], queryFn: () => api<AnalyticsData>(`/admin/analytics?days=${days}`) });
  if (query.isPending) return <Loading label="Đang tổng hợp mức sử dụng…" />;
  if (query.isError) return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const data = query.data, max = Math.max(1, ...data.series.map((row) => row[metric] ?? 0));
  const total = (key: Metric) => data.series.reduce((sum, row) => sum + (row[key] ?? 0), 0);
  return <><div className="section-toolbar"><p>Múi giờ Việt Nam · Cập nhật {date(data.at)}</p><label>Khoảng thời gian<select value={days} onChange={(event) => setDays(event.target.value)}><option value="7">7 ngày</option><option value="30">30 ngày</option><option value="90">90 ngày</option></select></label><button className="secondary" onClick={() => exportCsv(data.series)}>Xuất CSV</button></div>
    <dl className="admin-totals">{(["signups", "posts", "moments", "comments"] as Metric[]).map((key) => <div key={key}><dt>{metrics[key]} / {days} ngày</dt><dd>{number(total(key))}</dd></div>)}</dl>
    <section><div className="section-toolbar"><h2>Nhịp sử dụng mỗi ngày</h2><label>Chỉ số<select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>{Object.entries(metrics).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><figure className="usage-chart"><svg viewBox="0 0 920 250" role="img" aria-label={`${metrics[metric]} trong ${days} ngày; số liệu chi tiết ở bảng bên dưới`}><text x="12" y="18">{number(max)}</text><line x1="40" x2="905" y1="216" y2="216" stroke="#dce4f1" />{data.series.map((row, index) => { const step = 860 / data.series.length, height = (row[metric] ?? 0) / max * 175; return <rect key={row.day} x={44 + index * step} y={215 - height} width={Math.max(2, step - 4)} height={height} rx="3" fill="#07327f"><title>{row.day}: {row[metric]} {metrics[metric].toLowerCase()}</title></rect>; })}<text x="40" y="242">{data.series[0]?.day}</text><text x="905" y="242" textAnchor="end">{data.series.at(-1)?.day}</text></svg><figcaption>{metrics[metric]} · Tổng {number(total(metric))} trong khoảng chọn</figcaption></figure></section>
    <p className="admin-notice">Các chỉ số được tổng hợp trực tiếp từ dữ liệu nội dung còn lưu, không tính nội dung đã xóa. Không theo dõi lượt truy cập hoặc thời gian hoạt động; không đọc nội dung tin nhắn để thống kê.</p>
    <div className="overview-columns"><section><h2>Tài khoản & phiên đăng nhập</h2><dl className="service-list">{data.verification.map((item) => <div key={item._id}><dt>{item._id === "verified" ? "Email đã xác thực" : "Email chưa xác thực"}</dt><dd>{number(item.count)}</dd></div>)}<div><dt>Phiên đăng nhập còn hạn</dt><dd>{number(data.sessions)}</dd></div><div><dt>Báo cáo đang chờ</dt><dd>{number(data.pendingReports)}</dd></div></dl></section><section><h2>Ảnh trong ứng dụng</h2><dl className="service-list">{data.storage.map((item) => <div key={item._id}><dt>{item._id === "active" ? "Ảnh đang lưu" : "Ảnh chờ dọn"}<small>{number(item.processed)} ảnh có phiên bản tối ưu</small></dt><dd>{number(item.count)}</dd></div>)}</dl><p className="section-note">Đây là số bản ghi ảnh trong Tellme, không phải dung lượng hay hóa đơn Cloudinary.</p></section></div>
    <details className="admin-section"><summary>Xem số liệu từng ngày</summary><div className="table-scroll"><table><thead><tr><th>Ngày</th>{Object.values(metrics).map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{[...data.series].reverse().map((row) => <tr key={row.day}><td>{row.day}</td>{(Object.keys(metrics) as Metric[]).map((key) => <td key={key}>{number(row[key])}</td>)}</tr>)}</tbody></table></div></details>
  </>;
}
