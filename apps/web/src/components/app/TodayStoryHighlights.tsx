"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useBrandIntroFinished } from "./BrandIntro";
import { MomentReactionBurst } from "./MomentReactionFloaters";
import { DragScroll } from "@/components/ui/DragScroll";
import { Avatar } from "@/components/ui/Primitives";
import { apiRepository, timeAgo } from "@/lib/api-repository";
import type { DayStory, MomentItem, Person } from "@/lib/types";
import { useAppStore } from "@/stores/app.store";

function OwnStoryPreview({ storyId }: { storyId: string }) {
  const { data } = useQuery({
    queryKey: ["tellme", "story", storyId],
    queryFn: () => apiRepository.getStory(storyId),
    staleTime: 30_000,
    retry: false,
  });
  return <MomentReactionBurst storyId={storyId} moments={data?.userId === "me" ? data.items : undefined} surface="preview" />;
}

function StoryCarousel({ items }: { items: MomentItem[] }) {
  const [frame, setFrame] = useState<{ current: MomentItem; previous: MomentItem }>();
  const cover = items.at(-1)!;
  const current = frame?.current ?? cover;

  useEffect(() => {
    let timer = 0;
    let index = items.length - 1;
    let previous = cover;
    let pending: HTMLImageElement | undefined;

    const schedule = () => {
      index = (index + 1) % items.length;
      const item = items[index]!;
      const image = new Image();
      pending = image;
      const advance = () => {
        if (pending !== image) return;
        window.clearTimeout(timer);
        image.onload = image.onerror = null;
        if (image.complete && image.naturalWidth > 0) {
          setFrame({ current: item, previous });
          previous = item;
        }
        schedule();
      };

      // Start loading during the current frame. A stalled image must not stop the carousel.
      image.src = item.image;
      timer = window.setTimeout(() => {
        if (image.complete) advance();
        else {
          image.onload = image.onerror = advance;
          timer = window.setTimeout(advance, 3000);
        }
      }, 2200);
    };
    schedule();
    return () => {
      window.clearTimeout(timer);
      if (pending) pending.onload = pending.onerror = null;
      pending = undefined;
    };
  }, [cover, items]);

  return <>
    {frame && <img className="today-friend-preview" src={frame.previous.image} alt="" />}
    {frame && <img className="today-friend-preview today-friend-preview-enter" key={current.id} src={current.image} alt="" />}
    <StoryPreviewMeta items={items} current={current} />
  </>;
}

function StoryPreviewMeta({ items, current }: { items: MomentItem[]; current: MomentItem }) {
  const currentIndex = Math.min(items.findIndex((item) => item.id === current.id), 11);
  return <>
    <span className="today-friend-shade" />
    <span className="today-friend-progress" aria-hidden="true">
      {items.slice(0, 12).map((item, index) => <i key={item.id} className={index === currentIndex ? "is-current" : undefined} />)}
    </span>
    <span className="today-friend-time">{timeAgo(current.at)}</span>
  </>;
}

