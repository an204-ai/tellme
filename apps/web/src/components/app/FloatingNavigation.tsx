"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { House, LayoutGrid, MessageCircle, UsersRound, Images } from "lucide-react";
import { useAppStore } from "@/stores/app.store";
import { LiquidNavigation } from "./LiquidNavigation";
import { Modal } from "@/components/ui/Modal";
import { MomentActions } from "./MomentActions";
import type { PhotoMoment } from "./MomentCard";

export function FloatingNavigation({ unread = 0, invitations = 0, viewer = false, moment }: { unread?: number; invitations?: number; viewer?: boolean; moment?: PhotoMoment | null }) {
  const path = usePathname();
  const [expanded, setExpanded] = useState(false);
  const setView = useAppStore((state) => state.setMomentView);
  const homeMoment = useAppStore((state) => state.activeMoment);
  const view = useAppStore((state) => state.momentView);
  const home = path === "/community/today";
  const photo = viewer ? moment : home && view === "photos" ? homeMoment : null;
  const camera = home && !photo && !viewer;
  const entries = [
    { href: "/community/friends", label: "Bạn bè", icon: UsersRound, count: invitations, countLabel: "lời mời mới" },
    { href: "/community/today", label: photo ? "Về camera để chụp" : "Trang chủ", icon: House, count: 0, countLabel: "" },
    { href: "/community/messages", label: "Tin nhắn", icon: MessageCircle, count: unread, countLabel: "tin chưa đọc" },
  ];
  return <>
    <nav className={`close-floating-navigation ${photo ? "is-photo-dock" : ""} ${viewer ? "viewer-navigation" : ""} ${camera ? "is-camera-dock" : ""}`} aria-label="Điều hướng chính">
      {!camera && <button type="button" className={`close-more-navigation ${expanded ? "is-open" : ""}`} onClick={() => setExpanded(true)} aria-haspopup="dialog" aria-label="Mở Góc Tellme" aria-expanded={expanded}><LayoutGrid size={25} strokeWidth={2.5} /></button>}
      <LiquidNavigation pathname={path} className="close-primary-navigation">
        {entries.map(({ href, label, icon: Icon, count, countLabel }) => {
          const active = path.startsWith(href) || viewer && href === "/community/today";
          return <Link key={href} href={href} prefetch={true} className={`${active ? "active" : ""} ${href === "/community/today" && photo ? "dock-camera-link" : ""}`} aria-current={active ? "page" : undefined} aria-label={count ? `${label}, ${count} ${countLabel}` : label} onClick={() => {
            setExpanded(false);
            if (viewer) useAppStore.getState().viewStory(null);
            if (href === "/community/today") setView("photos");
          }}>
            <span className="close-navigation-icon">{href === "/community/today" && photo ? <span className="dock-camera-shutter" aria-hidden="true" /> : <Icon size={26} strokeWidth={active ? 2.8 : 2.4} />}{count > 0 && <i className="close-dot" aria-hidden="true" />}</span>
            <RoutePending />
          </Link>;
        })}
      </LiquidNavigation>
      {!camera && <div className="dock-photo-actions">{photo && <MomentActions key={photo.item.id} moment={photo} />}</div>}
    </nav>
    {expanded && <Modal fitViewport title="Góc Tellme" className="tellme-corner-dialog" onClose={() => setExpanded(false)}><div className="dialog-body corner-functions"><button type="button" className="corner-function" onClick={() => { setExpanded(false); useAppStore.getState().open("photo-groups"); }}><span className="photo-group-symbol glass-control"><Images size={27} /></span><span>Nhóm ảnh</span></button></div></Modal>}
  </>;
}

function RoutePending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="route-link-pending" role="status"><span className="sr-only">Đang mở trang…</span></span> : null;
}
