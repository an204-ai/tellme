"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Images } from "lucide-react";
import { useGroupPhotos } from "@/hooks/use-photo-groups";
import { useAppStore } from "@/stores/app.store";
import { ApiError, timeAgo } from "@/lib/api-repository";
import { Avatar } from "@/components/ui/Primitives";
import { useSurfaceArrival } from "@/components/ui/SurfaceTransition";
import { UploadHamster } from "@/components/ui/UploadHamster";
import { PhotoGroupsDialog } from "./PhotoGroupsDialog";
import type { GroupPhoto, PhotoGroup } from "@/lib/types";
import type { PhotoMoment } from "./MomentCard";

export function GroupPhotoCard({ moment, active }: { moment: PhotoMoment & { group: PhotoGroup }; active: boolean }) {
  const group = moment.group, feed = useGroupPhotos(group.id, true);
  const pending = useAppStore((s) => s.pendingUpload?.moment.group?.id === group.id ? s.pendingUpload : null);
  const [selectedId, setSelectedId] = useState(group.latest?.id || "");
  const [details, setDetails] = useState(false), [captionExpanded, setCaptionExpanded] = useState(false);
  const [failedId, setFailedId] = useState("");
  const surface = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ x: number; y: number; horizontal: boolean } | null>(null), swiped = useRef(false);
  const photos = useMemo(() => {
    const loaded = feed.data?.pages.flatMap((page) => page.items) || (group.latest ? [group.latest] : []);
    const optimistic: GroupPhoto[] = pending ? [{ ...pending.moment.item, groupId: group.id, userId: "me", person: pending.moment.person }] : [];
    return [...new Map([...optimistic, ...loaded].map((photo) => [photo.id, photo])).values()];
  }, [feed.data, group.latest, pending, group.id]);
  const index = Math.max(0, photos.findIndex((p) => p.id === selectedId)), photo = photos[index];
  const unavailable = feed.error instanceof ApiError && [403, 404].includes(feed.error.status);
  useEffect(() => {
    if (active && feed.hasNextPage && !feed.isFetchingNextPage && !feed.isFetchNextPageError && index >= photos.length - 4) void feed.fetchNextPage();
  }, [active, index, photos.length, feed.hasNextPage, feed.isFetchingNextPage, feed.isFetchNextPageError, feed.fetchNextPage]);
  useEffect(() => { if (group.latest) setSelectedId(group.latest.id); }, [group.latest?.id]);
  useEffect(() => { if (pending) setSelectedId(pending.moment.item.id); }, [pending?.moment.item.id]);
  useEffect(() => { setCaptionExpanded(false); }, [photo?.id]);
  useSurfaceArrival(surface, photo?.id);
  useEffect(() => {
    if (!active) return;
    useAppStore.getState().setActiveMoment(photo && !unavailable ? { ...moment, item: photo, person: photo.person, story: { ...moment.story, userId: photo.userId }, group } : null);
  }, [active, photo, unavailable, group, moment]);
  const previous = () => { if (index > 0) setSelectedId(photos[index - 1]!.id); };
  const next = async () => {
    if (index < photos.length - 1) { setSelectedId(photos[index + 1]!.id); return; }
    if (!feed.hasNextPage || feed.isFetchingNextPage) return;
    const current = photo?.id, result = await feed.fetchNextPage();
    const list = result.data?.pages.flatMap((page) => page.items) || [];
    const following = list[list.findIndex((p) => p.id === current) + 1];
    if (following) setSelectedId((id) => id === current ? following.id : id);
  };
  if (!photo || unavailable) return <article className="now-moment stream-moment group-photo-unavailable"><Images size={40} /><h2>Nhóm ảnh không khả dụng</h2></article>;
  return <article className="now-moment stream-moment group-photo-card" aria-label={`Nhóm ${group.title}, ảnh ${index + 1} trên ${group.count}`}>
    <div className="now-photo-stack group-photo-stack">
      {[2, 1].filter((n) => group.count > n).map((n) => <div key={n} className={`group-photo-back group-photo-back-${n}`} aria-hidden="true">{photos[index + n] && <img src={photos[index + n]!.image} alt="" draggable={false} decoding="async" />}</div>)}
      <div className="now-photo">
        <button ref={surface} type="button" className="now-photo-surface group-photo-swipe" aria-label={`Ảnh ${index + 1} trên ${group.count}. Bấm để xem ảnh cũ hơn trong ${group.title}`} onClick={() => { if (swiped.current) { swiped.current = false; return; } void next(); }}
          onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); event.stopPropagation(); if (event.key === "ArrowLeft") previous(); else void next(); } }}
          onPointerDown={(event) => { gesture.current = { x: event.clientX, y: event.clientY, horizontal: false }; swiped.current = false; }}
          onPointerMove={(event) => { const start = gesture.current; if (!start) return; const dx = event.clientX - start.x, dy = event.clientY - start.y; if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) { start.horizontal = true; swiped.current = true; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.style.setProperty("--group-drag", `${Math.max(-32, Math.min(32, dx * .2))}px`); } }}
          onPointerUp={(event) => { const start = gesture.current; gesture.current = null; event.currentTarget.style.removeProperty("--group-drag"); if (!start?.horizontal) return; const dx = event.clientX - start.x; if (Math.abs(dx) >= 40) { if (dx < 0) void next(); else previous(); } }}
          onPointerCancel={(event) => { gesture.current = null; event.currentTarget.style.removeProperty("--group-drag"); }}>
          {failedId === photo.id ? <span className="now-image-error"><Images size={32} /><span>Ảnh chưa tải được.</span></span> : <img key={photo.id} src={photo.image} alt={photo.caption || `Ảnh của ${photo.person?.name || "thành viên"}`} draggable={false} decoding="async" fetchPriority={active ? "high" : "auto"} onError={() => setFailedId(photo.id)} />}
        </button>
        {photo.caption && <button type="button" className={`stream-caption ${captionExpanded ? "is-expanded" : ""}`} aria-expanded={captionExpanded} onClick={() => setCaptionExpanded(!captionExpanded)}><span>{photo.caption}</span></button>}
        {failedId === photo.id && <button className="now-image-retry" type="button" onClick={() => { setFailedId(""); void feed.refetch(); }}>Thử lại</button>}
      </div>
    </div>
    <div className="now-identity-slot group-photo-byline">
      <div className="group-photo-author" aria-live="polite">{pending && photo.id === pending.moment.item.id ? <span className="moment-upload-status" data-state={pending.status}>{pending.status === "uploading" ? <><UploadHamster /><span>Đang đăng…</span></> : pending.status === "done" ? "Đã xong" : <button type="button" onClick={pending.retry}>Chưa đăng được · Thử lại</button>}</span> : <><span>({photo.userId === "me" ? "Bạn" : photo.person?.name || "Thành viên"})</span><time dateTime={photo.at}>{timeAgo(photo.at)}</time></>}</div>
      <button type="button" className="group-photo-identity" onClick={() => setDetails(true)}><Avatar person={{ name: group.title, avatar: group.avatar }} size="sm" /><strong>{group.title}</strong></button>
    </div>
    <div className="now-response-slot group-photo-count" aria-live="polite"><span>{index + 1} / {group.count}</span>{feed.isFetchingNextPage && <small>Đang tải…</small>}</div>
    {feed.isError && !unavailable && <div className="group-photo-load-error" role="alert"><span>Chưa tải đủ ảnh.</span><button type="button" onClick={() => void feed.refetch()}>Thử lại</button></div>}
    {details && <PhotoGroupsDialog initialGroup={group} onClose={() => setDetails(false)} />}
  </article>;
}
