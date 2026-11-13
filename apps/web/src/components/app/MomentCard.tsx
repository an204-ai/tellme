"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Images, Layers3, RefreshCw, CirclePlus } from "lucide-react";
import { useReaction } from "@/hooks/use-reaction";
import { useCommunity } from "@/hooks/use-community";
import { timeAgo } from "@/lib/api-repository";
import { reactionOptions } from "@/lib/social-assets";
import type { DayStory, MomentItem, Person, Reaction } from "@/lib/types";
import { useAppStore } from "@/stores/app.store";
import { Avatar } from "@/components/ui/Primitives";
import { EmojiButton } from "@/components/ui/EmojiButton";
import { ReactionIcon } from "@/components/ui/ReactionControl";
import { StoryMenu } from "./StoryMenu";
import { StoryReply, type MomentReplyComposer } from "./StoryReply";
import { MomentReactionPeople } from "./MomentReactionPeople";
import { MomentReactionBurst } from "./MomentReactionFloaters";
import { useReactionBubbles } from "./ReactionBubbles";
import { playInterfaceSound } from "@/lib/interface-sounds";

export type PhotoMoment = { story: DayStory; item: MomentItem; person?: Person };

function MomentResponse({ story, item, person, composer }: PhotoMoment & { composer: MomentReplyComposer }) {
  const { data } = useCommunity();
  const bar = useRef<HTMLDivElement>(null);
  const { celebrate, celebration } = useReactionBubbles(bar);
  const reaction = useReaction({ kind: "moment", storyId: story.id, itemId: item.id }, true);
  const own = story.userId === "me";
  if (own) return <div className="now-response-slot now-own-response"><MomentReactionPeople storyId={story.id} itemId={item.id} onProfile={() => useAppStore.getState().viewStory(null)} /></div>;
  if (!data?.connections.includes(story.userId)) return <div className="now-response-slot" />;
  const custom = item.reaction?.startsWith("emoji:") ? item.reaction : null;
  const choose = (value: Reaction, source?: HTMLElement) => {
    const next = item.reaction === value ? null : value;
    if (next) {
      const rect = (source || bar.current?.querySelector(".emoji-trigger-open, .now-reactions-row > .icon-button"))?.getBoundingClientRect();
      if (rect) celebrate(next, rect);
      playInterfaceSound("reaction");
    }
    reaction.change(next);
  };
  return <div className="now-response-slot"><div ref={bar} className="now-respond-bar">
    <StoryReply story={story} item={item} person={person} compact composer={composer} />
    <div className="now-reactions-row">
      <div className="now-reaction-strip" role="group" aria-label="Cảm xúc cho khoảnh khắc — vuốt ngang để chọn">
        {reactionOptions.map((option) => <button key={option.value} type="button" aria-label={`Thả cảm xúc ${option.label}`} aria-pressed={item.reaction === option.value} onClick={(event) => choose(option.value, event.currentTarget)}><ReactionIcon value={option.value} size={36} /></button>)}
        {custom && <button type="button" aria-label={`Bỏ cảm xúc ${custom.slice(6)}`} aria-pressed="true" onClick={() => reaction.change(null)}><ReactionIcon value={custom} size={34} /></button>}
      </div>
      <EmojiButton label="Thả một emoji khác" icon={<CirclePlus size={28} />} onSelect={(emoji) => choose(`emoji:${emoji}`)} />
    </div>
  </div>{celebration}</div>;
}

