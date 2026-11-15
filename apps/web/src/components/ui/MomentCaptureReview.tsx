"use client";
import { useId, useRef, type ReactNode } from "react";
import { Send, X } from "lucide-react";
import { useSurfaceArrival } from "./SurfaceTransition";
import { limitMomentCaption, MOMENT_CAPTION_CHARS } from "@tellme/shared/captions";

/** The captured state keeps the same frame and shutter position as the live camera. */
export function MomentCaptureReview({ preview, caption, onCaption, onDiscard, onPublish, busy, error, destination, publishLabel = "Đăng khoảnh khắc" }: {
  preview: string; caption: string; onCaption: (value: string) => void; onDiscard: () => void;
  onPublish: (event: React.FormEvent) => void; busy: boolean; error: ReactNode;
  destination?: ReactNode; publishLabel?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);
  const captionId = useId();
  const composing = useRef(false);
  useSurfaceArrival(ref, preview);
  return <form ref={ref} className="moment-camera moment-captured-form" onSubmit={onPublish} aria-busy={busy}>
    <div className="moment-photo-review">
      {preview && <img src={preview} alt="Khoảnh khắc vừa chụp, chưa đăng" />}
      {destination}
      <label className="moment-caption-overlay" htmlFor={captionId} onClick={() => captionRef.current?.focus({ preventScroll: true })}>
        <span aria-hidden="true">{caption || "Thêm chú thích…"}</span>
        <input ref={captionRef} id={captionId} size={1} aria-label="Chú thích khoảnh khắc, tối đa 8 từ và 40 ký tự" value={caption} maxLength={MOMENT_CAPTION_CHARS} placeholder="Thêm chú thích…" disabled={busy}
          onCompositionStart={() => { composing.current = true; }} onCompositionEnd={(event) => { composing.current = false; onCaption(limitMomentCaption(event.currentTarget.value)); }}
          onChange={(event) => onCaption(composing.current ? event.target.value : limitMomentCaption(event.target.value))} />
      </label>
    </div>
    <div className="moment-camera-controls">
      <button type="button" className="moment-discard" aria-label="Bỏ ảnh và chụp lại" onClick={onDiscard} disabled={busy}><X size={30} /></button>
      <button type="submit" className="moment-shutter moment-publish-shutter" aria-label={publishLabel} disabled={busy}><Send size={30} /></button>
      <span className="moment-camera-control-space" aria-hidden="true" />
    </div>
    {error && <p className="field-error" role="alert">{error}</p>}
  </form>;
}
