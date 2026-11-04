"use client";
import { playInterfaceSound } from "@/lib/interface-sounds";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ReactionIcon } from "@/components/ui/ReactionControl";
import type { MomentItem, Reaction } from "@/lib/types";

type MomentReactions = Pick<MomentItem, "id" | "incomingReactions">;
const seenReactions = new Map<string, Map<Reaction, number>>();

export function MomentReactionBurst({ storyId, moments, surface }: {
  storyId: string;
  moments?: MomentReactions | MomentReactions[];
  surface: "preview" | "detail";
}) {
  const sequence = useRef(0);
  const [burst, setBurst] = useState<{ id: number; reactions: Reaction[] }>();

  useEffect(() => {
    if (!moments || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const added: Reaction[] = [];
    for (const item of Array.isArray(moments) ? moments : [moments]) {
      if (!item.incomingReactions) continue;
      // Track each photo separately, so changes on one photo cannot replay another.
      const key = `${surface}:${storyId}:${item.id}`;
      const previous = seenReactions.get(key);
      const counts = new Map<Reaction, number>();
      for (const value of item.incomingReactions) {
        const count = (counts.get(value) ?? 0) + 1;
        counts.set(value, count);
        if (added.length < 6 && count > (previous?.get(value) ?? 0)) added.push(value);
      }
      seenReactions.delete(key);
      seenReactions.set(key, counts);
      if (seenReactions.size > 250) seenReactions.delete(seenReactions.keys().next().value!);
    }
    if (added.length) {
      setBurst({ id: ++sequence.current, reactions: added });
      if (surface === "detail") playInterfaceSound("reactionBurst");
    }
  }, [moments, storyId, surface]);

  return burst ? <MomentReactionFloaters key={burst.id} reactions={burst.reactions}
    onFinish={() => setBurst((current) => current === burst ? undefined : current)} /> : null;
}

function MomentReactionFloaters({ reactions, onFinish }: { reactions: Reaction[]; onFinish: () => void }) {

  return <span className="moment-reaction-floaters" aria-hidden="true">
    {reactions.flatMap((value, index) => Array.from({ length: 3 }, (_, copy) => {
      const slot = index + copy * reactions.length;
      // Spread successive icons across the image without randomizing on render.
      const position = (slot * .618) % 1;
      return <span
        key={slot}
        style={{
          "--float-delay": `${slot * 105}ms`,
          "--float-start": `${14 + position * 72}%`,
          "--float-drift": `${position < .5 ? 12 : -12}px`,
        } as CSSProperties}
        onAnimationEnd={slot === reactions.length * 3 - 1 ? onFinish : undefined}
      ><ReactionIcon value={value} size={56} /></span>;
    }))}
  </span>;
}
