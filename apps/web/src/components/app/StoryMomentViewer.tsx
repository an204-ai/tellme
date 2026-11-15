"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRepository, ApiError, canView } from "@/lib/api-repository";
import { localDay } from "@/lib/validation";
import { useCommunity } from "@/hooks/use-community";
import { useAppStore } from "@/stores/app.store";
import { Button, Loader } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { StoryMusic } from "@/components/music/StoryMusic";
import { FloatingNavigation } from "./FloatingNavigation";
import { MomentStream } from "./MomentStream";
import type { PhotoMoment } from "./MomentCard";

/** The same vertical viewer for a friend's day, the profile journey and message links. */
export function StoryMomentViewer({ storyId, initialIndex, initialMomentId, allowMusic = false }: { storyId: string; initialIndex: number; initialMomentId?: string; allowMusic?: boolean }) {
  const { data } = useCommunity();
  const [activeMoment, setActiveMoment] = useState<PhotoMoment | null>(null);
  const viewStory = useAppStore((state) => state.viewStory);
  const query = useQuery({ queryKey: ["tellme", "story", storyId], queryFn: () => apiRepository.getStory(storyId), placeholderData: () => apiRepository.peekStory(storyId), retry: false });
  const denied = query.error instanceof ApiError && [403, 404].includes(query.error.status);
  const story = !denied && query.data && data && !data.blocked.includes(query.data.userId) && canView(query.data.userId, query.data.privacy, data) ? query.data : undefined;
  const person = data?.people.find((entry) => entry.id === story?.userId);
  const moments = useMemo<PhotoMoment[]>(() => story ? [...story.items].sort((a, b) => b.at.localeCompare(a.at)).map((item) => ({ story, item, person })) : [], [story, person]);
  const close = () => viewStory(null);
  const title = story?.day === localDay() ? "Khoảnh khắc hôm nay" : story ? `Ngày ${new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric" }).format(new Date(`${story.day}T12:00:00+07:00`))}` : "Chuỗi khoảnh khắc";
  if (!moments.length || !story) return <Modal title={query.isPending ? "Đang mở chuỗi ảnh…" : "Chưa mở được chuỗi ảnh"} onClose={close} className="story-stream-dialog"><div className="story-stack-empty">{query.isPending ? <Loader /> : <><p>{query.isError && !denied ? "Kết nối tạm gián đoạn. Bạn thử lại nhé." : "Chuỗi ảnh này không còn khả dụng."}</p>{query.isError && !denied && <Button onClick={() => void query.refetch()}>Thử lại</Button>}</>}</div></Modal>;
  return <Modal title={title} subtitle="Lướt lên để xem tiếp" headerExtra={allowMusic ? <StoryMusic key={story.id} story={story} /> : undefined} onClose={close} className="story-stream-dialog">
    <MomentStream moments={moments} onActiveMoment={setActiveMoment} initialMomentId={initialMomentId || moments[initialIndex]?.item.id} footer={<div className="moment-end-copy"><h2>Một ngày được giữ lại.</h2><p>Bạn đã xem hết khoảnh khắc trong ngày này.</p><Button variant="secondary" onClick={close}>Đóng ngày này</Button></div>} />
    <FloatingNavigation viewer moment={activeMoment} />
  </Modal>;
}
