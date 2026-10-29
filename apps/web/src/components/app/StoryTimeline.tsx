"use client";
import { useQuery } from "@tanstack/react-query";
import { apiRepository } from "@/lib/api-repository";
import { useEffect, useRef, useState } from "react";
import { Camera, Clock3, Plus } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { canView, timeOf } from "@/lib/api-repository";
import { localDay } from "@/lib/validation";
import { useAppStore } from "@/stores/app.store";
import { Avatar, Button, Loader } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { StoryReactions } from "./StoryReactions";
import { StoryReply } from "./StoryReply";

export function StoryTimeline({
  storyId,
  initialIndex,
  initialMomentId,
}: {
  storyId: string;
  initialIndex: number;
  initialMomentId?: string;
}) {
  const { data } = useCommunity();
  const viewStory = useAppStore((state) => state.viewStory);
  const open = useAppStore((state) => state.open);
  const storyQuery = useQuery({
    queryKey: ["tellme", "story", storyId],
    queryFn: () => apiRepository.getStory(storyId),
    retry: false,
  });
  const story =
    storyQuery.data &&
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
  const momentsRef = useRef(new Map<string, HTMLElement>());
  const reducedMotion = data?.settings.reducedMotion;
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
    const frame = requestAnimationFrame(() => {
      const target = initialId ? momentsRef.current.get(initialId) : null;
      if (target)
        root.scrollTo({
          top: initialId === story?.items[0]?.id ? 0 : target.offsetTop - 24,
          behavior: "instant",
        });
    });
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries.find((entry) => entry.isIntersecting);
        if (current)
          setActive((current.target as HTMLElement).dataset.momentId);
      },
      { root, rootMargin: "-5% 0px -70% 0px", threshold: 0 },
    );
    momentsRef.current.forEach((node) => observer.observe(node));
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [initialId, storyId, story?.items[0]?.id]);
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
  return (
    <Modal
      title={`Một ngày của ${person?.name || "bạn"}`}
      onClose={() => viewStory(null)}
      className="day-timeline-dialog"
    >
      <div className="day-timeline-layout">
        <aside className="day-timeline-aside">
          <p className="day-mobile-date">{date}</p>
          <div className="day-person">
            <Avatar person={person} size="lg" />
            <strong>{person?.name}</strong>
            <span>{date}</span>
            <span className="day-photo-count">
              <Camera size={16} />
              {items.length} khoảnh khắc
            </span>
          </div>
          <nav
            className="day-timeline-nav"
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
            <Button
              variant="secondary"
              onClick={() => {
                viewStory(null);
                open("moment");
              }}
            >
              <Plus size={17} />
              Thêm khoảnh khắc
            </Button>
          )}
        </aside>
        <div
          className="day-timeline-scroll"
          ref={scrollRef}
          tabIndex={0}
          role="region"
          aria-label={`Dòng thời gian ngày ${date} của ${person?.name}`}
        >
          <div className="day-timeline-intro">
            <Clock3 size={17} />
            <span>{date}</span>
          </div>
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
                <img
                  className="day-moment-photo"
                  src={item.image}
                  alt={item.caption || `Khoảnh khắc ${i + 1}`}
                  loading={i === initialIndex ? "eager" : "lazy"}
                />
                <div className="day-moment-caption">
                  {item.caption && <p>{item.caption}</p>}
                  <StoryReactions
                    storyId={story.id}
                    itemId={item.id}
                    selected={item.reaction}
                  />
                  <StoryReply story={story} item={item} person={person} />
                </div>
              </div>
            </section>
          ))}
          <div className="day-timeline-end">
            <span />
            Những khoảnh khắc làm nên một ngày.
          </div>
        </div>
      </div>
    </Modal>
  );
}
