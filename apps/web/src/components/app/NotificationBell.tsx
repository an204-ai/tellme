"use client";
import { useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { useReadAllNotifications, NotificationList } from "@/components/app/NotificationList";

export function NotificationBell() {
  const { data } = useCommunity();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const markAll = useReadAllNotifications();
  const fallbackUnread = data ? data.notifications.filter(
    (entry) => !entry.read && !data.blocked.includes(entry.userId),
  ).length : 0;
  const unread = data?.unreadNotifications ?? fallbackUnread;
  return <>
    <button className="header-bell" type="button" popoverTarget="tellme-notifications" aria-label={`Thông báo, ${unread} chưa đọc`}>
      <Bell size={24} />
      {unread > 0 && <span className="bell-count notification-marker">{unread > 99 ? "99+" : unread}</span>}
    </button>
    <div ref={ref} id="tellme-notifications" popover="auto" className="notifications-popover" aria-label="Thông báo" onToggle={(event) => setOpen(event.newState === "open")}>
      <header>
        <h2>Thông báo</h2>
        <button type="button" aria-label="Đánh dấu tất cả thông báo đã đọc" disabled={marking || unread === 0} onClick={async () => {
          setMarking(true);
          try { await markAll(); } catch { /* Keep the current inbox visible; it can be retried. */ }
          finally { setMarking(false); }
        }}><CheckCheck size={20} /></button>
      </header>
      <NotificationList active={open} onNavigate={() => ref.current?.hidePopover()} />
    </div>
  </>;
}
