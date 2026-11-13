"use client";
import { Check } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { NotificationList, useReadAllNotifications } from "@/components/app/NotificationList";
import { Loader } from "@/components/ui/Primitives";

export function NotificationsScreen() {
  const { data } = useCommunity();
  const markAll = useReadAllNotifications();
  if (!data) return <Loader />;
  return (
    <>
      <header className="page-heading page-heading-action social-page-title">
        <div>
          <h1>Những kết nối đang tiếp diễn.</h1>
          <p>Có người vừa lắng nghe câu chuyện của bạn.</p>
        </div>
        <button
          className="text-link"
          disabled={!data.unreadNotifications}
          onClick={() => void markAll().catch(() => undefined)}
        >
          <Check size={17} />
          Đọc tất cả
        </button>
      </header>
      <NotificationList active fullPage />
    </>
  );
}
export { FriendsScreen } from "./FriendsScreen";
