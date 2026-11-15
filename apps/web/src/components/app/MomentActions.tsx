"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, LoaderCircle, Share, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api-repository";
import { photoGroupsKey } from "@/hooks/use-photo-groups";
import { Button } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { StoryMenu } from "./StoryMenu";
import { useAppStore } from "@/stores/app.store";
import type { PhotoMoment } from "./MomentCard";

/** Export only the photo already available to this authenticated viewer. Links keep the usual access checks. */
export function MomentActions({ moment }: { moment: PhotoMoment }) {
  const [expanded, setExpanded] = useState(false);
  const file = useRef<File | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false), [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const query = useQueryClient();
  const notify = useAppStore((s) => s.notify);
  const { story, item, person, group } = moment;
  const pending = useAppStore((state) => state.pendingUpload?.moment.item.id === item.id);
  useEffect(() => () => controller.current?.abort(), []);
  const prepare = async () => {
    if (file.current || loading) return;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    setLoading(true); setError(false);
    try {
      const url = new URL(item.image, location.href);
      const response = await fetch(url, { credentials: url.origin === location.origin ? "same-origin" : "omit", signal: abort.signal });
      if (!response.ok) throw new Error("unavailable");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) throw new Error("invalid-image");
      const extension = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      file.current = new File([blob], `tellme-${story.day}-${item.id.slice(0, 8)}.${extension}`, { type: blob.type });
    } catch { if (!abort.signal.aborted) setError(true); }
    finally { if (!abort.signal.aborted) setLoading(false); }
  };
  const link = () => group ? `${location.origin}/community/today?group=${encodeURIComponent(group.id)}` : `${location.origin}/community/today?story=${encodeURIComponent(story.id)}&moment=${encodeURIComponent(item.id)}`;
  const removeGroupPhoto = async () => {
    if (!group || deleting) return;
    setDeleting(true); setDeleteError("");
    try {
      await request(`/photo-groups/${group.id}/photos/${item.id}`, { method: "DELETE" });
      setConfirmDelete(false); setExpanded(false);
      useAppStore.getState().showFeedback("Đã xóa ảnh");
      await query.invalidateQueries({ queryKey: photoGroupsKey });
    } catch (e) { setDeleteError(e instanceof Error ? e.message : "Chưa xóa được ảnh. Thử lại nhé."); }
    finally { setDeleting(false); }
  };
  const share = async () => {
    try {
      const photo = file.current;
      if (photo && navigator.canShare?.({ files: [photo] })) await navigator.share({ files: [photo], title: "Khoảnh khắc Tellme", text: item.caption || undefined });
      else if (navigator.share) await navigator.share({ title: "Khoảnh khắc Tellme", url: link() });
      else { await navigator.clipboard.writeText(link()); setCopied(true); return; }
      setExpanded(false);
    } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) notify("Chưa chia sẻ được. Bạn thử tải ảnh xuống nhé."); }
  };
  const download = () => {
    if (!file.current) return;
    const url = URL.createObjectURL(file.current), anchor = document.createElement("a");
    anchor.href = url; anchor.download = file.current.name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    setExpanded(false);
    useAppStore.getState().showFeedback("Đã gửi ảnh để lưu", "Kiểm tra mục tải về của máy.");
  };
  return <div className="moment-actions">
    <button type="button" className="moment-options-trigger" disabled={pending} aria-label="Tùy chọn ảnh: chia sẻ và thao tác khác" aria-haspopup="dialog" aria-expanded={expanded} onClick={() => { setExpanded(true); setCopied(false); void prepare(); }}><Share size={24} /></button>
    {expanded && <Modal title={group?.title || (story.userId === "me" ? "Khoảnh khắc của bạn" : "Khoảnh khắc của bạn bè")} className="moment-actions-dialog" onClose={() => { setExpanded(false); controller.current?.abort(); setLoading(false); }}>
      <div className="moment-sheet-body">
        <div className="moment-sheet-preview"><img src={item.image} alt={item.caption || `Khoảnh khắc của ${person?.name || "bạn"}`} />{item.caption && <span>{item.caption}</span>}</div>
        <p className="moment-sheet-author">{group ? `Ảnh của ${story.userId === "me" ? "bạn" : person?.name || "thành viên"}` : story.userId === "me" ? "Ngày của bạn" : person?.name || "Một người bạn"}</p>
        <div className="moment-sheet-controls" role="group" aria-label="Thao tác khoảnh khắc, cuộn ngang để xem thêm" tabIndex={0}>
          <button type="button" onClick={() => void share()}>{copied ? <Check size={24} /> : <Share size={24} />}<span>{copied ? "Đã sao chép" : "Chia sẻ"}</span></button>
          <button type="button" disabled={loading || !file.current} onClick={download}>{loading ? <LoaderCircle className="is-spinning" size={24} /> : <Download size={24} />}<span>{loading ? "Đang tải…" : "Lưu ảnh"}</span></button>
          {group ? story.userId === "me" && <button type="button" className="danger-text" onClick={() => setConfirmDelete(true)}><Trash2 size={24} /><span>Xóa</span></button> : <StoryMenu story={story} person={person} item={item} allowMusic layout="sheet" />}
        </div>
        {error && <p className="moment-share-error" role="alert">Chưa tải được ảnh. <button type="button" onClick={() => void prepare()}>Thử lại</button></p>}
      </div>
    </Modal>}
    {confirmDelete && <Modal title="Xóa ảnh khỏi nhóm?" onClose={() => { if (!deleting) setConfirmDelete(false); }}><div className="dialog-body"><p>Ảnh này sẽ được gỡ khỏi chồng ảnh của nhóm.</p>{deleteError && <p className="field-error" role="alert">{deleteError}</p>}<div className="moment-edit-actions"><Button variant="secondary" disabled={deleting} onClick={() => setConfirmDelete(false)}>Giữ lại</Button><Button disabled={deleting} onClick={() => void removeGroupPhoto()}>{deleting ? "Đang xóa…" : "Xóa ảnh"}</Button></div></div></Modal>}
  </div>;
}
