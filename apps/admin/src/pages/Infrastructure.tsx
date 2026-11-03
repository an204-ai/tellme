import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { api, bytes, date, number } from "../api";
import { ErrorState, Loading } from "../components";
import type { InfrastructureData } from "../types";

const states = {
  connected: "Kết nối được", unavailable: "Chưa lấy được dữ liệu",
  configured: "Đã cấu hình", disabled: "Chưa cấu hình",
};
const hourLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });

export function Infrastructure() {
  const query = useQuery({
    queryKey: ["admin", "infrastructure"],
    queryFn: () => api<InfrastructureData>("/admin/infrastructure"),
    refetchInterval: 60000,
  });
  if (!query.data) return query.isError
    ? <ErrorState error={query.error} retry={() => query.refetch()} />
    : <Loading label="Đang kiểm tra hạ tầng…" />;
  const data = query.data;
  const peak = Math.max(1, ...data.traffic.map(({ count }) => count));
  const { disk } = data.host;
  return <>
    <div className="section-toolbar">
      <p>{data.environment} · Cập nhật {date(data.at)}</p>
      <button className="secondary" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} />Làm mới</button>
    </div>
    <dl className="admin-totals">
      <div><dt>Request trong phút trước</dt><dd>{number(data.requestsPerMinute)}</dd></div>
      <div><dt>RAM khả dụng</dt><dd>{bytes(data.host.freeMemoryBytes)} / {bytes(data.host.totalMemoryBytes)}</dd></div>
      <div><dt>Đĩa khả dụng</dt><dd>{disk ? `${bytes(disk.availableBytes)} / ${bytes(disk.totalBytes)}` : "—"}</dd></div>
      <div><dt>Lưu trữ Cloudinary</dt><dd>{bytes(data.cloudinary.storageBytes)}</dd></div>
    </dl>
    <section className="admin-section">
      <h2>Request API trong 24 giờ gần nhất</h2>
      <p className="section-note">Mỗi cột là một khoảng 60 phút, theo giờ Việt Nam. Số liệu từ tiến trình API hiện tại và được tính lại sau khi khởi động.</p>
      <ol className="admin-traffic" aria-label="Số request từng giờ">
        {data.traffic.map(({ hour, count }) => <li key={hour} title={`${hourLabel.format(new Date(hour))} · ${number(count)} request`}>
          <span className="sr-only">{hourLabel.format(new Date(hour))} · {number(count)} request</span>
          <span aria-hidden="true" className="admin-traffic-bar" style={{ height: `${count / peak * 100}%` }} />
        </li>)}
      </ol>
      <div className="admin-traffic-labels" aria-hidden="true">{data.traffic.filter((_, i) => i % 4 === 0 || i === 23).map(({ hour }) => <span key={hour}>{hourLabel.format(new Date(hour))}</span>)}</div>
    </section>
    <section className="admin-section">
      <h2>Kết nối dịch vụ</h2>
      <dl className="service-list">{data.connections.map(({ name, state }) => <div key={name}>
        <dt>{name}</dt><dd className={`status ${state === "connected" ? "ready" : state === "unavailable" ? "offline" : "pending"}`}>{states[state]}</dd>
      </div>)}</dl>
      <p className="section-note">Đã cấu hình cho biết tích hợp đã có thiết lập. Dung lượng đĩa lấy từ filesystem mà container nhìn thấy.</p>
    </section>
  </>;
}
