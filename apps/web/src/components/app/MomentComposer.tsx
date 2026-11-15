"use client";
import { playInterfaceSound } from "@/lib/interface-sounds";

import { useEffect, useRef, useState } from "react";
import { UserRound, UsersRound } from "lucide-react";
import { canPostToPhotoGroup } from "@tellme/shared/photo-groups";
import { useQueryClient } from "@tanstack/react-query";
import { photoGroupsKey, usePhotoGroups } from "@/hooks/use-photo-groups";
import type { GroupPhoto, PhotoGroup } from "@/lib/types";
import type { PhotoMoment } from "./MomentCard";
import { MomentCamera } from "@/components/ui/MomentCamera";
import { MomentCaptureReview } from "@/components/ui/MomentCaptureReview";
import { Modal } from "@/components/ui/Modal";
import { useCommunity } from "@/hooks/use-community";
import { createMomentUpload } from "@/lib/moment-upload";
import { newId, readImage, request } from "@/lib/api-repository";
import { localDay, momentSchema } from "@/lib/validation";
import { useAppStore } from "@/stores/app.store";

export function MomentComposer({ embedded = false, active = true }: { embedded?: boolean; active?: boolean }) {
  const { data, update, saving } = useCommunity();
  const open = useAppStore((state) => state.open);
  const notify = useAppStore((state) => state.notify);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [returnToCamera, setReturnToCamera] = useState(false);
  const groups = usePhotoGroups(), query = useQueryClient();
  const destinationId = useAppStore((state) => state.photoDestination);
  const group = groups.data?.items.find((entry) => entry.id === destinationId);
  const activeGroup = groups.data?.items.find((entry) => canPostToPhotoGroup(entry));
  const missingDestination = !!destinationId && !canPostToPhotoGroup(group);
  useEffect(() => {
    // No group means ordinary posting before capture; never silently redirect a captured private photo.
    if (groups.isSuccess && !activeGroup && !photo && destinationId) useAppStore.getState().setPhotoDestination(null);
  }, [groups.isSuccess, activeGroup, photo, destinationId]);
  // Retrying a failed save must not insert the same captured photo twice.
  const ids = useRef<{ story: string; moment: string } | null>(null);
  const pending = useAppStore((state) => state.pendingUpload);
  const busy = saving || pending?.status === "uploading";

  useEffect(() => {
    if (!photo) { setPreview(""); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    const captureIds = ids.current;
    if (!photo || !captureIds || busy || missingDestination) return;
    const parsed = momentSchema.safeParse({ image: "camera-capture", caption, storyPrivacy: "connections" });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Kiểm tra lại khoảnh khắc nhé."); return; }
    const file = photo;
    const day = localDay();
    const storyId = data?.stories.find((entry) => entry.userId === "me" && entry.day === day)?.id || captureIds.story;
    const imagePreview = URL.createObjectURL(file);
    const target = group;
    const item: GroupPhoto = { id: captureIds.moment, image: imagePreview, caption: parsed.data.caption, at: new Date().toISOString(), groupId: target?.id || "", userId: "me", person: data?.people.find((entry) => entry.id === "me") };
    const moment: PhotoMoment = { story: { id: target ? `photo-group:${target.id}` : storyId, userId: "me", day, privacy: target ? "private" : "connections", items: [] }, item, person: item.person, ...(target ? { group: { ...target, count: target.count + 1, latest: item } } : {}) };
    const run = createMomentUpload({
      upload: () => readImage(file),
      save: async (image) => {
        if (target) {
          await request(`/photo-groups/${target.id}/photos`, { method: "POST", body: JSON.stringify({ id: item.id, image, caption: item.caption }) });
          query.setQueryData<{ items: PhotoGroup[] }>(photoGroupsKey, (data) => data && ({ ...data, items: data.items.map((group) => group.id !== target.id ? group : { ...group, count: group.count + Number(group.latest?.id !== item.id), latest: { ...item, image } }) }));
          await query.invalidateQueries({ queryKey: photoGroupsKey });
          return;
        }
        await update((draft) => {
        let story = draft.stories.find((entry) => entry.userId === "me" && entry.day === day);
        if (!story) { story = { id: storyId, userId: "me", day, privacy: "connections", items: [] }; draft.stories.unshift(story); }
        if (!story.items.some((item) => item.id === captureIds.moment)) story.items.push({ ...moment.item, image });
        });
      },
      state: (status, image) => useAppStore.getState().setPendingUpload({ moment: image ? { ...moment, item: { ...moment.item, image } } : moment, status, retry: () => void run() }),
      done: () => {
        playInterfaceSound("success");
        setTimeout(() => {
          if (useAppStore.getState().pendingUpload?.moment.item.id === captureIds.moment) useAppStore.getState().setPendingUpload(null);
          URL.revokeObjectURL(imagePreview);
        }, 2000);
      },
      error: (failure) => notify(failure instanceof Error ? failure.message : "Chưa đăng được ảnh. Bấm Thử lại."),
    });
    setPhoto(null); setCaption(""); ids.current = null;
    if (!embedded) open(null);
    void run();
  }

  // Adapted from the user's rotating/scaling React switch; shared glass replaces its white halo.
  const destination = activeGroup ? <button type="button" role="switch" aria-checked={!!destinationId} className="moment-destination-toggle glass-control" disabled={busy || groups.isPending} aria-label={destinationId ? `Đang đăng vào ${group?.title || "nhóm"}. Chuyển sang đăng thường` : "Đang đăng thường. Chuyển sang đăng nhóm"} onClick={() => {
    if (destinationId) useAppStore.getState().setPhotoDestination(null);
    else if (activeGroup) useAppStore.getState().setPhotoDestination(activeGroup.id);
    setError("");
  }}><span className="destination-icon destination-icon-person" aria-hidden="true"><UserRound size={27} /></span><span className="destination-icon destination-icon-group" aria-hidden="true"><UsersRound size={27} /></span></button> : null;
  const content = !photo ? <div className="moment-capture-body"><MomentCamera destination={destination} active={active} autoStart={!embedded || returnToCamera} onBrowse={embedded ? () => useAppStore.getState().setMomentView("today") : undefined} onCapture={(file) => {
        ids.current = { story: newId(), moment: newId() };
        setReturnToCamera(true);
        setPhoto(file);
        setError("");
      }} /></div> : <MomentCaptureReview destination={destination} publishLabel={group ? `Đăng vào ${group.title}` : "Đăng khoảnh khắc"} preview={preview} caption={caption} onCaption={setCaption} onDiscard={() => { setPhoto(null); setCaption(""); setError(""); ids.current = null; }} onPublish={publish} busy={busy || missingDestination} error={error || (missingDestination ? <><span>Nhóm đã kết thúc. </span><button type="button" className="moment-post-ordinary" onClick={() => useAppStore.getState().setPhotoDestination(null)}>Đăng thường</button></> : "")} />;

  return embedded ? <div className="moment-inline-composer">{content}</div> : <><Modal title={photo ? "Khoảnh khắc vừa chụp" : "Chụp một chút hôm nay"} className="moment-capture-dialog" onClose={() => { open(null); }}>{content}</Modal></>;
}
