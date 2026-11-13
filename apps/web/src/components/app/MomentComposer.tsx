"use client";
import { playInterfaceSound } from "@/lib/interface-sounds";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { MomentCamera } from "@/components/ui/MomentCamera";
import { Modal } from "@/components/ui/Modal";
import { Button, ImageUploadStatus, Input } from "@/components/ui/Primitives";
import { useCommunity } from "@/hooks/use-community";
import { newId, readImage } from "@/lib/api-repository";
import { localDay, momentSchema } from "@/lib/validation";
import { weatherVoice } from "@/lib/weather";
import { useWeather } from "@/providers/WeatherProvider";
import { useAppStore } from "@/stores/app.store";

export function MomentComposer() {
  const { fresh: weather } = useWeather();
  const { data, update, saving } = useCommunity();
  const open = useAppStore((state) => state.open);
  const notify = useAppStore((state) => state.notify);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const publishingRef = useRef(false);
  const uploaded = useRef<{ file: File; url: string } | null>(null);
  // Retrying a failed save must not insert the same captured photo twice.
  const ids = useRef<{ story: string; moment: string } | null>(null);
  const busy = publishing || saving;

  useEffect(() => {
    if (!photo) { setPreview(""); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    const captureIds = ids.current;
    if (!photo || !captureIds || publishingRef.current) return;
    const parsed = momentSchema.safeParse({ image: "camera-capture", caption, storyPrivacy: "connections" });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Kiểm tra lại khoảnh khắc nhé."); return; }
    publishingRef.current = true;
    setPublishing(true);
    setError("");
    try {
      if (uploaded.current?.file !== photo) {
        setUploading(true);
        const url = await readImage(photo);
        uploaded.current = { file: photo, url };
        setUploading(false);
      }
      const image = uploaded.current!.url;
      let firstMoment = false;
      const day = localDay();
      await update((draft) => {
        let story = draft.stories.find((entry) => entry.userId === "me" && entry.day === day);
        firstMoment = !story?.items.length;
        if (!story) {
          story = { id: captureIds.story, userId: "me", day, privacy: parsed.data.storyPrivacy, items: [] };
          draft.stories.unshift(story);
        }
        story.privacy = "connections";
        if (!story.items.some((item) => item.id === captureIds.moment)) {
          story.items.push({ id: captureIds.moment, image, caption: parsed.data.caption, at: new Date().toISOString() });
        }
      });
      open(null);
      playInterfaceSound("success");
      notify("Đã lưu một khoảnh khắc vào ngày của bạn.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Chưa đăng được khoảnh khắc. Ảnh vẫn ở đây, bạn thử lại nhé.");
    } finally {
      publishingRef.current = false;
      setPublishing(false);
      setUploading(false);
    }
  }

  return <>
    <Modal title={photo ? "Khoảnh khắc vừa chụp" : "Chụp một chút hôm nay"} className="moment-capture-dialog" onClose={() => { if (!publishingRef.current) open(null); }}>
      {!photo ? <div className="moment-capture-body"><MomentCamera onCapture={(file) => {
        ids.current = { story: newId(), moment: newId() };
        uploaded.current = null;
        setPhoto(file);
        setError("");
      }} /></div> : <form className="moment-review-form" onSubmit={publish} aria-busy={busy}>
        <div className="moment-review-fields"><fieldset className="moment-review-controls" disabled={busy}>
          <div className="moment-photo-review">
            {preview && <img src={preview} alt="Khoảnh khắc vừa chụp, chưa đăng" />}
            <button type="button" className="moment-retake" onClick={() => { setPhoto(null); uploaded.current = null; setError(""); }}><Camera size={16} />Chụp lại</button>
          </div>
          <div className="moment-caption-field">
            <label className="field-label" htmlFor="moment-caption">Kể thêm một chút</label>
            <Input id="moment-caption" value={caption} maxLength={300} placeholder={weather ? weatherVoice(weather).caption : "Cà phê đầu ca, hay một chuyện vui vừa tới?"} onChange={(event) => setCaption(event.target.value)} />
          </div>

        </fieldset></div>
        <footer className="moment-publish-footer">
          {error && <p className="field-error" role="alert">{error}</p>}
          {uploading && <ImageUploadStatus />}
          <Button type="submit" className="full-width" disabled={busy}>{busy ? uploading ? "Đang tải ảnh…" : "Đang đăng…" : "Gửi khoảnh khắc"}</Button>
        </footer>
      </form>}
    </Modal>
  </>;
}
