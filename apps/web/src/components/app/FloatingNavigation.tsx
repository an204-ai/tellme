"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { House, LayoutGrid, MessageCircle, UsersRound } from "lucide-react";
import { useAppStore } from "@/stores/app.store";
import { LiquidNavigation } from "./LiquidNavigation";

export function FloatingNavigation({ unread = 0, invitations = 0 }: { unread?: number; invitations?: number }) {
  const path = usePathname();
  const popup = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const setView = useAppStore((state) => state.setMomentView);
  const entries = [
    { href: "/community/friends", label: "Bạn bè", icon: UsersRound, count: invitations, countLabel: "lời mời mới" },
    { href: "/community/today", label: "Trang chủ", icon: House, count: 0, countLabel: "" },
    { href: "/community/messages", label: "Tin nhắn", icon: MessageCircle, count: unread, countLabel: "tin chưa đọc" },
  ];
  const dismiss = () => popup.current?.hidePopover();
  return <>
    <nav className="close-floating-navigation" aria-label="Điều hướng chính">
      <LiquidNavigation pathname={path} className="close-primary-navigation">
        {entries.map(({ href, label, icon: Icon, count, countLabel }) => {
          const active = path.startsWith(href);
          return <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} aria-label={count ? `${label}, ${count} ${countLabel}` : label} onNavigate={() => { dismiss(); if (href === "/community/today") setView("photos"); }}>
            <span className="close-navigation-icon"><Icon size={26} strokeWidth={active ? 2.8 : 2.4} />{count > 0 && <i className="close-dot" aria-hidden="true" />}</span>
          </Link>;
        })}
      </LiquidNavigation>
      <button type="button" className={`close-more-navigation ${expanded ? "is-open" : ""}`} popoverTarget="tellme-more" aria-label="Mở Góc Tellme" aria-expanded={expanded}><LayoutGrid size={26} strokeWidth={2.5} /></button>
    </nav>
    <div ref={popup} id="tellme-more" popover="auto" className="close-more-panel" aria-label="Góc Tellme" onToggle={(event) => setExpanded(event.newState === "open")}>
      <h2>Góc Tellme</h2>
      <p>Để dành cho những điều đặc biệt sắp tới.</p>
    </div>
  </>;
}
