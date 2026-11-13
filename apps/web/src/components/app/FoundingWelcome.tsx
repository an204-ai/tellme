"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCommunity, communityKey } from "@/hooks/use-community";
import { request } from "@/lib/api-repository";
import { useAppStore } from "@/stores/app.store";
import { useBrandIntroFinished } from "./BrandIntro";
import { Modal } from "@/components/ui/Modal";

const confetti = Array.from({ length: 48 }, (_, i) => {
  const angle = i * 2.399963, distance = 150 + i % 7 * 35;
  return { "--confetti-x": `${Math.cos(angle) * distance}px`, "--confetti-y": `${Math.sin(angle) * distance}px`, "--confetti-turn": `${i * 57}deg`, "--confetti-color": ["#f4cd68", "#aacdff", "#f1a9b6", "#c4b5f5"][i % 4], animationDelay: `${1050 + i % 5 * 35}ms` } as CSSProperties;
});

/** Server-side claim makes this a one-time thank-you, including across devices. */
export function FoundingWelcome() {
  const { data } = useCommunity();
  const introFinished = useBrandIntroFinished();
  const { overlay, viewedStory, musicStoryId } = useAppStore();
  const person = data?.people.find(p => p.id === "me");
  const [open, setOpen] = useState(false);
  const claim = useRef<Promise<{ celebrate: boolean }> | null>(null);
  const shown = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const queryClient = useQueryClient();
  const ready = introFinished && person?.foundingWelcomePending && !overlay && !viewedStory && !musicStoryId;
  useEffect(() => {
    if (!ready) return;
    claim.current ||= request<{ celebrate: boolean }>("/users/me/founding-welcome", { method: "POST" });
    void claim.current.then(result => { if (mounted.current && result.celebrate && !shown.current) { shown.current = true; setOpen(true); } }).catch(() => { /* A later visit can retry without interrupting the app. */ });
  }, [ready]);
  if (!open || overlay || viewedStory || musicStoryId) return null;
  const close = () => { setOpen(false); void queryClient.invalidateQueries({ queryKey: communityKey }); };
  return <Modal title="Bạn là người mở lối!" onClose={close} className="founding-welcome">
    <div className="founding-celebration">
      <div className="founding-confetti" aria-hidden="true">{confetti.map((style, i) => <i key={i} style={style} />)}</div>
      <div className="founding-welcome-star" aria-hidden="true"><img src="/images/journey-star-yellow.svg" alt="" /></div>
      <div className="founding-welcome-copy">
        <h3>Chúc mừng bạn là một trong 100 người mở lối cùng Tellme!</h3>
        <button type="button" onClick={close}>Cùng kể tiếp nha</button>
      </div>
    </div>
  </Modal>;
}
