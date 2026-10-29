"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Camera,
  ChevronDown,
  Home,
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
import { DAILY_TITLE, DAILY_SHORT } from "@/lib/brand";
import { localDay } from "@/lib/validation";
import {
  Avatar,
  Brand,
  SearchInput,
  Loader,
  Button,
} from "@/components/ui/Primitives";
import { GlobalOverlays } from "./GlobalOverlays";
import { NotificationBell } from "./NotificationBell";
import type { AppData } from "@/lib/types";

const nav = [
  { href: "/community/today", label: DAILY_TITLE, icon: Camera },
  { href: "/community/feed", label: "Bảng tin", icon: Home },
  { href: "/community/messages", label: "Tin nhắn", icon: MessageCircle },
  { href: "/community/saved", label: "Đã lưu", icon: Bookmark },
];
export function SupportRail({ data }: { data: AppData }) {
  const { update } = useCommunity();
  const viewStory = useAppStore((state) => state.viewStory);
  const story = data.stories.find(
    (entry) =>
      entry.userId !== "me" &&
      entry.day === localDay() &&
      canView(entry.userId, entry.privacy, data) &&
      entry.items.length,
  );
  const person = data.people.find((entry) => entry.id === story?.userId);
  const suggestions = data.people
    .filter((entry) => entry.id !== "me" && !data.blocked.includes(entry.id))
    .sort(
      (a, b) =>
        Number(data.following.includes(a.id)) -
        Number(data.following.includes(b.id)),
    )
    .slice(0, 3);
  return (
    <aside className="support-rail" aria-label="Bạn bè và chủ đề">
      <section className="rail-friend-story">
        <div className="rail-title">
          <h2>Ngày của bạn bè</h2>
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
            Khi bạn bè chia sẻ khoảnh khắc mới, bạn sẽ nhìn thấy ở đây.
          </p>
        )}
      </section>
      <section className="rail-people">
        <div className="rail-title">
          <h2>Gặp thêm những người bạn</h2>
          <Users size={20} />
        </div>
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
              {data.following.includes(user.id) ? "Following" : "Follow"}
            </button>
          </div>
        ))}
      </section>
      <section className="rail-topic-section">
        <div className="rail-title">
          <h2>Điều mọi người đang kể</h2>
        </div>
        <div className="rail-topic-cloud">
          {data.topicStats?.slice(0, 5).map((topic) => (
            <Link
              href={`/community/explore?topic=${encodeURIComponent(topic.name)}`}
              key={topic.name}
            >
              #{topic.name}
              <span>{topic.count}</span>
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
  const me = data?.people.find((person) => person.id === "me");
  const unreadMessages =
    data?.conversations
      .filter((entry) => !data.blocked.includes(entry.userId))
      .reduce((sum, conversation) => sum + conversation.unread, 0) || 0;
  const fullSection =
    pathname.includes("/messages") || pathname.includes("/settings");
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
  return (
    <>
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
                <Link href="/community/settings">
                  <Settings size={18} />
                  Cài đặt
                </Link>
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
          </div>
        </div>
      </header>
      <div
        className={`app-shell ${fullSection ? "wide-content full-section" : "with-support"}`}
      >
        <aside className="left-rail">
          <nav aria-label="Điều hướng chính">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                href={href}
                key={href}
                className={`nav-item ${pathname.startsWith(href) ? "active" : ""}`}
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
              href={`/community/profile/${me?.username || "me"}`}
              className={`nav-item ${pathname.includes("/profile/") ? "active" : ""}`}
            >
              <UserRound size={23} />
              <span>Trang cá nhân</span>
            </Link>
            <Link
              href="/community/follow"
              className={`nav-item ${pathname.includes("/follow") ? "active" : ""}`}
            >
              <Users size={23} />
              <span>Follow</span>
            </Link>
            <Link
              href="/community/settings"
              className={`nav-item ${pathname.includes("/settings") ? "active" : ""}`}
            >
              <Settings size={23} />
              <span>Cài đặt</span>
            </Link>
          </nav>
          <div className="sidebar-tagline">
            <span className="tagline-line" />
            <p>
              Your day.
              <br />
              <strong>Your stories.</strong>
            </p>
          </div>
        </aside>
        <main id="main-content" className="main-content">
          {children}
        </main>
        {!fullSection && data && <SupportRail data={data} />}
      </div>
      <nav className="mobile-nav" aria-label="Điều hướng di động">
        {[
          nav[0],
          nav[1],
          nav[2],
          {
            href: `/community/profile/${me?.username || "me"}`,
            label: "Cá nhân",
            icon: UserRound,
          },
        ].map(
          (item) =>
            item && (
              <Link
                href={item.href}
                key={item.href}
                className={pathname.startsWith(item.href) ? "active" : ""}
                aria-current={
                  pathname.startsWith(item.href) ? "page" : undefined
                }
              >
                <item.icon size={24} />
                <span>
                  {item.label === DAILY_TITLE ? DAILY_SHORT : item.label}
                </span>
              </Link>
            ),
        )}
      </nav>
      <GlobalOverlays />
    </>
  );
}
