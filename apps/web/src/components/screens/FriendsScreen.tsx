"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, MoreHorizontal, Search, UserMinus, UserPlus, UsersRound, X } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { request } from "@/lib/api-repository";
import { profileSchema } from "@/lib/validation";
import type { FriendLookup, Person, ProfileConnection } from "@/lib/types";
import { useAppStore } from "@/stores/app.store";
import { Avatar, Button, Loader } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";

export function FriendsScreen() {
  const { data } = useCommunity();
  const query = useQueryClient();
  const notify = useAppStore((state) => state.notify);
  const [id, setId] = useState("");
  const [found, setFound] = useState<FriendLookup | null>(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<Person | null>(null);
  const lookup = useMutation({
    mutationFn: (tellmeId: string) => request<FriendLookup>(`/friends/lookup?id=${encodeURIComponent(tellmeId)}`),
    onSuccess: setFound,
    onError: (failure) => { setFound(null); setError(failure.message); },
  });
  const action = useMutation({
    mutationFn: async ({ path, method, body, message }: { path: string; method: string; body?: unknown; message: string }) => {
      await request(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      await query.invalidateQueries({ queryKey: ["tellme"], predicate: (entry) => entry.queryKey[1] !== "music" });
      return message;
    },
    onSuccess: (message) => { setFound(null); setRemoving(null); notify(message); },
    onError: (failure) => notify(failure.message),
  });
  if (!data) return <Loader />;
  const friends = data.people.filter((person) => data.connections.includes(person.id) && !data.blocked.includes(person.id));
  const incoming = data.friendRequests?.incoming || [], outgoing = data.friendRequests?.outgoing || [];
  const personInfo = (person: ProfileConnection) => <><Avatar person={person} size="lg" /><span><strong>{person.name}</strong><small>@{person.username}</small></span></>;
  const respond = (requestId: string, accept: boolean, name: string) => action.mutate({ path: `/friends/requests/${encodeURIComponent(requestId)}`, method: "PUT", body: { accept }, message: accept ? `Bạn và ${name} đã kết nối.` : "Đã từ chối lời mời." });
  return <div className="close-friends-page">
    <h1 className="sr-only">Kết nối bằng Tellme ID</h1>
    <section className="close-id-search" aria-labelledby="friend-id-label">
      <form onSubmit={(event) => {
        event.preventDefault(); setError(""); setFound(null);
        const parsed = profileSchema.shape.username.safeParse(id);
        if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Nhập đầy đủ Tellme ID."); return; }
        lookup.mutate(parsed.data);
      }}>
        <label htmlFor="friend-id" id="friend-id-label">Thêm bạn bằng Tellme ID</label>
        <div className="close-id-field"><input id="friend-id" value={id} onChange={(event) => { setId(event.target.value); setFound(null); setError(""); }} placeholder="Nhập đầy đủ Tellme ID…" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={25} aria-invalid={!!error} aria-describedby={error ? "friend-id-error" : undefined} /><button type="submit" aria-label="Tìm đúng Tellme ID" disabled={lookup.isPending || action.isPending}>{lookup.isPending ? <span className="close-search-loading" aria-label="Đang tìm…" /> : <Search size={22} />}</button></div>
        {error && <p className="field-error" id="friend-id-error" role="alert">{error}</p>}
      </form>
      {found && <div className="close-lookup-result" aria-live="polite">
        <div className="close-person-row">{personInfo(found.person)}</div>
        {found.relationship === "none" ? <Button disabled={action.isPending} onClick={() => action.mutate({ path: "/friends/requests", method: "POST", body: { tellmeId: found.person.username }, message: `Đã gửi lời mời đến ${found.person.name}.` })}><UserPlus size={18} />Gửi lời mời</Button>
          : found.relationship === "incoming" && found.requestId ? <Button disabled={action.isPending} onClick={() => respond(found.requestId!, true, found.person.name)}><Check size={18} />Chấp nhận kết bạn</Button>
          : found.relationship === "friends" ? <Link href={`/community/profile/${found.person.username}`} className="close-primary">Ghé trang của bạn</Link>
          : <p className="close-pending-label">{found.relationship === "self" ? "Đây là Tellme ID của bạn." : <><Clock3 size={17} />Đã gửi lời mời, chờ bạn ấy chấp nhận.</>}</p>}
      </div>}
    </section>
    {incoming.length > 0 && <section className="close-friend-section" aria-labelledby="incoming-heading"><h2 id="incoming-heading">Lời mời gửi đến bạn</h2>{incoming.map((entry) => <article className="close-request" key={entry.id}><div className="close-person-row">{personInfo(entry.person)}</div><div className="close-request-actions"><Button disabled={action.isPending} onClick={() => respond(entry.id, true, entry.person.name)}><Check size={17} />Chấp nhận</Button><Button variant="ghost" disabled={action.isPending} onClick={() => respond(entry.id, false, entry.person.name)}><X size={17} />Từ chối</Button></div></article>)}</section>}
    <section className="close-friend-section" aria-labelledby="friends-heading"><h2 id="friends-heading">Những người bạn đã kết nối</h2>{friends.length ? <ul className="close-friend-list">{friends.map((person) => <li key={person.id}><Link href={`/community/profile/${person.username}`} className="close-person-row">{personInfo(person)}</Link><details className="content-menu"><summary aria-label={`Tùy chọn kết nối với ${person.name}`}><MoreHorizontal size={21} /></summary><div className="menu-panel"><button type="button" onClick={() => setRemoving(person)}><UserMinus size={17} />Hủy kết bạn</button></div></details></li>)}</ul> : <div className="close-no-friends"><UsersRound size={32} /><p>Tìm Tellme ID của một người bạn để bắt đầu chia sẻ ảnh với nhau.</p></div>}</section>
    {outgoing.length > 0 && <section className="close-friend-section" aria-labelledby="outgoing-heading"><h2 id="outgoing-heading">Đang chờ phản hồi</h2>{outgoing.map((entry) => <div className="close-outgoing" key={entry.id}><div className="close-person-row">{personInfo(entry.person)}</div><button type="button" className="close-text-action" disabled={action.isPending} onClick={() => action.mutate({ path: `/friends/requests/${encodeURIComponent(entry.id)}`, method: "DELETE", message: "Đã hủy lời mời." })}>Hủy lời mời</button></div>)}</section>}
    {removing && <Modal title={`Hủy kết bạn với ${removing.name}?`} onClose={() => { if (!action.isPending) setRemoving(null); }}><div className="dialog-body"><p>Hai bạn sẽ không còn xem được ảnh và trang cá nhân của nhau.</p><div className="close-request-actions"><Button variant="secondary" disabled={action.isPending} onClick={() => setRemoving(null)}>Giữ kết nối</Button><Button disabled={action.isPending} onClick={() => action.mutate({ path: `/friends/${removing.id}`, method: "DELETE", message: `Đã hủy kết bạn với ${removing.name}.` })}>{action.isPending ? "Đang lưu…" : "Hủy kết bạn"}</Button></div></div></Modal>}
  </div>;
}
