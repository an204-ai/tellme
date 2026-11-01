import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api, date, type Page } from "../api";
import { ErrorState, Pagination } from "../components";
interface User { _id: string; name: string; username: string; avatar: string; email: string; createdAt: string; emailVerifiedAt?: string }
export function UsersPage({ webUrl }: { webUrl: string }) {
  const [search, setSearch] = useState(""); const [query, setQuery] = useState(""); const [cursor, setCursor] = useState(0);
  const users = useQuery({ queryKey: ["admin", "users", query, cursor], queryFn: () => api<Page<User>>(`/admin/users?q=${encodeURIComponent(query)}&cursor=${cursor}&limit=20`) });
  return <><form className="section-toolbar admin-search" onSubmit={(event) => { event.preventDefault(); setCursor(0); setQuery(search.trim().replace(/^@/, "")); }}><label className="search-field"><Search size={18} /><input aria-label="Tìm người dùng theo tên, Tellme ID hoặc email" placeholder="Tên, Tellme ID hoặc email…" maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className="primary" type="submit">Tìm kiếm</button></form>
    {users.isPending ? <p role="status">Đang tìm người dùng…</p> : users.isError ? <ErrorState error={users.error} retry={() => users.refetch()} /> : <><div className="table-scroll"><table><thead><tr><th>Tài khoản</th><th>Email</th><th>Tham gia</th><th>Hồ sơ</th></tr></thead><tbody>{users.data.items.map((user) => <tr key={user._id}><td><div className="admin-person"><img src={new URL(user.avatar || "/images/avatar-default.svg", webUrl).href} alt="" /><span><strong>{user.name}</strong><small>@{user.username}</small></span></div></td><td>{user.email}<small className="cell-note">{user.emailVerifiedAt ? "Đã xác thực" : "Chưa xác thực"}</small></td><td>{date(user.createdAt)}</td><td><a className="text-link" href={`${webUrl}/community/profile/${user.username}`} target="_blank" rel="noreferrer">Xem hồ sơ</a></td></tr>)}</tbody></table></div>{!users.data.items.length && <p className="admin-empty">Không tìm thấy tài khoản phù hợp.</p>}<Pagination cursor={cursor} total={users.data.total} hasNext={users.data.nextCursor !== null} onChange={setCursor} /></>}
  </>;
}
