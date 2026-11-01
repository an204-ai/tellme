"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, Bell, BellOff, ChevronRight, Image, LogOut, PencilLine, Search, ShieldOff, UserPlus, Users, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCommunity } from "@/hooks/use-community";
import { request, timeAgo } from "@/lib/api-repository";
import { canMessagePerson } from "@/lib/chat-policy";
import { DEFAULT_GROUP_AVATAR } from "@/lib/social-assets";
import type { AppData, Conversation, Message } from "@/lib/types";
import { Avatar, Button, IconButton, SearchInput } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { GroupComposer } from "./GroupComposer";
import { SharedPostPreview } from "./SharedPostPreview";
import { StoryReplyPreview } from "./StoryReply";

type Mode = "overview" | "search" | "shared" | "members" | "invite";
type Confirmation = { type: "leave" | "remove" | "block"; id?: string; name?: string };

export function ConversationTools({ chat, data, open, panelId, onClose }: {
  chat: Conversation; data: AppData; open: boolean; panelId: string; onClose: () => void;
}) {
  const { refetch } = useCommunity();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("overview");
  const [editing, setEditing] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const group = chat.kind === "group";
  const owner = group && chat.ownerId === "me";
  const person = data.people.find((entry) => entry.id === chat.userId);
  const identity = group ? { name: chat.title || "Nhóm trò chuyện", avatar: chat.avatar || DEFAULT_GROUP_AVATAR } : person;
  const members = (chat.participantIds || []).map((id) => data.people.find((entry) => entry.id === id)).filter((entry) => !!entry);
  const friends = data.people.filter((entry) => canMessagePerson(entry.id, data) && !chat.participantIds?.includes(entry.id));
  const candidates = selected.filter((id) => friends.some((friend) => friend.id === id));
  const title = { overview: group ? "Thông tin nhóm" : "Thông tin cuộc trò chuyện", search: "Tìm tin nhắn", shared: "Nội dung đã chia sẻ", members: "Thành viên nhóm", invite: "Thêm bạn vào nhóm" }[mode];

  useEffect(() => { const timer = setTimeout(() => setDebounced(query.trim()), 250); return () => clearTimeout(timer); }, [query]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      void Promise.allSettled((panel.current?.getAnimations() || []).map((animation) => animation.finished)).then(() => {
        if (cancelled) return;
        if (mode === "search" || mode === "invite") searchRef.current?.focus({ preventScroll: true }); else heading.current?.focus({ preventScroll: true });
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [open, mode]);
  const results = useInfiniteQuery({
    queryKey: ["tellme", "chat-tools", chat.id, mode, mode === "search" ? debounced : ""],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) => request<{ items: Message[]; nextCursor: string | null }>(`/conversations/${chat.id}/search?${new URLSearchParams({ ...(mode === "search" ? { q: debounced } : { shared: "true" }), ...(pageParam ? { cursor: pageParam } : {}) })}`, { signal }),
    getNextPageParam: (page) => page.nextCursor,
    enabled: open && (mode === "shared" || mode === "search" && !!debounced),
    staleTime: 10000,
  });
  const changeMode = (next: Mode) => { setQuery(""); setDebounced(""); setError(""); setMode(next); };
  const action = async (path: string, init: RequestInit, after?: () => void) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await request(path, init); await refetch({ throwOnError: true }); setConfirmation(null); after?.(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa lưu được. Thử lại nhé."); }
    finally { setBusy(false); }
  };

  return <aside ref={panel} id={panelId} className="chat-tools" aria-labelledby={headingId} aria-hidden={!open} inert={!open}>
    <div className="chat-tools-inner">
      <header className="chat-tools-header">
        {mode !== "overview" && <IconButton label="Về thông tin trò chuyện" tooltip={false} onClick={() => changeMode("overview")}><ArrowLeft size={19} /></IconButton>}
        <h2 id={headingId} ref={heading} tabIndex={-1}>{title}</h2>
        <IconButton label="Đóng thông tin trò chuyện" tooltip={false} onClick={onClose}><X size={20} /></IconButton>
      </header>
      <div className="chat-tools-body">
        {mode === "overview" && <>
          <div className="chat-tools-identity"><Avatar person={identity} size="lg" /><strong>{identity?.name}</strong><span>{group ? `${chat.participantIds?.length || 0} thành viên` : `@${person?.username || ""}`}</span></div>
          <div className="chat-tool-actions">
            {group ? <>
              {owner && <button onClick={() => setEditing(true)}><PencilLine size={18} /><span>Đổi tên và avatar nhóm</span><ChevronRight size={16} /></button>}
              <button onClick={() => changeMode("members")}><Users size={18} /><span>Thành viên nhóm</span><ChevronRight size={16} /></button>
            </> : person && <Link href={`/community/profile/${person.username}`}><UserRound size={18} /><span>Xem trang cá nhân</span><ChevronRight size={16} /></Link>}
            <button onClick={() => changeMode("search")}><Search size={18} /><span>Tìm trong cuộc trò chuyện</span><ChevronRight size={16} /></button>
            <button onClick={() => changeMode("shared")}><Image size={18} /><span>Nội dung đã chia sẻ</span><ChevronRight size={16} /></button>
            <button aria-pressed={!!chat.muted} disabled={busy} onClick={() => void action(`/conversations/${chat.id}/preferences`, { method: "PUT", body: JSON.stringify({ muted: !chat.muted }) })}>{chat.muted ? <BellOff size={18} /> : <Bell size={18} />}<span>{chat.muted ? "Bật lại thông báo" : "Tắt thông báo cuộc trò chuyện"}</span></button>
          </div>
          <div className="chat-tool-actions chat-tool-safety">
            {group ? <button onClick={() => { setError(""); setConfirmation({ type: "leave" }); }}><LogOut size={18} /><span>Rời nhóm</span></button> : <button disabled={!person} onClick={() => { setError(""); setConfirmation({ type: "block", id: person?.id, name: person?.name }); }}><ShieldOff size={18} /><span>Chặn tài khoản</span></button>}
          </div>
        </>}

        {mode === "members" && <>
          <div className="chat-members-toolbar"><span>{members.length} thành viên</span>{owner && <button type="button" className="chat-members-add" aria-label="Thêm thành viên vào nhóm" onClick={() => changeMode("invite")}><UserPlus size={15} /><span>Thêm</span></button>}</div>
          <div className="chat-member-list">{members.map((member) => <div className="chat-member-row" key={member.id}>
            <Avatar person={member} size="sm" /><Link href={`/community/profile/${member.username}`}><strong>{member.name}{member.id === "me" ? " (Bạn)" : ""}</strong><small>{member.id === chat.ownerId ? "Trưởng nhóm" : `@${member.username}`}</small></Link>
            {owner && member.id !== "me" && <button className="chat-member-remove" onClick={() => { setError(""); setConfirmation({ type: "remove", id: member.id, name: member.name }); }}>Xóa</button>}
          </div>)}</div>
        </>}

        {mode === "invite" && <>
          <SearchInput ref={searchRef} aria-label="Tìm bạn để thêm vào nhóm" placeholder="Tên hoặc @Tellme ID…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="chat-invite-list">{friends.filter((friend) => `${friend.name} ${friend.username}`.toLocaleLowerCase("vi").includes(query.replace(/^@/, "").toLocaleLowerCase("vi"))).map((friend) => <label className="chat-member-row" key={friend.id}>
            <input type="checkbox" checked={candidates.includes(friend.id)} disabled={busy || !candidates.includes(friend.id) && candidates.length + members.length >= 30} onChange={() => setSelected((current) => current.includes(friend.id) ? current.filter((id) => id !== friend.id) : [...current, friend.id])} /><Avatar person={friend} size="sm" /><span><strong>{friend.name}</strong><small>@{friend.username}</small></span>
          </label>)}</div>
          {!friends.length && <p className="chat-tools-empty">Những người bạn của bạn đều đã có trong nhóm.</p>}
          <Button disabled={busy || !candidates.length} onClick={() => void action(`/conversations/${chat.id}/members`, { method: "POST", body: JSON.stringify({ participantIds: candidates }) }, () => { setSelected([]); changeMode("members"); })}>{busy ? "Đang thêm…" : `Thêm${candidates.length ? ` ${candidates.length} người` : " thành viên"}`}</Button>
        </>}

        {(mode === "search" || mode === "shared") && <>
          {mode === "search" && <SearchInput ref={searchRef} placeholder="Nhập nội dung cần tìm…" aria-label="Tìm nội dung tin nhắn" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} />}
          {mode === "search" && !debounced ? <p className="chat-tools-empty">Tìm lại một câu nói, một lời hẹn trong cuộc trò chuyện.</p> : results.isPending ? <p className="chat-tools-empty" role="status">Đang tìm…</p> : results.isError ? <div className="chat-tools-empty"><p role="alert">Chưa tải được nội dung.</p><button className="text-link" onClick={() => void results.refetch()}>Thử lại</button></div> : <>
            <div className="chat-found-list">{results.data?.pages.flatMap((page) => page.items).map((message) => <article className="chat-found-item" key={message.id}>
              <div><strong>{message.own ? "Bạn" : data.people.find((entry) => entry.id === message.userId)?.name || "Thành viên"}</strong><time dateTime={message.at}>{timeAgo(message.at)}</time></div>
              {message.postId ? <SharedPostPreview id={message.postId} /> : message.storyReply ? <><StoryReplyPreview reply={message.storyReply} /><p>{message.text}</p></> : <p>{message.text}</p>}
            </article>)}</div>
            {!results.data?.pages[0]?.items.length && <p className="chat-tools-empty">{mode === "shared" ? "Chưa có bài viết hay khoảnh khắc được chia sẻ." : "Chưa tìm thấy tin nhắn phù hợp."}</p>}
            {results.hasNextPage && <Button variant="ghost" disabled={results.isFetchingNextPage} onClick={() => void results.fetchNextPage()}>{results.isFetchingNextPage ? "Đang tải…" : "Xem kết quả cũ hơn"}</Button>}
          </>}
        </>}
        {error && !confirmation && <p className="field-error" role="alert">{error}</p>}
      </div>
    </div>
    {editing && <Modal title="Chỉnh sửa nhóm chat" className="create-group-dialog" onClose={() => setEditing(false)}><div className="dialog-body"><GroupComposer data={data} editGroup={chat} onCreated={() => setEditing(false)} /></div></Modal>}
    {confirmation && <Modal title={confirmation.type === "leave" ? "Rời nhóm chat?" : confirmation.type === "remove" ? "Xóa thành viên?" : "Chặn tài khoản?"} onClose={() => { if (!busy) setConfirmation(null); }}><div className="dialog-body chat-confirmation">
      <p>{confirmation.type === "leave" ? `Bạn sẽ rời “${chat.title}” và không nhận tin mới từ nhóm.${owner && members.length > 1 ? " Quyền trưởng nhóm sẽ chuyển cho thành viên tiếp theo." : members.length === 1 ? " Bạn là thành viên cuối cùng; nhóm và lịch sử trò chuyện sẽ được xóa." : ""}` : confirmation.type === "remove" ? `${confirmation.name} sẽ không thể xem hoặc gửi tin trong nhóm này nữa.` : `Bạn và ${confirmation.name} sẽ không thể nhắn tin cho nhau. Có thể bỏ chặn trong Cài đặt.`}</p>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div><Button variant="secondary" disabled={busy} onClick={() => setConfirmation(null)}>Hủy</Button><Button disabled={busy} onClick={() => {
        if (confirmation.type === "block") void action(`/users/${confirmation.id}/block`, { method: "PUT", body: JSON.stringify({ blocked: true }) }, () => router.push("/community/messages"));
        else void action(`/conversations/${chat.id}/members/${confirmation.type === "leave" ? "me" : confirmation.id}`, { method: "DELETE" }, () => { if (confirmation.type === "leave") router.push("/community/messages"); });
      }}>{busy ? "Đang lưu…" : confirmation.type === "leave" ? "Rời nhóm" : confirmation.type === "remove" ? "Xóa khỏi nhóm" : "Chặn tài khoản"}</Button></div>
    </div></Modal>}
  </aside>;
}
