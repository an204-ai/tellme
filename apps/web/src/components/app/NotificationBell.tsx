"use client";
import { usePhotoGroups } from "@/hooks/use-photo-groups";
import { useState } from "react";
import { Bell } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { useReadAllNotifications, NotificationList } from "@/components/app/NotificationList";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/stores/app.store";

export function NotificationBell() {
  const { data } = useCommunity();
  const [open, setOpen] = useState(false);
  const markAll = useReadAllNotifications();
  const fallbackUnread = data ? data.notifications.filter(
    (entry) => !entry.read && !data.blocked.includes(entry.userId),
  ).length : 0;
  const photoGroups = usePhotoGroups();
  const unread = (data?.unreadNotifications ?? fallbackUnread) + (photoGroups.data?.invitations?.length || 0);
  return <>
    <button className="header-bell" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => {
      if (open) return;
      setOpen(true);
      void markAll().catch(() => useAppStore.getState().notify("Chưa cập nhật được trạng thái đã đọc. Bạn mở lại thông báo nhé."));
    }} aria-label={`Thông báo, ${unread} chưa đọc`}>
      <Bell size={24} />
      {unread > 0 && <span className="bell-count notification-marker">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <Modal title="Thông báo" className="notification-inbox-dialog" onClose={() => setOpen(false)}>
      <NotificationList active={open} onNavigate={() => setOpen(false)} />
    </Modal>}
  </>;
}