export function MomentCard({ moment, behind, previous, next, discovered, onDiscover, composer, inViewer = false, allowMusic = false, canPrevious = false, busy = false }: {
  moment: PhotoMoment; behind?: PhotoMoment; previous: () => void; next: () => void; discovered: boolean; onDiscover: () => void; composer: MomentReplyComposer; inViewer?: boolean; allowMusic?: boolean; canPrevious?: boolean; busy?: boolean;
}) {
  const { story, item, person } = moment;
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const pointer = useRef<{ id: number; x: number; y: number; dx: number; dy: number } | null>(null);
  const surface = useRef<HTMLButtonElement>(null);
  const motion = useRef<Animation | null>(null);
  const dragFrame = useRef(0);
  const suppressClickUntil = useRef(0);
  const turning = useRef(false);
  const hintId = useId();
  const viewStory = useAppStore((state) => state.viewStory);
  useLayoutEffect(() => {
    if (discovered && surface.current && !document.documentElement.classList.contains("reduce-motion") && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      motion.current = surface.current.animate([
        { transform: "rotate(3deg) scale(.975)", opacity: .88 },
        { transform: "rotate(0deg) scale(1)", opacity: 1 },
      ], { duration: 320, easing: "cubic-bezier(.16,1,.3,1)" });
    }
    return () => { motion.current?.cancel(); cancelAnimationFrame(dragFrame.current); };
  }, []);
  const reset = () => {
    cancelAnimationFrame(dragFrame.current);
    if (!surface.current) return;
    surface.current.style.removeProperty("--card-x"); surface.current.style.removeProperty("--card-y"); surface.current.style.removeProperty("--card-angle");
    delete surface.current.dataset.dragging;
  };
  const turn = (direction: number) => {
    if (turning.current || busy) return;
    if (direction < 0 && !canPrevious) { reset(); return; }
    onDiscover();
    const reduced = document.documentElement.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !surface.current) { (direction < 0 ? previous : next)(); return; }
    turning.current = true;
    const node = surface.current;
    cancelAnimationFrame(dragFrame.current);
    const start = getComputedStyle(node).transform;
    motion.current?.cancel();
    delete node.dataset.dragging; node.dataset.turning = "true";
    const distance = node.offsetWidth * 1.08;
    motion.current = node.animate([
      { transform: start, opacity: 1 },
      { transform: `translate3d(${(direction < 0 ? 1 : -1) * distance}px,-18px,0) rotate(${direction < 0 ? 12 : -12}deg)`, opacity: 0 },
    ], { duration: 400, easing: "cubic-bezier(.28,.05,.22,1)", fill: "forwards" });
    void motion.current.finished.then(() => {
      (direction < 0 ? previous : next)();
      turning.current = false; delete node.dataset.turning;
      motion.current?.cancel(); reset();
    }).catch(() => {});
  };
  return <article className="now-moment now-fixed-moment">
    <div className="now-photo-stack">
      {behind && <img className="now-next-preview" src={behind.item.image} alt="" draggable={false} />}
      <div className="now-photo">
        <button ref={surface} type="button" className="now-photo-surface" aria-label={inViewer ? behind ? "Xem ảnh tiếp theo trong ngày" : "Xem xong ngày này" : "Xem ảnh cũ hơn"} aria-describedby={hintId} aria-keyshortcuts="ArrowLeft ArrowRight" disabled={busy} aria-busy={busy}
          onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); turn(event.key === "ArrowLeft" ? -1 : 1); } }}
          onPointerDown={(event) => {
            if (turning.current || event.button !== 0 || event.isPrimary === false) return;
            pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0 };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = pointer.current;
            if (!start || start.id !== event.pointerId || busy) return;
            start.dx = event.clientX - start.x; start.dy = event.clientY - start.y;
            if (Math.abs(start.dx) < 7 || Math.abs(start.dx) < Math.abs(start.dy)) return;
            const node = event.currentTarget;
            cancelAnimationFrame(dragFrame.current);
            dragFrame.current = requestAnimationFrame(() => {
              motion.current?.cancel();
              node.dataset.dragging = "true";
              node.style.setProperty("--card-x", `${start.dx * .85}px`);
              node.style.setProperty("--card-y", `${start.dy * .08}px`);
              node.style.setProperty("--card-angle", `${Math.max(-12, Math.min(12, start.dx / 24))}deg`);
            });
          }}
          onPointerCancel={() => { pointer.current = null; reset(); }}
          onPointerUp={(event) => {
            const start = pointer.current; pointer.current = null;
            if (!start || start.id !== event.pointerId) return;
            if (Math.abs(start.dx) > 8) suppressClickUntil.current = performance.now() + 400;
            if (Math.abs(start.dx) > Math.max(45, event.currentTarget.offsetWidth * .16) && Math.abs(start.dx) > Math.abs(start.dy) * 1.3) turn(start.dx > 0 ? -1 : 1);
            else reset();
          }}
          onClick={() => { if (performance.now() >= suppressClickUntil.current) turn(1); }}>
          {failed ? <span className="now-image-error"><Images size={34} /><span>Ảnh chưa tải được.</span></span> : <img key={`${item.id}-${attempt}`} src={item.image} alt={item.caption || `Khoảnh khắc của ${person?.name || "bạn"}`} draggable={false} fetchPriority="high" onError={() => setFailed(true)} />}
          {!discovered && behind && !failed && <span className="now-turn-hint" aria-hidden="true"><Layers3 size={16} />Kéo ngang để lật ảnh</span>}
        </button>
        {failed && <button type="button" className="now-image-retry" onClick={() => { setAttempt((value) => value + 1); setFailed(false); }}><RefreshCw size={17} />Thử lại</button>}
        {story.userId === "me" && <MomentReactionBurst storyId={story.id} moments={item} surface="detail" />}
        {story.userId === "me" && <StoryMenu story={story} person={person} item={item} allowMusic={inViewer && allowMusic} />}
      </div>
      <span id={hintId} className="sr-only">Kéo ngang rồi thả để lật ảnh. Bạn cũng có thể bấm ảnh hoặc dùng phím mũi tên trái, phải.</span>
    </div>
    <div className="now-identity-slot">
      <div className="now-byline"><Link href={`/community/profile/${person?.username || "me"}`} onNavigate={() => viewStory(null)}><Avatar person={person} size="sm" /><strong>{story.userId === "me" ? "Bạn" : person?.name || "Bạn bè"}</strong></Link><time className="now-timestamp" dateTime={item.at}>{timeAgo(item.at)}</time></div>
      {inViewer ? <button type="button" className={`now-caption-button ${captionExpanded ? "is-expanded" : ""}`} onClick={() => setCaptionExpanded(!captionExpanded)} aria-expanded={!!item.caption && captionExpanded} disabled={!item.caption} aria-label={item.caption ? "Xem đầy đủ lời nhắn của khoảnh khắc" : undefined}><span className="now-caption">{item.caption || "\u00a0"}</span></button>
        : <p className="now-caption-button"><span className="now-caption">{item.caption || "\u00a0"}</span></p>}
    </div>
    <MomentResponse story={story} item={item} person={person} composer={composer} />
  </article>;
}
