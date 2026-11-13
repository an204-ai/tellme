"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Download, LoaderCircle, Share2, X } from "lucide-react";
import { useAppStore } from "@/stores/app.store";
import type { PhotoMoment } from "./MomentCard";

/** Export only the photo already available to this authenticated viewer. Links keep the usual access checks. */
export function MomentActions({ moment }: { moment: PhotoMoment }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const file = useRef<File | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const notify = useAppStore((s) => s.notify);
  const { story, item, person } = moment;
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
  const link = () => `${location.origin}/community/today?story=${encodeURIComponent(story.id)}&moment=${encodeURIComponent(item.id)}`;
  const share = async () => {
    try {
      const photo = file.current;
      if (photo && navigator.canShare?.({ files: [photo] })) await navigator.share({ files: [photo], title: "Khoảnh khắc Tellme", text: item.caption || undefined });
      else if (navigator.share) await navigator.share({ title: "Khoảnh khắc Tellme", url: link() });
      else { await navigator.clipboard.writeText(link()); setCopied(true); return; }
      panel.current?.hidePopover();
    } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) notify("Chưa chia sẻ được. Bạn thử tải ảnh xuống nhé."); }
  };
  const download = () => {
    if (!file.current) return;
    const url = URL.createObjectURL(file.current), anchor = document.createElement("a");
    anchor.href = url; anchor.download = file.current.name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    panel.current?.hidePopover();
  };
  const canSharePhoto = !!file.current && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file.current] });
  return <div className="moment-actions">
    <button type="button" className="now-dock-side moment-share-trigger" popoverTarget={id} aria-label="Chia sẻ hoặc tải ảnh"><span className="moment-share-icon"><Share2 size={23} /></span><span>Chia sẻ</span></button>
    <div ref={panel} id={id} popover="auto" className="moment-share-menu" onToggle={(event) => { if (event.newState === "open") { setCopied(false); void prepare(); } else { controller.current?.abort(); setLoading(false); } }}>
      <header><img src={item.image} alt="" /><div><strong>{person?.name || "Khoảnh khắc của bạn"}</strong><p>{item.caption || "Một chút hôm nay"}</p></div><button type="button" aria-label="Đóng chia sẻ" popoverTarget={id} popoverTargetAction="hide"><X size={19} /></button></header>
      <button type="button" onClick={() => void share()}>{copied ? <Check size={22} /> : <Share2 size={22} />}<span><strong>{copied ? "Đã sao chép liên kết" : "Chia sẻ khoảnh khắc"}</strong><small>{canSharePhoto && !loading ? "Gửi ảnh qua ứng dụng bạn thích" : "Liên kết chỉ mở với người có quyền xem"}</small></span></button>
      <button type="button" disabled={loading || !file.current} onClick={download}>{loading ? <LoaderCircle className="is-spinning" size={22} /> : <Download size={22} />}<span><strong>{loading ? "Đang chuẩn bị ảnh…" : "Tải ảnh xuống"}</strong><small>Lưu ảnh gốc về máy</small></span></button>
      {error && <p className="moment-share-error" role="alert">Chưa tải được ảnh. <button type="button" onClick={() => void prepare()}>Thử lại</button></p>}
    </div>
  </div>;
}
