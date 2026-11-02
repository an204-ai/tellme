"use client";
import { useChatViewport } from "@/hooks/use-chat-viewport";
import Link from "next/link";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  ArrowUpRight,
  Archive,
  Camera,
  ChevronDown,
  ChevronRight,
  Home,
  HeartHandshake,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRepository, ApiError, request } from "@/lib/api-repository";
import { useCommunity } from "@/hooks/use-community";
import { useAppStore } from "@/stores/app.store";
import { canView } from "@/lib/visibility";
import { DAILY_TITLE, DAILY_SHORT, FEED_TITLE } from "@/lib/brand";
import { localDay } from "@/lib/validation";
import {
  Avatar,
  Brand,
  SearchInput,
  Loader,
  Button,
} from "@/components/ui/Primitives";
import { GlobalOverlays } from "./GlobalOverlays";
import { SupportInvitation } from "./TellmeSupport";
import { LiquidNavigation } from "./LiquidNavigation";
import { PageNavigationLoader } from "./PageNavigationLoader";
import { usePageNavigation } from "@/hooks/use-page-navigation";
import { NotificationBell } from "./NotificationBell";
import type { AppData } from "@/lib/types";
import { useRealtime } from "@/hooks/use-realtime";

const nav = [
  { href: "/community/today", label: DAILY_TITLE, icon: Camera },
  { href: "/community/feed", label: FEED_TITLE, icon: Home },
  { href: "/community/messages", label: "Tin nhắn", icon: MessageCircle },
];
export function SupportRail({ data }: { data: AppData }) {
  const { update } = useCommunity();
  const suggestionPath = "/community/friends#suggestions";
  const suggestionsHref = data.authenticated === false ? `/auth/login?next=${encodeURIComponent(suggestionPath)}` : suggestionPath;
  const viewStory = useAppStore((state) => state.viewStory);
  const story = data.stories
    .filter(
      (entry) =>
        entry.userId !== "me" &&
        !(data.hiddenStories || []).includes(entry.id) &&
        data.connections.includes(entry.userId) &&
        entry.day === localDay() &&
        canView(entry.userId, entry.privacy, data) &&
        entry.items.length,
    )
    .sort((a, b) => b.items.at(-1)!.at.localeCompare(a.items.at(-1)!.at))[0];
  const person = data.people.find((entry) => entry.id === story?.userId);
  const suggestions = data.people
    .filter((entry) => entry.id !== "me" && !data.blocked.includes(entry.id) && !data.connections.includes(entry.id) && !data.following.includes(entry.id))
    .slice(0, 3);
  return (
    <aside className="support-rail" aria-label="Bạn bè và chủ đề">
      <section className="rail-friend-story">
        <div className="rail-title">
          <h2>Bạn bè hôm nay</h2>
          <Camera size={19} />
        </div>
        {story && person ? (
          <button
            className="rail-story-cover"
            onClick={() => viewStory(story.id)}
          >
            <img
              src={story.items[0]?.image}
              alt={`${DAILY_TITLE} của ${person.name}`}
            />
            <span>
              <Avatar person={person} size="sm" />
              <span>
                <strong>{person.name}</strong>
                <small>{story.items.length} khoảnh khắc hôm nay</small>
              </span>
              <ArrowUpRight size={20} />
            </span>
          </button>
        ) : (
          <p className="rail-no-stories">
            Bạn bè đăng ảnh mới, bạn sẽ thấy ở đây.
          </p>
        )}
      </section>
      <section className="rail-people">
        <div className="rail-title">
          <h2>Làm quen thêm</h2>
          <Link href={suggestionsHref} className="rail-discovery-link" aria-label="Xem tất cả gợi ý bạn bè"><Users size={20} /></Link>
        </div>
        {!suggestions.length && <p className="rail-no-stories">Chưa có gợi ý mới. Ghé lại sau nhé.</p>}
        {suggestions.map((user) => (
          <div className="suggestion-row" key={user.id}>
            <Link href={`/community/profile/${user.username}`}>
              <Avatar person={user} />
            </Link>
            <Link
              className="suggestion-name"
              href={`/community/profile/${user.username}`}
            >
              <strong>{user.name}</strong>
              <span>@{user.username}</span>
            </Link>
            <button
              className={`follow-small ${data.following.includes(user.id) ? "following" : ""}`}
              aria-label={`${data.following.includes(user.id) ? "Bỏ follow" : "Follow"} ${user.name}`}
              onClick={() =>
                void update((draft) => {
                  draft.following = draft.following.includes(user.id)
                    ? draft.following.filter((id) => id !== user.id)
                    : [...draft.following, user.id];
                }).catch(() => undefined)
              }
            >
              {data.following.includes(user.id) ? "Đang follow" : "Follow"}
            </button>
          </div>
        ))}
      </section>
      <section className="rail-topic-section">
        <div className="rail-title">
          <h2>Mọi người đang kể gì?</h2>
        </div>
        <div className="rail-topic-cloud">
          {data.topicStats?.slice(0, 5).map((topic) => (
            <Link
              href={`/community/explore?topic=${encodeURIComponent(topic.name)}`}
              key={topic.name}
              aria-label={`${topic.name}, ${topic.count} bài viết`}
            >
              <span className="rail-topic-name">{topic.name}</span>
              <span className="rail-topic-count">{topic.count} bài viết</span>
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
      <footer className="rail-footer">
        <Link href="/community/settings">Quyền riêng tư</Link>
        <a href="/licenses/uiverse.txt" target="_blank" rel="noreferrer">
          Nguồn giao diện
        </a>
        <span>© {new Date().getFullYear()} Tellme</span>
      </footer>
    </aside>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, error, refetch } = useCommunity();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401)
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }, [error, pathname, router]);
  const { search, setSearch } = useAppStore();
  const searchRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const navigation = usePageNavigation(pathname, contentRef);
  const selectionPath = navigation.pendingHref?.split("?")[0] || pathname;
  const me = data?.people.find((person) => person.id === "me");
  useRealtime(data?.authenticated === true, data?.connections || []);
  const publicPage = /^\/community\/(today|feed|explore|profile\/(?!me$)[^/]+)$/.test(pathname) || pathname.startsWith("/post/");
  const accountHref = (href: string) => data?.authenticated === false && !/^\/community\/(today|feed|explore)$/.test(href) ? `/auth/login?next=${encodeURIComponent(href)}` : href;
  useEffect(() => {
    if (data?.authenticated === false && !publicPage) router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }, [data?.authenticated, publicPage, pathname, router]);
  const unreadMessages =
    data?.conversations
      .filter((entry) => !data.blocked.includes(entry.userId))
      .reduce((sum, conversation) => sum + conversation.unread, 0) || 0;
  const mobileNavigation = [
    ...nav.map((item) => ({ ...item, label: item.label === DAILY_TITLE ? DAILY_SHORT : item.label })),
    { href: `/community/profile/${me?.username || "me"}`, label: "Cá nhân", icon: UserRound },
  ];
  const mobileIndex = selectionPath.startsWith("/community/profile")
    ? 3
    : mobileNavigation.findIndex((item) => selectionPath.startsWith(item.href));
  const fullSection =
    pathname.includes("/messages") || pathname.includes("/settings") || pathname.includes("/archive");
  const messagingPage = pathname.startsWith("/community/messages");
  useChatViewport(frameRef, messagingPage && !!data);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        if (window.innerWidth <= 640) router.push("/community/explore");
        else searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  useEffect(() => {
    const dismiss = (event: MouseEvent) => {
      const target = event.target as Element;
      document
        .querySelectorAll<HTMLDetailsElement>("details[open]")
        .forEach((detail) => {
          if (
            !detail.contains(target) ||
            target.closest(".menu-panel button, .menu-panel a")
          )
            detail.open = false;
        });
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape")
        document
          .querySelectorAll<HTMLDetailsElement>("details[open]")
          .forEach((detail) => {
            detail.open = false;
          });
    };
    document.addEventListener("click", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle(
      "reduce-motion",
      !!data?.settings.reducedMotion,
    );
  }, [data?.settings.reducedMotion]);
  if (!data)
    return error && !(error instanceof ApiError && error.status === 401) ? (
      <div className="connection-error">
        <p role="alert">{error.message}</p>
        <Button onClick={() => void refetch()}>Thử lại</Button>
      </div>
    ) : (
      <Loader label="Đang mở Tellme…" />
    );
  if (data.authenticated === false && !publicPage) return <Loader label="Đang mở trang đăng nhập…" />;
  return (
    <div ref={frameRef} className={`app-frame ${messagingPage ? "messages-frame" : ""}`}>
      <a href="#main-content" className="skip-link">
        Đến nội dung chính
      </a>
      <header className="global-header">
        <div className="header-inner">
          <Link href="/community/today" className="brand-link">
            <Brand />
          </Link>
          <form
            className="global-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              router.push(`/community/explore?q=${encodeURIComponent(search)}`);
            }}
          >
            <SearchInput
              ref={searchRef}
              aria-label="Tìm kiếm câu chuyện, chủ đề, mọi người"
              placeholder="Tìm câu chuyện, chủ đề, mọi người…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <kbd>⌘ K</kbd>
            <button
              type="submit"
              className="search-submit"
              aria-label="Tìm kiếm"
            >
              <Search size={20} />
            </button>
          </form>
          <div className="header-actions">
            <Link
              href="/community/explore"
              className="mobile-search-button icon-button"
              aria-label="Tìm kiếm"
            >
              <Search size={23} />
            </Link>
            {data.authenticated === false ? (
              <div className="guest-auth-actions">
                <Link
                  href={`/auth/login?next=${encodeURIComponent(pathname)}`}
                  className="guest-join-button"
                  aria-label="Tham gia cộng đồng Tellme"
                >
                  <span className="guest-join-full">Tham gia cộng đồng Tellme</span>
                  <span className="guest-join-compact" aria-hidden="true">
                    Tham gia
                  </span>
                </Link>
              </div>
            ) : <>
            <NotificationBell />
            <details className="profile-menu">
              <summary aria-label="Menu tài khoản">
                <Avatar person={me} size="sm" />
                <ChevronDown size={15} />
              </summary>
              <div className="menu-panel">
                <Link href={`/community/profile/${me?.username || "me"}`}>
                  <UserRound size={18} />
                  Trang cá nhân
                </Link>
                <Link href="/community/archive"><Archive size={18} />Kho lưu trữ</Link>
                <Link href="/community/settings">
                  <Settings size={18} />
                  Cài đặt
                </Link>
                <button type="button" onClick={() => useAppStore.getState().open("support")}><HeartHandshake size={18} />Ủng hộ Tellme</button>
                <button
                  onClick={async () => {
                    try {
                      await request("/auth/logout", { method: "POST" });
                      apiRepository.clear();
                      queryClient.clear();
                      router.replace("/auth/login");
                    } catch (error) {
                      useAppStore
                        .getState()
                        .notify(
                          error instanceof Error
                            ? error.message
                            : "Chưa đăng xuất được.",
                        );
                    }
                  }}
                >
                  <LogOut size={18} />
                  Đăng xuất
                </button>
              </div>
            </details>
            </>}
          </div>
        </div>
      </header>
      <div
        className={`app-shell ${fullSection ? "wide-content full-section" : "with-support"} ${messagingPage ? "messages-layout" : ""}`}
      >
        <aside className="left-rail">
          <nav aria-label="Điều hướng chính">
            <LiquidNavigation pathname={selectionPath} className="desktop-nav-track">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                href={accountHref(href)}
                prefetch={true}
                onNavigate={(event) => { event.preventDefault(); navigation.navigate(accountHref(href), label); }}
                key={href}
                className={`nav-item ${selectionPath.startsWith(href) ? "active" : ""}`}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
              >
                <Icon size={23} strokeWidth={1.8} />
                <span>{label}</span>
                {label === "Tin nhắn" && unreadMessages > 0 && (
                  <span className="nav-badge">{unreadMessages}</span>
                )}
              </Link>
            ))}
            <div className="nav-separator" />
            <Link
              href={accountHref(`/community/profile/${me?.username || "me"}`)}
              prefetch={true}
              onNavigate={(event) => { event.preventDefault(); navigation.navigate(accountHref(`/community/profile/${me?.username || "me"}`), "Trang cá nhân"); }}
              className={`nav-item ${selectionPath.includes("/profile/") ? "active" : ""}`}
            >
              <UserRound size={23} />
              <span>Trang cá nhân</span>
            </Link>
            <Link
              href={accountHref("/community/friends")}
              prefetch={true}
              onNavigate={(event) => { event.preventDefault(); navigation.navigate(accountHref("/community/friends"), "Bạn bè"); }}
              className={`nav-item ${selectionPath.includes("/friends") ? "active" : ""}`}
            >
              <Users size={23} />
              <span>Bạn bè</span>
            </Link>
            <Link
              href={accountHref("/community/archive")}
              prefetch={true}
              onNavigate={(event) => { event.preventDefault(); navigation.navigate(accountHref("/community/archive"), "Kho lưu trữ"); }}
              className={`nav-item ${selectionPath.includes("/archive") ? "active" : ""}`}
            >
              <Archive size={23} />
              <span>Kho lưu trữ</span>
            </Link>
            <Link
              href={accountHref("/community/settings")}
              prefetch={true}
              onNavigate={(event) => { event.preventDefault(); navigation.navigate(accountHref("/community/settings"), "Cài đặt"); }}
              className={`nav-item ${selectionPath.includes("/settings") ? "active" : ""}`}
            >
              <Settings size={23} />
              <span>Cài đặt</span>
            </Link>
            </LiquidNavigation>
          </nav>
          <div className="sidebar-tagline">
            <span className="tagline-line" />
            <p>
              Your day.
              <br />
              <strong>Your stories.</strong>
            </p>
            <button type="button" className="support-entry" onClick={() => useAppStore.getState().open("support")}><HeartHandshake size={15} />Ủng hộ Tellme</button>
          </div>
        </aside>
        <main id="main-content" className="main-content" aria-busy={!!navigation.pendingHref}>
          <div ref={contentRef} className="route-content" data-navigation-pending={!!navigation.pendingHref} inert={!!navigation.pendingHref}>
            {children}
          </div>
          <PageNavigationLoader content={contentRef} label={navigation.pendingLabel || "trang"} active={!!navigation.pendingHref} />
        </main>
        {!fullSection && data && <SupportRail data={data} />}
      </div>
      <nav className="mobile-nav" aria-label="Điều hướng di động" data-has-active={mobileIndex >= 0}>
        <LiquidNavigation pathname={selectionPath} className="mobile-nav-track">
          {mobileNavigation.map((item, index) => (
              <Link
                href={accountHref(item.href)}
                prefetch={true}
                onNavigate={(event) => { event.preventDefault(); navigation.navigate(accountHref(item.href), item.label); }}
                key={item.href}
                className={mobileIndex === index ? "active" : ""}
                aria-current={(pathname.startsWith(item.href) || index === 3 && pathname.startsWith("/community/profile")) ? "page" : undefined}
                aria-label={index === 2 && unreadMessages > 0 ? `${item.label}, ${unreadMessages} tin chưa đọc` : undefined}
              >
                <span className="mobile-nav-icon">
                  <item.icon size={23} strokeWidth={1.8} />
                  {index === 2 && unreadMessages > 0 && <span className="mobile-nav-unread" aria-hidden="true">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}
                </span>
                <span className="mobile-nav-label">{item.label}</span>
              </Link>
          ))}
        </LiquidNavigation>
      </nav>
      <GlobalOverlays />
      <SupportInvitation eligible={pathname === "/community/today" || pathname === "/community/feed"} />
      {(pathname === "/community/today" || pathname === "/community/feed") && <WeatherWidget />}
    </div>
  );
}
