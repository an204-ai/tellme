"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, ChevronRight, Music2, ShieldCheck } from "lucide-react";
import { MusicPicker } from "@/components/music/MusicPicker";
import { MomentCamera } from "@/components/ui/MomentCamera";
import { Modal } from "@/components/ui/Modal";
import { AudiencePicker, Button, ImageUploadStatus, Input } from "@/components/ui/Primitives";
import { Select } from "@/components/ui/Select";
import { useCommunity } from "@/hooks/use-community";
import { newId, readImage } from "@/lib/api-repository";
import type { Privacy, StoryMusic } from "@/lib/types";
import { localDay, momentSchema } from "@/lib/validation";
import { weatherVoice } from "@/lib/weather";
import { useWeather } from "@/providers/WeatherProvider";
import { useAppStore } from "@/stores/app.store";

const audienceLabel: Record<Privacy, string> = { public: "Công khai", connections: "Bạn bè", private: "Chỉ mình tôi" };

export function MomentComposer() {
  const { fresh: weather } = useWeather();
  const { data, update, saving } = useCommunity();
  const open = useAppStore((state) => state.open);
  const notify = useAppStore((state) => state.notify);
  const todayStory = data?.stories.find((entry) => entry.userId === "me" && entry.day === localDay());
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState<StoryMusic>();
  const [musicOpen, setMusicOpen] = useState(false);
  const [storyPrivacy, setStoryPrivacy] = useState<Privacy>(todayStory?.privacy || data?.settings.audience || "public");
  const [momentPrivacy, setMomentPrivacy] = useState<Privacy | "inherit">("inherit");
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const publishingRef = useRef(false);
  const uploaded = useRef<{ file: File; url: string } | null>(null);
  // Retrying a failed save must not insert the same captured photo twice.
  const ids = useRef<{ story: string; moment: string } | null>(null);
  const busy = publishing || saving;
  const privacyOrder: Privacy[] = ["public", "connections", "private"];
  const effectivePrivacy = momentPrivacy === "inherit" ? storyPrivacy : privacyOrder[Math.max(privacyOrder.indexOf(storyPrivacy), privacyOrder.indexOf(momentPrivacy))]!;

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
    const parsed = momentSchema.safeParse({ image: "camera-capture", caption, storyPrivacy, ...(momentPrivacy === "inherit" ? {} : { privacy: momentPrivacy }) });
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
      const result = await update((draft) => {
        let story = draft.stories.find((entry) => entry.userId === "me" && entry.day === day);
        firstMoment = !story?.items.length;
        if (!story) {
          story = { id: captureIds.story, userId: "me", day, privacy: parsed.data.storyPrivacy, items: [], ...(music ? { music } : {}) };
          draft.stories.unshift(story);
        }
        story.privacy = parsed.data.storyPrivacy;
        if (!story.items.some((item) => item.id === captureIds.moment)) {
          story.items.push({ id: captureIds.moment, image, caption: parsed.data.caption, at: new Date().toISOString(), ...(parsed.data.privacy ? { privacy: parsed.data.privacy } : {}) });
        }
      });
      const saved = result.stories.find((entry) => entry.userId === "me" && entry.day === day);
      const invite = firstMoment && saved && !saved.music;
      if (invite) { useAppStore.getState().clearToast(); useAppStore.getState().inviteMusic(saved.id); }
      open(null);
      if (!invite) notify("Đã lưu một khoảnh khắc vào ngày của bạn.");
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
          <div className="moment-music-field">
            <button type="button" className="moment-music-button" onClick={() => todayStory ? useAppStore.getState().editStoryMusic(todayStory.id) : setMusicOpen(true)}>
              <Music2 size={18} /><span><strong>{(todayStory?.music || music)?.title || "Thêm nhạc"}</strong><small>{todayStory?.music || music ? "Cả chuỗi chung một giai điệu" : "Giai điệu cho ngày đi làm."}</small></span><ChevronRight size={16} className="moment-music-chevron" />
            </button>
          </div>
          <details className="moment-privacy-details">
            <summary><ShieldCheck size={18} /><span>Ai được xem? <strong>{audienceLabel[effectivePrivacy]}</strong></span><ChevronDown size={16} /></summary>
            <div className="moment-audience-fields">
              <div><span className="field-label">Toàn bộ chuỗi hôm nay</span><AudiencePicker value={storyPrivacy} onChange={setStoryPrivacy} /><p>Quyền này áp dụng cho mọi khoảnh khắc trong ngày.</p></div>
              <div><label className="field-label" htmlFor="moment-item-privacy">Riêng ảnh vừa chụp</label><Select id="moment-item-privacy" value={momentPrivacy} onValueChange={(value) => setMomentPrivacy(value as Privacy | "inherit")}>
                <option value="inherit">Theo quyền riêng tư của chuỗi</option><option value="public">Riêng ảnh này · Công khai</option><option value="connections">Riêng ảnh này · Bạn bè</option><option value="private">Riêng ảnh này · Chỉ mình tôi</option>
              </Select><p>Ảnh chỉ hiện khi người xem được phép xem cả chuỗi và ảnh này.</p></div>
            </div>
          </details>
        </fieldset></div>
        <footer className="moment-publish-footer">
          {error && <p className="field-error" role="alert">{error}</p>}
          {uploading && <ImageUploadStatus />}
          <Button type="submit" className="full-width" disabled={busy}>{busy ? uploading ? "Đang tải ảnh…" : "Đang đăng…" : "Đăng khoảnh khắc"}</Button>
        </footer>
      </form>}
    </Modal>
    {musicOpen && <MusicPicker selected={music} onClose={() => setMusicOpen(false)} onSelect={setMusic} onRemove={music ? () => setMusic(undefined) : undefined} />}
  </>;
}
