"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { playInterfaceSound } from "@/lib/interface-sounds";
import { newReceivedReactions, receivedReactionParticles, type ReactionCounts } from "@/lib/received-reactions";
import { useAppStore } from "@/stores/app.store";
import { useCommunity } from "@/hooks/use-community";
import { useBrandIntroFinished } from "./BrandIntro";
import { ReactionIcon } from "@/components/ui/ReactionControl";
import type { MomentItem, Reaction } from "@/lib/types";

type MomentReactions = Pick<MomentItem, "id" | "incomingReactions">;
const seenReactions = new Map<string, ReactionCounts>();

function readSeen(key: string): ReactionCounts {
  if (seenReactions.has(key)) return seenReactions.get(key)!;
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(key) || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(Object.entries(parsed).filter(([, count]) => Number.isSafeInteger(count) && Number(count) >= 0)) as ReactionCounts;
    }
  } catch { /* Private browsing and full storage still have the in-memory history. */ }
  return {};
}

export function MomentReactionBurst({ storyId, moments, surface }: {
  storyId: string; moments?: MomentReactions | MomentReactions[]; surface: "preview" | "detail";
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const sequence = useRef(0);
  const { data } = useCommunity();
  const introFinished = useBrandIntroFinished();
  const overlayOpen = useAppStore((state) => !!(state.overlay || state.viewedStory || state.musicStoryId));
  const [visible, setVisible] = useState(true);
  const [burst, setBurst] = useState<{ id: number; reactions: Reaction[]; host: HTMLElement }>();
  useEffect(() => {
    const visibility = () => setVisible(!document.hidden);
    visibility(); document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (!moments || !introFinished || !visible || document.hidden || data?.settings.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (overlayOpen && !anchor.current?.closest("dialog")) return;
    const added: Reaction[] = [];
    for (const item of Array.isArray(moments) ? moments : [moments]) {
      if (!item.incomingReactions) continue;
      // Home and the full-day modal share detail history. A shelf preview does not consume it.
      const key = `tellme:received:${surface}:${storyId}:${item.id}`;
      const next = newReceivedReactions(readSeen(key), item.incomingReactions);
      added.push(...next.added);
      seenReactions.delete(key); seenReactions.set(key, next.counts);
      if (seenReactions.size > 250) seenReactions.delete(seenReactions.keys().next().value!);
      try { sessionStorage.setItem(key, JSON.stringify(next.counts)); } catch { /* Keep the memory fallback. */ }
    }
    if (added.length) {
      setBurst({ id: ++sequence.current, reactions: added, host: anchor.current?.closest("dialog") || document.body });
      if (surface === "detail") playInterfaceSound("reactionBurst");
    }
  }, [moments, storyId, surface, introFinished, visible, overlayOpen, data?.settings.reducedMotion]);
  useEffect(() => {
    if (!burst) return;
    const timer = setTimeout(() => setBurst((current) => current === burst ? undefined : current), surface === "detail" ? 6500 : 5000);
    return () => clearTimeout(timer);
  }, [burst, surface]);
  const finish = () => setBurst((current) => current === burst ? undefined : current);
  return <><span ref={anchor} className="moment-reaction-burst-anchor" aria-hidden="true" />{burst && (surface === "detail"
    ? createPortal(<ReceivedReactionFloaters key={burst.id} reactions={burst.reactions} onFinish={finish} />, burst.host)
    : <PreviewFloaters key={burst.id} reactions={burst.reactions} onFinish={finish} />)}</>;
}

function ReceivedReactionFloaters({ reactions, onFinish }: { reactions: Reaction[]; onFinish: () => void }) {
  const particles = receivedReactionParticles(reactions);
  return <div className="received-reaction-burst" aria-hidden="true">
    {particles.map((value, index) => <span key={index} className="received-reaction-particle" style={{
      "--received-x": `${5 + ((index * .61803398875) % 1) * 90}%`,
      "--received-drift": `${Math.sin(index * 2.4) * 48}px`,
      "--received-delay": `${index * 65}ms`,
      "--received-duration": `${2800 + index % 5 * 160}ms`,
      "--received-size": `${36 + index % 4 * 5}px`,
      "--received-turn": `${(index % 2 ? 1 : -1) * (9 + index % 6 * 3)}deg`,
    } as CSSProperties} onAnimationEnd={index === particles.length - 1 ? onFinish : undefined}>
      <span className="received-reaction-face"><ReactionIcon value={value} size={30 + index % 4 * 4} /></span>
    </span>)}
  </div>;
}

function PreviewFloaters({ reactions, onFinish }: { reactions: Reaction[]; onFinish: () => void }) {
  const values = reactions.slice(0, 6);
  return <span className="moment-reaction-floaters" aria-hidden="true">
    {values.flatMap((value, index) => Array.from({ length: 3 }, (_, copy) => {
      const slot = index + copy * values.length;
      const position = (slot * .618) % 1;
      return <span key={slot} style={{ "--float-delay": `${slot * 105}ms`, "--float-start": `${14 + position * 72}%`, "--float-drift": `${position < .5 ? 12 : -12}px` } as CSSProperties}
        onAnimationEnd={slot === values.length * 3 - 1 ? onFinish : undefined}><ReactionIcon value={value} size={56} /></span>;
    }))}
  </span>;
}
