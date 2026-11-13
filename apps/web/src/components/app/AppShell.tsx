"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { ApiError } from "@/lib/api-repository";
import { useCommunity } from "@/hooks/use-community";
import { useChatViewport } from "@/hooks/use-chat-viewport";
import { useRealtime } from "@/hooks/use-realtime";
import { useAppStore } from "@/stores/app.store";
import { Avatar, Brand, Button, Loader } from "@/components/ui/Primitives";
import { GlobalOverlays } from "./GlobalOverlays";
import { NotificationBell } from "./NotificationBell";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { FloatingNavigation } from "./FloatingNavigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(), router = useRouter();
  const { data, error, refetch } = useCommunity();
  const frame = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  useLayoutEffect(() => { main.current?.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [pathname]);
  const home = pathname === "/community/today";
  const messaging = pathname.startsWith("/community/messages");
  const me = data?.people.find((person) => person.id === "me");
  const invitations = data?.friendRequests?.incoming.length || 0;
  useRealtime(data?.authenticated === true, data?.connections || []);
  useChatViewport(frame, !!data);
  useEffect(() => {
    document.documentElement.classList.add("tellme-shell-active");
    return () => document.documentElement.classList.remove("tellme-shell-active");
  }, []);
  useEffect(() => {
    if (!me?.username || !data?.authenticated) return;
    const profile = `/community/profile/${me.username}`;
    // Warm the profile route before the first avatar tap.
    if ("requestIdleCallback" in window) {
      const idle = window.requestIdleCallback(() => router.prefetch(profile), { timeout: 2000 });
      return () => window.cancelIdleCallback(idle);
    }
    const timer = setTimeout(() => router.prefetch(profile), 250);
    return () => clearTimeout(timer);
  }, [me?.username, data?.authenticated, router]);
  useEffect(() => {
    if (data?.authenticated === false || error instanceof ApiError && error.status === 401)
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }, [data?.authenticated, error, pathname, router]);
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", !!data?.settings.reducedMotion);
  }, [data?.settings.reducedMotion]);
  useEffect(() => {
    const dismiss = (event: MouseEvent) => document.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
      const target = event.target as Element;
      if (!menu.contains(target) || target.closest(".menu-panel a, .menu-panel button")) menu.open = false;
    });
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") document.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => { menu.open = false; });
    };
    document.addEventListener("click", dismiss); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("click", dismiss); document.removeEventListener("keydown", escape); };
  }, []);
  if (!data || data.authenticated === false) return error && !(error instanceof ApiError && error.status === 401)
    ? <div className="connection-error"><p role="alert">{error.message}</p><Button onClick={() => void refetch()}>Thử lại</Button></div>
    : <Loader />;
  return <div ref={frame} className={`app-frame close-app ${home ? "close-home" : ""} ${messaging ? "messages-frame" : ""}`}>
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <header className="close-header">
      <Link href="/community/today" className="close-brand" onNavigate={() => useAppStore.getState().setMomentView("photos")} aria-label="Tellme — ảnh mới của bạn bè"><Brand /></Link>
      <div className="close-header-end">
        <ThemeSwitch />
        <NotificationBell />
        <Link href={`/community/profile/${me?.username || "me"}`} className="close-profile-link" aria-label="Trang cá nhân của bạn"><Avatar person={me} size="sm" /></Link>
      </div>
    </header>
    <main ref={main} id="main-content" className={`main-content close-main ${messaging ? "close-messages" : ""}`}>{children}</main>
    <FloatingNavigation unread={data.conversations.reduce((sum, chat) => sum + chat.unread, 0)} invitations={invitations} />
    <GlobalOverlays />
  </div>;
}
