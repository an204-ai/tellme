"use client";
import { StoryMusic } from "@/components/music/StoryMusic";
import { Select } from "@/components/ui/Select";
import { useQuery } from "@tanstack/react-query";
import { apiRepository, ApiError } from "@/lib/api-repository";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { canView, timeOf } from "@/lib/api-repository";
import { localDay } from "@/lib/validation";
import { useAppStore } from "@/stores/app.store";
import { Avatar, Button, Loader, IconButton, PrivacyIcon, privacyNames } from "@/components/ui/Primitives";
import type { Privacy } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { StoryReactions } from "./StoryReactions";
import { StoryReply } from "./StoryReply";
import { MomentReactionBurst } from "./MomentReactionFloaters";
import { MomentReactionPeople } from "./MomentReactionPeople";

export function StoryTimeline({
  storyId,
  initialIndex,
  initialMomentId,
}: {
  storyId: string;
  initialIndex: number;
  initialMomentId?: string;
}) {
  const { data, update, saving } = useCommunity();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editPrivacy, setEditPrivacy] = useState<Privacy | "inherit">("inherit");
  const viewStory = useAppStore((state) => state.viewStory);
  const open = useAppStore((state) => state.open);
  const storyQuery = useQuery({
    queryKey: ["tellme", "story", storyId],
    queryFn: () => apiRepository.getStory(storyId),
    placeholderData: () => apiRepository.peekStory(storyId),
    retry: false,
  });
  const unavailable = storyQuery.error instanceof ApiError && [403, 404].includes(storyQuery.error.status);
  const story =
    !unavailable && storyQuery.data &&
    data &&
    canView(storyQuery.data.userId, storyQuery.data.privacy, data)
      ? storyQuery.data
      : undefined;
  const person = data?.people.find((entry) => entry.id === story?.userId);
  const items = [...(story?.items || [])].sort((a, b) =>
    a.at.localeCompare(b.at),
  );
  const initialId = story?.items.find((item) => item.id === initialMomentId)?.id || story?.items[initialIndex]?.id;
  const [active, setActive] = useState(initialId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const momentsRef = useRef(new Map<string, HTMLElement>());
  const reducedMotion = data?.settings.reducedMotion;
  useEffect(() => {
    if (!openMenu) return;
    const closeOnPointer = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest(".day-moment-menu-anchor"))
        setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("pointerdown", closeOnPointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenu]);
  const goTo = (id: string) => {
    const target = momentsRef.current.get(id);
    if (target && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: id === items[0]?.id ? 0 : target.offsetTop - 24,
        behavior:
          reducedMotion ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
      });
      setActive(id);
    }
  };
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    let frame = 0;
    const updateCurrent = () => {
      frame = 0;
      const nodes = [...momentsRef.current.values()];
      const line = root.getBoundingClientRect().top + 36;
      const last = root.scrollTop > 0 && root.scrollTop + root.clientHeight >= root.scrollHeight - 4;
      const current = last ? nodes.at(-1) : [...nodes].reverse().find((node) => node.getBoundingClientRect().top <= line) || nodes[0];
      if (current) setActive(current.dataset.momentId);
    };
    const scroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateCurrent);
    };
    frame = requestAnimationFrame(() => {
      const target = initialId ? momentsRef.current.get(initialId) : null;
      if (target) root.scrollTo({ top: initialId === story?.items[0]?.id ? 0 : target.offsetTop - 24, behavior: "instant" });
      updateCurrent();
    });
    root.addEventListener("scroll", scroll, { passive: true });
    return () => { cancelAnimationFrame(frame); root.removeEventListener("scroll", scroll); };
  }, [initialId, storyId, story?.items[0]?.id, items.length]);
  useEffect(() => {
    const nav = navRef.current;
    const button = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (nav && button && nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({ left: button.offsetLeft - nav.offsetLeft - (nav.clientWidth - button.offsetWidth) / 2, behavior: reducedMotion ? "instant" : "smooth" });
    }
  }, [active, reducedMotion]);
  if (storyQuery.isPending)
    return (
      <Modal title="Đang mở dòng thời gian…" onClose={() => viewStory(null)}>
        <Loader />
      </Modal>
    );
  if (!story || items.length === 0)
    return (
      <Modal title="Không tìm thấy chuỗi ảnh" onClose={() => viewStory(null)}>
        <p className="dialog-body">
          Chuỗi ảnh này không còn khả dụng hoặc đã thay đổi đối tượng xem.
        </p>
      </Modal>
    );
  const date = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${story.day}T12:00:00+07:00`));
  const editItem = items.find((item) => item.id === editing);
  return (
    <>
    <Modal
      title={`Một ngày của ${person?.name || "bạn"}`}
      subtitle={<time dateTime={story.day}>{date}</time>}
      headerExtra={<StoryMusic key={story.id} story={story} />}
      onClose={() => viewStory(null)}
      className="day-timeline-dialog"
    >
      <div className="day-timeline-layout">
        <aside className="day-timeline-aside">
          <div className="day-person">
            <Avatar person={person} size="lg" />
            <strong>{person?.name}</strong>
            <span className="day-photo-count">
              <Camera size={16} />
              {items.length} khoảnh khắc
            </span>
          </div>
          <nav
            className="day-timeline-nav"
            ref={navRef}
            aria-label="Các mốc thời gian trong ngày"
          >
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-current={active === item.id ? "true" : undefined}
                aria-label={`Đến khoảnh khắc ${i + 1} lúc ${timeOf(item.at)}`}
                onClick={() => goTo(item.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" && event.key !== "ArrowUp")
                    return;
                  event.preventDefault();
                  const next = Math.max(
                    0,
                    Math.min(
                      items.length - 1,
                      i + (event.key === "ArrowDown" ? 1 : -1),
                    ),
                  );
                  goTo(items[next]!.id);
                  (
                    event.currentTarget.parentElement?.children[
                      next
                    ] as HTMLButtonElement
                  )?.focus();
                }}
              >
                <span className="day-nav-dot" />
                <time dateTime={item.at}>{timeOf(item.at)}</time>
                <img src={item.image} alt="" loading="lazy" />
                <span className="day-nav-caption">
                  {item.caption || `Khoảnh khắc ${i + 1}`}
                </span>
              </button>
            ))}
          </nav>
          {story.userId === "me" && story.day === localDay() && (
            <button
              type="button"
              className="day-add-moment"
              aria-label="Thêm khoảnh khắc"
              onClick={() => {
                viewStory(null);
                open("moment");
              }}
            >
              <Plus size={17} />
              <span className="day-add-long">Thêm khoảnh khắc</span><span className="day-add-short">Chụp ảnh</span>
            </button>
          )}

        </aside>
        <div
          className="day-timeline-scroll"
          ref={scrollRef}
          tabIndex={0}
          role="region"
          aria-label={`Dòng thời gian ngày ${date} của ${person?.name}`}
        >
          {items.map((item, i) => (
            <section
              className={`day-moment ${active === item.id ? "is-current" : ""}`}
              key={item.id}
              data-moment-id={item.id}
              ref={(node) => {
                if (node) momentsRef.current.set(item.id, node);
                else momentsRef.current.delete(item.id);
              }}
              aria-label={`Khoảnh khắc lúc ${timeOf(item.at)}`}
            >
              <div className="day-moment-time">
                <time dateTime={item.at}>{timeOf(item.at)}</time>
                <span />
              </div>
              <div className="day-moment-content">
                <div className="day-moment-media">
                  <img
                    className="day-moment-photo"
                    src={item.image}
                    alt={item.caption || `Khoảnh khắc ${i + 1}`}
                    loading={i === initialIndex ? "eager" : "lazy"}
                  />
                    <div className="day-moment-overlay">
                      {item.caption && <p className="day-moment-caption">{item.caption}</p>}
                      <div className="day-moment-reaction-anchor">
                        {story.userId === "me"
                          ? <MomentReactionPeople storyId={story.id} itemId={item.id} reactions={item.incomingReactions} onProfile={() => viewStory(null)} />
                          : <StoryReactions storyId={story.id} itemId={item.id} selected={item.reaction} />}
                      </div>
                      <StoryReply story={story} item={item} person={person} />
                    </div>
                  {story.userId === "me" && active === item.id && !reducedMotion && (
                    <MomentReactionBurst storyId={story.id} moments={item} surface="detail" />
                  )}
                  {item.privacy && item.privacy !== story.privacy && (
                    <span
                      className="day-moment-audience"
                      aria-label={`Quyền riêng của ảnh: ${privacyNames[item.privacy]}. Quyền cả chuỗi: ${privacyNames[story.privacy]}.`}
                      title={`Riêng ảnh: ${privacyNames[item.privacy]}. Người xem vẫn cần được phép xem chuỗi (${privacyNames[story.privacy]}).`}
                    >
                      <PrivacyIcon value={item.privacy} size={14} />
                      <span>{privacyNames[item.privacy]}</span>
                    </span>
                  )}
                  {story.userId === "me" && (
                    <div className="day-moment-menu-anchor">
                      <IconButton
                        className="day-moment-menu-trigger"
                        label="Tùy chọn khoảnh khắc"
                        tooltip={false}
                        aria-expanded={openMenu === item.id}
                        aria-haspopup="menu"
                        onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                      >
                        <MoreHorizontal size={19} />
                      </IconButton>
                      {openMenu === item.id && (
                        <div className="day-moment-menu" role="menu">
                          <button type="button" role="menuitem" onClick={() => {
                            setEditCaption(item.caption);
                            setEditPrivacy(item.privacy || "inherit");
                            setEditing(item.id);
                            setDeleting(null);
                            setOpenMenu(null);
                          }}>
                            <Pencil size={16} /> Chỉnh sửa khoảnh khắc
                          </button>
                          <button type="button" role="menuitem" className="danger" onClick={() => {
                            setDeleting(item.id);
                            setEditing(null);
                            setOpenMenu(null);
                          }}>
                            <Trash2 size={16} /> Xóa khoảnh khắc
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {deleting === item.id && (
                    <div className="story-delete-confirm" role="group" aria-label="Xác nhận xóa khoảnh khắc">
                      <strong>Xóa khoảnh khắc này?</strong>
                      <span>Ảnh sẽ bị gỡ khỏi chuỗi ngày của bạn.</span>
                      <div>
                        <button type="button" disabled={saving} onClick={() => setDeleting(null)}>Giữ lại</button>
                        <button type="button" className="danger" disabled={saving} onClick={async () => {
                          try {
                            await update((draft) => {
                              const target = draft.stories.find((entry) => entry.id === story.id);
                              if (target) target.items = target.items.filter((entry) => entry.id !== item.id);
                            });
                            setDeleting(null);
                            if (story.items.length === 1) viewStory(null);
                          } catch { /* Mutation announces the error. */ }
                        }}>{saving ? "Đang xóa…" : "Xóa ảnh"}</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))}

        </div>
      </div>
    </Modal>
    {editItem && <Modal title="Chỉnh sửa khoảnh khắc" onClose={() => setEditing(null)} className="moment-edit-dialog">
      <img className="moment-edit-preview" src={editItem.image} alt="Khoảnh khắc đang chỉnh sửa" />
                    <form className="moment-edit-panel" onSubmit={async (event) => {
                      event.preventDefault();
                      try {
                        await update((draft) => {
                          const target = draft.stories.find((entry) => entry.id === story.id)?.items.find((entry) => entry.id === editItem.id);
                          if (!target) return;
                          target.caption = editCaption.trim();
                          if (editPrivacy === "inherit") delete target.privacy;
                          else target.privacy = editPrivacy;
                        });
                        setEditing(null);
                      } catch { /* Mutation announces the error. */ }
                    }}>
                      <label htmlFor={`moment-caption-${editItem.id}`}>Chú thích của khoảnh khắc</label>
                      <textarea id={`moment-caption-${editItem.id}`} maxLength={300} value={editCaption} onChange={(event) => setEditCaption(event.target.value)} />
                      <label htmlFor={`moment-privacy-${editItem.id}`}>Quyền riêng tư riêng của ảnh</label>
                      <Select id={`moment-privacy-${editItem.id}`} className="select-control" value={editPrivacy} onValueChange={(value) => setEditPrivacy(value as Privacy | "inherit")}>
                        <option value="inherit">Theo quyền riêng tư của chuỗi</option>
                        <option value="public">Riêng ảnh này · Công khai</option>
                        <option value="connections">Riêng ảnh này · Bạn bè</option>
                        <option value="private">Riêng ảnh này · Chỉ mình tôi</option>
                      </Select>
                      <p>Ảnh chỉ hiện khi người xem được phép xem cả chuỗi và ảnh này.</p>
                      <div className="moment-edit-actions">
                        <button type="button" disabled={saving} onClick={() => setEditing(null)}><X size={15} /> Hủy</button>
                        <button type="submit" disabled={saving}><Check size={15} /> {saving ? "Đang lưu…" : "Lưu thay đổi"}</button>
                      </div>
                    </form>
    </Modal>}
    </>
  );
}