export function TodayStoryHighlights({ stories, people, me, reducedMotion }: {
  stories: DayStory[];
  people: Person[];
  me?: Person;
  reducedMotion?: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [featured, setFeatured] = useState<string | null>(null);
  const open = useAppStore((state) => state.open);
  const viewStory = useAppStore((state) => state.viewStory);
  const introFinished = useBrandIntroFinished();
  const overlayOpen = useAppStore((state) => !!(state.overlay || state.viewedStory || state.musicStoryId || state.musicInvitationStoryId));
  const candidates = stories
    .filter((story) => story.userId === "me" || story.items.length > 1)
    .map((story) => story.id).join(":");

  useEffect(() => {
    const strip = sectionRef.current?.querySelector<HTMLElement>(".today-friends-strip");
    if (!strip || !candidates || reducedMotion || overlayOpen || !introFinished) {
      setFeatured(null);
      return;
    }
    const scroller = strip.closest(".pull-refresh-viewport");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let current: string | null = null;

    const choose = () => {
      frame = 0;
      const bounds = strip.getBoundingClientRect();
      const left = Math.max(bounds.left, 0);
      const right = Math.min(bounds.right, document.documentElement.clientWidth);
      const clip = scroller?.getBoundingClientRect();
      const top = Math.max(bounds.top, clip?.top ?? 0, 0);
      const bottom = Math.min(bounds.bottom, clip?.bottom ?? window.innerHeight, window.innerHeight);
      let winner: string | null = null;
      let best = -Infinity;

      if (!motion.matches && !document.hidden && right > left && bottom > top) {
        const middle = (left + right) / 2;
        for (const card of strip.querySelectorAll<HTMLElement>("[data-story-preview]")) {
          const rect = card.getBoundingClientRect();
          const width = Math.max(0, Math.min(right, rect.right) - Math.max(left, rect.left));
          const height = Math.max(0, Math.min(bottom, rect.bottom) - Math.max(top, rect.top));
          const visible = (width * height) / (rect.width * rect.height);
          const id = card.dataset.storyPreview!;
          if (!Number.isFinite(visible) || visible < .5) continue;
          const distance = Math.abs((rect.left + rect.right) / 2 - middle) / (right - left);
          const score = visible - distance + (id === current ? .08 : 0);
          if (score > best) { winner = id; best = score; }
        }
      }
      if (winner !== current) {
        current = winner;
        setFeatured(winner);
      }
    };
    setFeatured(null);
    const schedule = () => { if (!frame) frame = requestAnimationFrame(choose); };
    const resize = new ResizeObserver(schedule);
    resize.observe(strip);
    const intersection = new IntersectionObserver(schedule, { threshold: [0, .5, .65, .85, 1] });
    intersection.observe(strip);
    // Capture both the horizontal strip and its vertical scroll ancestors.
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        choose();
      } else schedule();
    };
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", schedule);
    };
  }, [candidates, reducedMotion, overlayOpen, introFinished]);

  return (
    <section ref={sectionRef} className="today-friends" aria-label="Chuỗi khoảnh khắc hôm nay của bạn và bạn bè">
      <header><h2>Hôm nay, mình và bạn bè</h2></header>
      <DragScroll className="today-friends-strip" label="Khoảnh khắc hôm nay — kéo ngang để xem thêm">
        <button type="button" className="today-friend-story today-create-story" aria-label="Chụp khoảnh khắc hôm nay của bạn" onClick={() => open("moment")}>
          <span className="today-create-cover">
            <img src={me?.avatar || "/images/avatar-default.svg"} alt="" />
            <span className="today-create-plus"><Plus size={22} aria-hidden="true" /></span>
          </span>
          <span className="today-create-label">Chụp khoảnh khắc</span>
        </button>
        {stories.map((story) => {
          const mine = story.userId === "me";
          const person = people.find((entry) => entry.id === story.userId);
          const latest = story.items.at(-1)!;
          const active = !overlayOpen && !reducedMotion && featured === story.id;
          return (
            <button type="button" className="today-friend-story" data-story-preview={mine || story.items.length > 1 ? story.id : undefined}
              aria-label={mine ? "Xem chuỗi khoảnh khắc hôm nay của bạn" : `Xem chuỗi khoảnh khắc của ${person?.name || "bạn bè"}`}
              key={story.id} onClick={() => viewStory(story.id)}>
              <img src={latest.image} alt="" loading="lazy" />
              {active && story.items.length > 1
                ? <StoryCarousel key={story.items.map((item) => item.id + item.image).join("|")} items={story.items} />
                : <StoryPreviewMeta items={story.items} current={latest} />}
              <span className="today-friend-person">
                <Avatar person={person} size="sm" />
                <span><strong>{mine ? "Ngày của bạn" : person?.name}</strong></span>
              </span>
              {active && mine && <OwnStoryPreview storyId={story.id} />}
            </button>
          );
        })}
      </DragScroll>
    </section>
  );
}
