import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowUpRight, Flag, LayoutDashboard, LogOut, Users } from "lucide-react";
import { api, send, ApiError, type Admin } from "./api";
import { ErrorState } from "./components";
import logo from "../../web/public/brand/logos/tellme-wordmark-on-light.png";
import icon from "../../web/public/brand/logos/tellme-symbol-on-light.png";
const Dashboard = lazy(() => import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const Reports = lazy(() => import("./pages/Reports").then((module) => ({ default: module.Reports })));
const UsersPage = lazy(() => import("./pages/Users").then((module) => ({ default: module.UsersPage })));
const Jobs = lazy(() => import("./pages/Jobs").then((module) => ({ default: module.Jobs })));

const sections = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "reports", label: "Báo cáo", icon: Flag },
  { id: "users", label: "Người dùng", icon: Users },
  { id: "jobs", label: "Tác vụ nền", icon: Activity },
] as const;
type Section = typeof sections[number]["id"];
export function App() {
  const client = useQueryClient();
  const [section, setSection] = useState<Section>("overview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const auth = useQuery({ queryKey: ["admin", "me"], queryFn: () => api<Admin>("/admin/me"), retry: false, staleTime: 30000 });
  useEffect(() => {
    const sync = () => { const found = sections.find((item) => `#${item.id}` === location.hash); setSection(found?.id || "overview"); };
    sync(); window.addEventListener("hashchange", sync);
    const favicon = document.createElement("link"); favicon.rel = "icon"; favicon.href = icon; document.head.append(favicon);
    return () => { window.removeEventListener("hashchange", sync); favicon.remove(); };
  }, []);
  const logout = async () => {
    setBusy(true); setError("");
    try { await send("/auth/logout"); client.clear(); setPassword(""); await auth.refetch(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  };
  if (auth.isPending) return <div className="admin-loading" role="status">Đang kiểm tra quyền quản trị…</div>;
  if (!auth.data) {
    const denied = auth.error instanceof ApiError && auth.error.status === 403;
    const needsLogin = auth.error instanceof ApiError && auth.error.status === 401;
    return <main className="admin-login"><img src={logo} alt="Tellme" /><h1>{denied ? "Tài khoản chưa có quyền quản trị" : "Đăng nhập quản trị"}</h1>
      {denied ? <><p>Email của tài khoản này chưa nằm trong ADMIN_EMAILS. Dùng tài khoản quản trị đã được cấp quyền.</p><button className="primary" disabled={busy} onClick={() => void logout()}>Đăng nhập tài khoản khác</button></> : needsLogin ? <form onSubmit={async (event) => {
        event.preventDefault(); setBusy(true); setError("");
        try { await send("/auth/login", { email, password }); setPassword(""); await auth.refetch(); }
        catch (failure) { setError(failure instanceof Error ? failure.message : "Không kết nối được máy chủ."); }
        finally { setBusy(false); }
      }}><label htmlFor="admin-email">Email Tellme</label><input id="admin-email" type="email" value={email} autoComplete="username" required onChange={(event) => setEmail(event.target.value)} /><label htmlFor="admin-password">Mật khẩu</label><input id="admin-password" type="password" autoComplete="current-password" value={password} required onChange={(event) => setPassword(event.target.value)} /><button type="submit" className="primary" disabled={busy}>{busy ? "Đang đăng nhập…" : "Vào trang quản trị"}</button></form> : <ErrorState error={auth.error || new Error("Chưa kiểm tra được quyền quản trị.")} retry={() => auth.refetch()} />}
      {error && <p role="alert" className="error">{error}</p>}
    </main>;
  }
  const admin = auth.data;
  return <div className="admin-shell">
    <a className="skip-link" href="#admin-main">Đến nội dung chính</a>
    <aside className="admin-sidebar"><a href="#overview" aria-label="Tellme quản trị"><img src={logo} alt="Tellme" /></a><span className="admin-workspace">Quản trị cộng đồng</span><nav aria-label="Điều hướng quản trị">{sections.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} aria-current={section === id ? "page" : undefined}><Icon size={20} />{label}</a>)}</nav><a className="admin-web-link" href={admin.webUrl} target="_blank" rel="noreferrer">Mở Tellme<ArrowUpRight size={16} /></a></aside>
    <div className="admin-content"><header className="admin-header"><span>{admin.name}<small>{admin.email}</small></span><button className="secondary" disabled={busy} onClick={() => void logout()}><LogOut size={16} />Đăng xuất</button></header>
      <main id="admin-main"><h1>{sections.find((item) => item.id === section)?.label}</h1>{!admin.verified && <p role="alert" className="admin-notice">Xác thực email để thực hiện thao tác quản trị. <a href={`${admin.webUrl}/auth/verify-email`}>Nhập mã xác thực</a></p>}{error && <p className="error" role="alert">{error}</p>}
        {admin.verified && <Suspense fallback={<p role="status">Đang mở trang…</p>}>{section === "overview" ? <Dashboard /> : section === "reports" ? <Reports canWrite={admin.verified} /> : section === "users" ? <UsersPage webUrl={admin.webUrl} /> : <Jobs canWrite={admin.verified} />}</Suspense>}
      </main>
    </div>
  </div>;
}
