"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Check, ImagePlus, Plus, X } from "lucide-react";
import { useAppStore } from "@/stores/app.store";
import { useCommunity } from "@/hooks/use-community";
import { newId, readImage } from "@/lib/api-repository";
import {
  localDay,
  momentSchema,
  postSchema,
  profileSchema,
} from "@/lib/validation";
import type { PostInput } from "@/lib/validation";
import type { Privacy } from "@/lib/types";
import {
  AudiencePicker,
  Avatar,
  Button,
  IconButton,
  Input,
  Switch,
} from "@/components/ui/Primitives";
import { StoryTimeline } from "./StoryTimeline";
import { Modal } from "@/components/ui/Modal";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { PostPhoto } from "@/components/ui/PostPhoto";
import { IMAGE_ACCEPT, IMAGE_FORMAT_HINT, validateImage } from "@/lib/images";

function Composer() {
  const { data, update, saving } = useCommunity();
  const open = useAppStore((state) => state.open);
  const notify = useAppStore((state) => state.notify);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const form = useForm<PostInput>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: "",
      image: "",
      topic: "",
      privacy: data?.settings.audience || "public",
      anonymous: false,
    },
  });
  const image = form.watch("image");
  const privacy = form.watch("privacy");
  const content = form.watch("content");
  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await update((draft) => {
        draft.posts.unshift({
          id: newId(),
          authorId: "me",
          ...input,
          createdAt: new Date().toISOString(),
          likes: 0,
          reaction: null,
          comments: [],
          saved: false,
          shares: 0,
        });
      });
      open(null);
      notify("Câu chuyện của bạn đã được chia sẻ.");
    } catch {
      /* mutation error is announced globally */
    }
  });
  return (
    <Modal title="Kể một câu chuyện" onClose={() => open(null)}>
      <form className="dialog-body composer-form" onSubmit={onSubmit}>
        <div className="flex items-center gap-3">
          <Avatar person={data?.people.find((person) => person.id === "me")} />
          <div>
            <strong className="person-name">
              {data?.people.find((person) => person.id === "me")?.name}
            </strong>
            <p className="muted text-xs mt-1">
              Câu chuyện của bạn luôn có người lắng nghe.
            </p>
          </div>
        </div>
        <textarea
          className="composer-textarea"
          aria-label="Nội dung bài viết"
          placeholder="Hôm nay của bạn thế nào?"
          autoFocus
          {...form.register("content")}
          maxLength={5000}
          rows={5}
        />
        <div className="flex justify-between gap-3">
          <span className="field-error" role="alert">
            {form.formState.errors.content?.message}
          </span>
          <span className="muted text-xs shrink-0">{content.length}/5.000</span>
        </div>
        {image && (
          <div className="upload-preview">
            <PostPhoto src={image} alt="Ảnh sẽ đính kèm bài viết" preview />
            <IconButton
              label="Bỏ ảnh đính kèm"
              onClick={() => form.setValue("image", "")}
            >
              <X size={18} />
            </IconButton>
          </div>
        )}
        <div className="composer-tools">
          <label className="upload-label">
            <ImagePlus size={20} />
            <span>Thêm ảnh</span>
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              disabled={uploading || saving}
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  form.setValue("image", await readImage(file));
                  setUploadError("");
                } catch (error) {
                  setUploadError((error as Error).message);
                } finally {
                  setUploading(false);
                }
                event.target.value = "";
              }}
            />
          </label>
          <span className="muted text-xs" role={uploading ? "status" : undefined}>{uploading ? "Đang tải ảnh…" : "Ảnh tối đa 50 MB · Có hỗ trợ HEIC"}</span>
        </div>
        {uploadError && (
          <p className="field-error" role="alert">
            {uploadError}
          </p>
        )}
        <label className="field-label" htmlFor="post-topic">
          Chủ đề <span className="muted font-normal">· Không bắt buộc</span>
        </label>
        <Input
          id="post-topic"
          placeholder="Một chủ đề của riêng bạn…"
          {...form.register("topic")}
        />
        <div className="topic-suggestions">
          {["Chuyện mỗi ngày", "Điều nhỏ bé", "Những chuyến đi"].map(
            (topic) => (
              <button
                type="button"
                key={topic}
                onClick={() => form.setValue("topic", topic)}
              >
                #{topic}
              </button>
            ),
          )}
        </div>
        {form.formState.errors.topic && (
          <p className="field-error">{form.formState.errors.topic.message}</p>
        )}
        <AudiencePicker
          value={privacy}
          onChange={(value) => form.setValue("privacy", value)}
        />
        <div className="setting-toggle-row">
          <div>
            <span className="field-label">Đăng ẩn danh</span>
            <p className="muted text-xs">Ẩn tên hiển thị trên bài viết.</p>
          </div>
          <Switch
            checked={form.watch("anonymous")}
            onChange={(checked) => form.setValue("anonymous", checked)}
            label="Đăng ẩn danh"
          />
        </div>
        <Button type="submit" className="full-width" disabled={saving || uploading}>
          {saving ? "Đang chia sẻ…" : "Chia sẻ câu chuyện"}
        </Button>
      </form>
    </Modal>
  );
}
function MomentComposer() {
  const { update, data, saving } = useCommunity();
  const open = useAppStore((state) => state.open);
  const notify = useAppStore((state) => state.notify);
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>(
    data?.stories.find(
      (story) => story.userId === "me" && story.day === localDay(),
    )?.privacy ||
      data?.settings.audience ||
      "public",
  );
  const [error, setError] = useState("");
  return (
    <Modal title="Thêm vào Chuyện hôm nay" onClose={() => open(null)}>
      <form
        className="dialog-body"
        onSubmit={async (event) => {
          event.preventDefault();
          const parsed = momentSchema.safeParse({ image, caption, privacy });
          if (!parsed.success) {
            setError(
              parsed.error.issues[0]?.message || "Kiểm tra lại khoảnh khắc.",
            );
            return;
          }
          try {
            await update((draft) => {
              const day = localDay();
              let story = draft.stories.find(
                (entry) => entry.userId === "me" && entry.day === day,
              );
              if (!story) {
                story = { id: newId(), userId: "me", day, privacy, items: [] };
                draft.stories.unshift(story);
              }
              story.privacy = privacy;
              story.items.push({
                id: newId(),
                image,
                caption: parsed.data.caption,
                at: new Date().toISOString(),
              });
            });
            open(null);
            notify("Đã thêm khoảnh khắc vào chuỗi hôm nay.");
          } catch {
            /* mutation handles the error */
          }
        }}
      >
        <p className="muted text-sm">
          Thêm từng khoảnh khắc, kể trọn một ngày. Chuỗi ảnh được lưu lại trên
          hồ sơ của bạn.
        </p>
        <label className={`moment-upload ${image ? "has-image" : ""}`}>
          {image ? (
            <img src={image} alt="Khoảnh khắc đã chọn" />
          ) : (
            <>
              <Camera size={34} />
              <strong>Chọn một bức ảnh</strong>
              <span>{IMAGE_FORMAT_HINT}</span>
            </>
          )}
          <input
            type="file"
            className="sr-only"
            accept={IMAGE_ACCEPT}
            disabled={saving || uploading}
            aria-label="Chọn ảnh cho Chuyện hôm nay"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                setImage(await readImage(file));
                setError("");
              } catch (failure) {
                setError((failure as Error).message);
              } finally {
                setUploading(false);
              }
              event.target.value = "";
            }}
          />
        </label>
        <label htmlFor="moment-caption" className="field-label">
          Một lời chú thích
        </label>
        <Input
          id="moment-caption"
          placeholder="Khoảnh khắc này có gì đặc biệt?"
          value={caption}
          maxLength={300}
          onChange={(event) => setCaption(event.target.value)}
        />
        <AudiencePicker value={privacy} onChange={setPrivacy} />
        <p className="muted text-xs">
          Đối tượng xem áp dụng cho toàn bộ chuỗi hôm nay.
        </p>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        {uploading && <p role="status">Đang tải ảnh…</p>}
        <Button className="full-width" type="submit" disabled={saving || uploading}>
          <Plus size={17} />
          {saving ? "Đang lưu…" : "Lưu khoảnh khắc"}
        </Button>
      </form>
    </Modal>
  );
}
function EditProfile() {
  const { data, update, saving } = useCommunity();
  const open = useAppStore((state) => state.open);
  const notify = useAppStore((state) => state.notify);
  const person = data?.people.find((entry) => entry.id === "me");
  const [avatar, setAvatar] = useState(person?.avatar || "");
  const [cover, setCover] = useState(person?.cover || "");
  const [imageError, setImageError] = useState("");
  const [readingImage, setReadingImage] = useState(false);
  const [crop, setCrop] = useState<{ file: File; kind: "avatar" | "cover" } | null>(null);
  const selectImage = (
    file: File | undefined,
    kind: "avatar" | "cover",
  ) => {
    if (!file) return;
    setImageError("");
    try {
      validateImage(file);
      setCrop({ file, kind });
    } catch (error) {
      setImageError((error as Error).message);
    }
  };
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: person?.name || "",
      bio: person?.bio || "",
      location: person?.location || "",
    },
  });
  return <>
    <Modal
      title="Chỉnh sửa hồ sơ"
      onClose={() => open(null)}
      className="edit-profile-dialog"
    >
      <form
        className="dialog-body"
        onSubmit={form.handleSubmit(async (input) => {
          try {
            await update((draft) => {
              const me = draft.people.find((entry) => entry.id === "me");
              if (me) Object.assign(me, input, { avatar, cover });
            });
            open(null);
            notify("Đã cập nhật hồ sơ.");
          } catch {
            /* The mutation error is announced by useCommunity. */
          }
        })}
      >
        <div className="profile-media-editor">
          <div className="profile-cover-preview">
            <img src={cover} alt="Xem trước ảnh bìa" />
            <label className="profile-image-upload">
              <Camera size={17} />
              <span>Đổi ảnh bìa</span>
              <input
                className="profile-file-input"
                type="file"
                accept={IMAGE_ACCEPT}
                aria-label="Tải ảnh bìa"
                disabled={readingImage || saving}
                onChange={(event) => {
                  void selectImage(event.target.files?.[0], "cover");
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="profile-avatar-editor">
            <Avatar
              person={person ? { ...person, avatar } : undefined}
              size="xl"
            />
            <label className="profile-image-upload avatar-upload">
              <Camera size={17} />
              <span>Đổi avatar</span>
              <input
                className="profile-file-input"
                type="file"
                accept={IMAGE_ACCEPT}
                aria-label="Tải ảnh đại diện"
                disabled={readingImage || saving}
                onChange={(event) => {
                  void selectImage(event.target.files?.[0], "avatar");
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          <p>{IMAGE_FORMAT_HINT}. Căn chỉnh ảnh trước khi tải lên.</p>
          {readingImage && <p role="status">Đang tải ảnh…</p>}
          {imageError && (
            <p className="field-error" role="alert">
              {imageError}
            </p>
          )}
        </div>
        <label className="field-label" htmlFor="profile-name">
          Tên hiển thị
        </label>
        <Input id="profile-name" {...form.register("name")} autoFocus />
        {form.formState.errors.name && (
          <p className="field-error" role="alert">
            {form.formState.errors.name.message}
          </p>
        )}
        <label className="field-label" htmlFor="profile-bio">
          Giới thiệu
        </label>
        <textarea
          id="profile-bio"
          className="standard-textarea"
          rows={3}
          {...form.register("bio")}
          maxLength={200}
        />
        {form.formState.errors.bio && (
          <p className="field-error" role="alert">
            {form.formState.errors.bio.message}
          </p>
        )}
        <label className="field-label" htmlFor="profile-location">
          Địa điểm
        </label>
        <Input id="profile-location" {...form.register("location")} />
        <Button
          type="submit"
          className="full-width"
          disabled={saving || readingImage}
        >
          Lưu thay đổi
        </Button>
      </form>
    </Modal>
    {crop && <ImageCropper file={crop.file} kind={crop.kind} onCancel={() => setCrop(null)}
      onConfirm={async (file) => {
        setReadingImage(true);
        try {
          const image = await readImage(file);
          if (crop.kind === "avatar") setAvatar(image);
          else setCover(image);
          setCrop(null);
        } finally { setReadingImage(false); }
      }} />}
  </>;
}
export function GlobalOverlays() {
  const { overlay, toast, clearToast, viewedStory, viewedStoryIndex, viewedStoryMomentId } =
    useAppStore();
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, 4500);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);
  return (
    <>
      {overlay === "composer" && <Composer />}
      {overlay === "moment" && <MomentComposer />}
      {overlay === "edit-profile" && <EditProfile />}
      {viewedStory && (
        <StoryTimeline
          key={`${viewedStory}-${viewedStoryIndex}-${viewedStoryMomentId || ""}`}
          storyId={viewedStory}
          initialIndex={viewedStoryIndex}
          initialMomentId={viewedStoryMomentId}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={clearToast}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
