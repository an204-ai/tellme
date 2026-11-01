"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Primitives";
import { request } from "@/lib/api-repository";
import type { Person } from "@/lib/types";

export function AccountBlockPicker({ blocked, friends, viewer, onBlock }: {
  blocked: string[];
  friends: string[];
  viewer?: string;
  onBlock: (id: string) => Promise<void>;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim().replace(/^@/, "")), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const results = useQuery({
    queryKey: ["tellme", "block-friend-search", viewer, friends, query],
    queryFn: ({ signal }) => request<{ people: Person[] }>(`/search?scope=people&relationship=friends&q=${encodeURIComponent(query)}`, { signal }),
    enabled: expanded,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
  const searching = search.trim().replace(/^@/, "") !== query || results.isFetching;
  const people = results.data?.people.filter((person) => friends.includes(person.id) && !blocked.includes(person.id)) || [];
  const close = () => { popup.current?.hidePopover(); trigger.current?.focus(); };
  const position = useCallback(() => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect || !popup.current) return;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const upwards = below < 240 && above > below;
    const width = Math.min(rect.width, window.innerWidth - 24);
    Object.assign(popup.current.style, {
      width: `${width}px`, left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`,
      top: upwards ? "auto" : `${rect.bottom + 6}px`,
      bottom: upwards ? `${window.innerHeight - rect.top + 6}px` : "auto",
      maxHeight: `${Math.max(120, Math.min(400, upwards ? above : below))}px`,
    });
  }, []);
  const show = () => {
    position();
    popup.current?.showPopover();
    input.current?.focus();
  };
  useEffect(() => {
    if (!expanded) return;
    const reposition = (event: Event) => {
      if (event.target instanceof Node && popup.current?.contains(event.target)) return;
      position();
    };
    // The mobile keyboard can resize/scroll the viewport after the search gains focus.
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    window.visualViewport?.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      window.visualViewport?.removeEventListener("resize", reposition);
    };
  }, [expanded, position]);
  return <div className="account-block-picker mt-5">
    <label className="field-label" htmlFor={`${id}-trigger`}>Chặn một tài khoản</label>
    <button ref={trigger} id={`${id}-trigger`} type="button" className="select-control mt-2" aria-haspopup="dialog" aria-expanded={expanded} aria-controls={id} onClick={() => expanded ? close() : show()} onKeyDown={(event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); show(); }
    }}>
      <span>Chọn bạn bè…</span><ChevronDown size={17} aria-hidden="true" />
    </button>
    <div ref={popup} id={id} popover="auto" role="dialog" aria-label="Tìm bạn bè để chặn" className="select-options account-block-popover" onToggle={(event) => setExpanded(event.newState === "open")} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== trigger.current) popup.current?.hidePopover();
    }} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const entries = Array.from(popup.current?.querySelectorAll<HTMLButtonElement>('.account-block-results button:not(:disabled)') || []);
        if (!entries.length) return;
        event.preventDefault();
        const index = entries.indexOf(document.activeElement as HTMLButtonElement);
        if (event.key === "ArrowUp" && index <= 0) input.current?.focus();
        else entries[Math.min(entries.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))]?.focus();
      }
    }}>
      <div className="account-block-search">
        <Search size={18} aria-hidden="true" />
        <input ref={input} type="search" aria-label="Tìm bạn bè bằng tên hoặc Tellme ID" placeholder="Tên hoặc @Tellme ID của bạn bè…" autoComplete="off" maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} aria-controls={`${id}-results`} />
      </div>
      <div id={`${id}-results`} className="account-block-results" aria-busy={searching || busy}>
        {searching ? <p role="status">Đang tìm tài khoản…</p> : results.isError ? <div className="account-block-error"><p role="alert">Chưa tải được danh sách. Bạn thử lại nhé.</p><button type="button" onClick={() => void results.refetch()}>Thử lại</button></div> : people.length ? <ul>
          {people.map((person) => <li key={person.id}><button type="button" disabled={busy} aria-label={`Chặn ${person.name}, Tellme ID ${person.username}`} onClick={async () => {
            setBusy(true);
            try { await onBlock(person.id); close(); }
            catch { /* useCommunity announces mutation errors; keep the picker open to retry. */ }
            finally { setBusy(false); }
          }}>
            <Avatar person={person} size="sm" />
            <span className="account-block-person"><strong>{person.name}</strong><span>@{person.username}</span></span>
            <span className="account-block-action">Chặn</span>
          </button></li>)}
        </ul> : <p role="status">{query ? "Không tìm thấy bạn bè phù hợp." : "Chưa có bạn bè để chọn. Bạn có thể chặn tài khoản khác từ menu ba chấm trên hồ sơ của họ."}</p>}
      </div>
    </div>
  </div>;
}
