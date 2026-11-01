"use client";
import Link from "next/link";
import { NoticeAvatar } from "@/components/app/NoticeAvatar";
import { useRef } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { timeAgo } from "@/lib/api-repository";

export function NotificationBell() {
  const { data, update } = useCommunity();
  const ref = useRef<HTMLDivElement>(null);
  const unread =
    data?.notifications.filter(
      (entry) => !entry.read && !data.blocked.includes(entry.userId),
    ).length || 0;
  const notices =
    data?.notifications.filter(
      (entry) => !data.blocked.includes(entry.userId),
    ) || [];
  return (
    <>
      <button
        className="header-bell"
        type="button"
        popoverTarget="tellme-notifications"
        aria-label={`Thông báo, ${unread} chưa đọc`}
      >
        <Bell size={24} />
        {unread > 0 && <span className="bell-count">{unread}</span>}
      </button>
      <div
        ref={ref}
        id="tellme-notifications"
        popover="auto"
        className="notifications-popover"
        aria-label="Thông báo"
      >
        <header>
          <h2>Thông báo</h2>
          <button
            type="button"
            aria-label="Đánh dấu tất cả thông báo đã đọc"
            onClick={() =>
              void update((draft) =>
                draft.notifications.forEach((entry) => {
                  entry.read = true;
                }),
              ).catch(() => undefined)
            }
          >
            <CheckCheck size={20} />
          </button>
        </header>
        <div className="notifications-popover-list">
          {notices.length ? (
            notices.map((notice) => {
              const person = data?.people.find(
                (entry) => entry.id === notice.userId,
              );
              return (
                <Link
                  className={`popover-notice ${notice.read ? "" : "unread"}`}
                  href={
                    notice.kind === "system" ? notice.url || "/community/today" : notice.postId
                      ? `/post/${notice.postId}`
                      : `/community/profile/${person?.username}`
                  }
                  key={notice.id}
                  onClick={() => {
                    ref.current?.hidePopover();
                    void update((draft) => {
                      const target = draft.notifications.find(
                        (entry) => entry.id === notice.id,
                      );
                      if (target) target.read = true;
                    }).catch(() => undefined);
                  }}
                >
                  <NoticeAvatar notice={notice} person={person} />
                  <span>
                    <span>
                      <strong>{notice.kind === "system" ? notice.title : person?.name}</strong> {notice.text}
                    </span>
                    <time>{timeAgo(notice.at)}</time>
                  </span>
                  {!notice.read && <i aria-label="Chưa đọc" />}
                </Link>
              );
            })
          ) : (
            <p className="popover-no-notices">Bạn đã xem hết thông báo.</p>
          )}
        </div>
      </div>
    </>
  );
}
