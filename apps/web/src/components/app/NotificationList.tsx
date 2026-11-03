"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { NoticeAvatar } from "@/components/app/NoticeAvatar";
import { useCommunity, communityKey } from "@/hooks/use-community";
import { useNotificationPages, type NotificationScope } from "@/hooks/use-notifications";
import { apiRepository, timeAgo } from "@/lib/api-repository";
import type { NotificationPage, Notice } from "@/lib/types";

function noticeCopy(notice: Notice) {
  const count = notice.groupCount || 1;
  if (count < 2 || notice.kind === "system") return notice.text;
  return notice.kind === "message"
    ? "đã gửi tin nhắn cho bạn."
    : "đã bày tỏ cảm xúc.";
}

export function NotificationList({ active, onNavigate, fullPage = false }: { active: boolean; onNavigate?: () => void; fullPage?: boolean }) {
  const [scope, setScope] = useState<NotificationScope>("recent");
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { data: community } = useCommunity();
  const client = useQueryClient();
  const query = useNotificationPages(scope, active);
  const notices = useMemo(() => {
    const items = query.data?.pages.flatMap((page) => page.items) || [];
    return items.filter((notice) => !community?.blocked.includes(notice.userId));
  }, [community?.blocked, query.data]);
  const firstPage = query.data?.pages[0];

  useEffect(() => {
    const root = listRef.current, target = sentinelRef.current;
    if (!active || !root || !target || !query.hasNextPage || query.isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void query.fetchNextPage();
    }, { root, rootMargin: "180px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [active, query.fetchNextPage, query.hasNextPage, query.isFetchingNextPage, notices.length]);

  const openOlder = () => {
    setScope("older");
    if (listRef.current) listRef.current.scrollTop = 0;
  };
  const backToRecent = () => {
    setScope("recent");
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  const readNotice = (notice: Notice) => {
    const groupKey = `${notice.kind || "like"}:${notice.userId}`;
    client.setQueriesData<InfiniteData<NotificationPage>>({ queryKey: ["tellme", "notifications"] }, (cached) => cached && ({
      ...cached,
      pages: cached.pages.map((page) => ({
        ...page,
        items: page.items.map((item) => {
          const itemKey = `${item.kind || "like"}:${item.userId}`;
          return item.id === notice.id || (notice.kind !== "system" && itemKey === groupKey)
            ? { ...item, read: true, unreadCount: 0 }
            : item;
        }),
      })),
    }));
    void apiRepository.markNotificationGroupRead(notice).then(() => Promise.all([
      client.invalidateQueries({ queryKey: ["tellme", "notifications"] }),
      client.invalidateQueries({ queryKey: communityKey }),
    ])).catch(() => {
      void client.invalidateQueries({ queryKey: ["tellme", "notifications"] });
      void client.invalidateQueries({ queryKey: communityKey });
    });
  };

  return <div className={`notification-feed ${fullPage ? "page" : ""}`}>
    {scope === "older" && <button type="button" className="notification-scope-back" onClick={backToRecent}>← Thông báo 7 ngày gần đây</button>}
    <div className="notifications-popover-list notification-feed-list" ref={listRef}>
      {query.isPending ? <p className="notification-feed-state">Đang tải thông báo…</p> : query.isError ? <button type="button" className="notification-feed-state notification-feed-retry" onClick={() => void query.refetch()}>Chưa tải được. Chạm để thử lại.</button> : notices.length ? notices.map((notice) => {
        const person = community?.people.find((entry) => entry.id === notice.userId);
        const destination = notice.kind === "system" ? notice.url || "/community/today" : notice.postId
          ? `/post/${notice.postId}`
          : person?.username ? `/community/profile/${person.username}` : "/community/notifications";
        const unreadCount = notice.unreadCount ?? Number(!notice.read);
        return <Link
          className={`popover-notice ${unreadCount ? "unread" : ""}`}
          href={destination}
          key={`${notice.kind || "like"}:${notice.userId}:${notice.id}`}
          onClick={() => { onNavigate?.(); readNotice(notice); }}
        >
          <span className="popover-notice-avatar">
            <NoticeAvatar notice={notice} person={person} />
            {unreadCount > 1 ? <span className="notification-group-count notification-marker" aria-label={`${unreadCount} thông báo chưa đọc`}>{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
          </span>
          <span className="popover-notice-copy">
            <span className="popover-notice-message"><strong>{notice.kind === "system" ? notice.title : person?.name || "Một người bạn"}</strong> {noticeCopy(notice)}</span>
            <time>{timeAgo(notice.at)}</time>
          </span>
          {unreadCount > 0 && <i className="notification-marker" aria-label="Chưa đọc" />}
        </Link>;
      }) : <p className="notification-feed-state">{scope === "recent" && firstPage?.olderAvailable ? "Bảy ngày gần đây chưa có thông báo mới." : "Bạn đã xem hết thông báo."}</p>}
      <div className="notification-feed-sentinel" ref={sentinelRef} aria-hidden="true" />
      {query.isFetchingNextPage && <p className="notification-feed-state" role="status">Đang tải thêm…</p>}
      {query.hasNextPage && !query.isFetchingNextPage && <button type="button" className="notification-feed-more" onClick={() => void query.fetchNextPage()}>Tải thêm</button>}
    </div>
    {scope === "recent" && firstPage?.olderAvailable && <button type="button" className="notification-older-button" onClick={openOlder}>Xem thêm thông báo cũ</button>}
  </div>;
}

export function useReadAllNotifications() {
  const client = useQueryClient();
  return async () => {
    await apiRepository.markAllNotificationsRead();
    await Promise.all([
      client.invalidateQueries({ queryKey: ["tellme", "notifications"] }),
      client.invalidateQueries({ queryKey: communityKey }),
    ]);
  };
}
