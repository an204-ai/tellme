"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, LoaderCircle, Send } from "lucide-react";
import { apiRepository, ApiError, canView } from "@/lib/api-repository";
import { canMessagePerson } from "@/lib/chat-policy";
import { localDay } from "@/lib/validation";
import { useCommunity } from "@/hooks/use-community";
import { useAppStore } from "@/stores/app.store";
import { Button, Loader } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { StoryMusic } from "@/components/music/StoryMusic";
import { MomentActions } from "./MomentActions";
import { MomentCard, type PhotoMoment } from "./MomentCard";

/** One author's day only. The shared MomentCard keeps replies, reactions and gestures identical to home. */
export function StoryMomentViewer({ storyId, initialIndex, initialMomentId, allowMusic = false }: { storyId: string; initialIndex: number; initialMomentId?: string; allowMusic?: boolean }) {
  const { data } = useCommunity();
  const viewStory = useAppStore((state) => state.viewStory);
  const open = useAppStore((state) => state.open);
  const query = useQuery({ queryKey: ["tellme", "story", storyId], queryFn: () => apiRepository.getStory(storyId), placeholderData: () => apiRepository.peekStory(storyId), retry: false });
  const denied = query.error instanceof ApiError && [403, 404].includes(query.error.status);
  const story = !denied && query.data && data && !data.blocked.includes(query.data.userId) && canView(query.data.userId, query.data.privacy, data) ? query.data : undefined;
  const person = data?.people.find((entry) => entry.id === story?.userId);
  const [selected, setSelected] = useState(initialMomentId);
  const [discovered, setDiscovered] = useState(false);
  const moments = useMemo<PhotoMoment[]>(() => story ? [...story.items].sort((a, b) => b.at.localeCompare(a.at)).map((item) => ({ story, item, person })) : [], [story, person]);
  const initialId = initialMomentId || moments[initialIndex]?.item.id;
  const current = moments.find((entry) => entry.item.id === (selected || initialId)) || moments[0];
  const index = current ? moments.indexOf(current) : 0;
  const drafts = useRef<Record<string, string>>({});
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const formId = useId();
  const itemId = current?.item.id;
  const onDraftChange = useCallback((value: boolean) => { if (itemId) setReady((state) => ({ ...state, [itemId]: value })); }, [itemId]);
  const onSendingChange = useCallback((value: boolean) => { if (itemId) setSending((state) => ({ ...state, [itemId]: value })); }, [itemId]);
  const composer = useMemo(() => ({ formId, drafts, onDraftChange, onSendingChange }), [formId, onDraftChange, onSendingChange]);
  useEffect(() => {
    if (moments.length < 2) return;
    for (const offset of [-1, 1]) {
      const neighbor = moments[index + offset];
      if (!neighbor) continue;
      const image = new Image(); image.decoding = "async";
      image.src = neighbor.item.image;
      void image.decode().catch(() => {});
    }
  }, [index, moments]);
  const close = () => { if (allowMusic) useAppStore.getState().setMomentView("today"); viewStory(null); };
  const title = story?.day === localDay() ? "Khoảnh khắc hôm nay" : story ? `Ngày ${new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric" }).format(new Date(`${story.day}T12:00:00+07:00`))}` : "Chuỗi khoảnh khắc";
  if (!current || !story) return <Modal title={query.isPending ? "Đang mở chuỗi ảnh…" : "Chưa mở được chuỗi ảnh"} onClose={close} className="story-stack-dialog" dismissOnEmptySpace>
    <div className="story-stack-empty">{query.isPending ? <Loader /> : <><p>{query.isError && !denied ? "Kết nối tạm gián đoạn. Bạn thử lại nhé." : "Chuỗi ảnh này không còn khả dụng."}</p>{query.isError && !denied && <Button onClick={() => void query.refetch()}>Thử lại</Button>}</>}</div>
  </Modal>;
  const step = (direction: number) => {
    const neighbor = moments[index + direction];
    if (neighbor) setSelected(neighbor.item.id);
    else if (direction > 0) close();
  };
  const replying = story.userId !== "me" && data && canMessagePerson(story.userId, data) && (ready[current.item.id] ?? !!drafts.current[current.item.id]?.trim());
  const pending = !!sending[current.item.id];
  return <Modal title={title} subtitle={<span aria-live="polite">Ảnh {index + 1} / {moments.length}</span>} headerExtra={allowMusic ? <StoryMusic key={story.id} story={story} /> : undefined} onClose={close} className="story-stack-dialog" dismissOnEmptySpace>
    <div className="story-stack-stage">
      <MomentCard key={current.item.id} moment={current} behind={moments[index + 1]} canPrevious={index > 0} previous={() => step(-1)} next={() => step(1)} discovered={discovered} onDiscover={() => setDiscovered(true)} composer={composer} inViewer allowMusic={allowMusic} />
      <nav className="now-dock story-stack-dock" aria-label={replying ? "Gửi lời nhắn riêng" : "Chụp khoảnh khắc của bạn"}>
        <MomentActions key={current.item.id} moment={current} />
        {replying ? <button type="submit" className="now-shutter now-send" form={formId} disabled={pending} aria-label={pending ? "Đang gửi lời nhắn" : "Gửi lời nhắn riêng"} aria-busy={pending}><span>{pending ? <LoaderCircle className="now-send-progress" size={26} /> : <Send size={27} />}</span></button>
          : <button type="button" className="now-shutter" aria-label="Chụp khoảnh khắc" onClick={() => { close(); open("moment"); }}><span><Camera size={27} /></span></button>}
      </nav>
    </div>
  </Modal>;
}
