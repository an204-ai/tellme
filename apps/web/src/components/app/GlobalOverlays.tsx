"use client";
import { MomentComposer } from "./MomentComposer";
import { SupportModal } from "./TellmeSupport";
import { MusicOverlays } from "@/components/music/StoryMusic";
import { EmojiButton } from "@/components/ui/EmojiButton";
import { EditPersonalInfo } from "./EditPersonalInfo";
import { workplaceCopy } from "@/lib/brand";
import { useWeather } from "@/providers/WeatherProvider";
import { weatherVoice } from "@/lib/weather";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Check, ImagePlus, X } from "lucide-react";
import { useAppStore } from "@/stores/app.store";
import { useCommunity } from "@/hooks/use-community";
import { newId, readImage } from "@/lib/api-repository";
import {
  postSchema,
  profileIdentitySchema,
} from "@/lib/validation";
import type { PostInput } from "@/lib/validation";
import {
  AudiencePicker,
  Avatar,
  Button,
  IconButton,
  ImageUploadStatus,
  Input,
  Switch,
} from "@/components/ui/Primitives";
import { StoryTimeline } from "./StoryTimeline";
import { Modal } from "@/components/ui/Modal";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { PostPhoto } from "@/components/ui/PostPhoto";
import { IMAGE_ACCEPT, validateImage } from "@/lib/images";

function Composer() {
  const { fresh: weather } = useWeather();
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
  const contentInput = useRef<HTMLTextAreaElement | null>(null);
  const contentField = form.register("content");
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
      notify("Đã đăng bài viết.");
    } catch {
      /* mutation error is announced globally */
    }
  });
  return (
    <Modal title="Kể chuyện đi làm" onClose={() => open(null)}>
      <form className="dialog-body composer-form" onSubmit={onSubmit}>
        <div className="flex items-center gap-3">
          <Avatar person={data?.people.find((person) => person.id === "me")} />
          <div>
            <strong className="person-name">
              {data?.people.find((person) => person.id === "me")?.name}
            </strong>
            <p className="muted text-xs mt-1">
              Một chuyện nhỏ trong ca làm cũng được.
            </p>
          </div>
        </div>
        <textarea
          className="composer-textarea"
          aria-label="Nội dung bài viết"
          placeholder={weather ? weatherVoice(weather).feed : workplaceCopy.postPlaceholder}
          autoFocus
          {...contentField}
          ref={(node) => { contentField.ref(node); contentInput.current = node; }}
          maxLength={5000}
          rows={5}
        />
        <div className="composer-caption-tools">
          <EmojiButton label="Thêm emoji vào bài viết" onSelect={(emoji) => {
            const start = contentInput.current?.selectionStart ?? content.length;
            const end = contentInput.current?.selectionEnd ?? content.length;
            const next = content.slice(0, start) + emoji + content.slice(end);
            if (next.length > 5000) return;
            form.setValue("content", next, { shouldDirty: true, shouldValidate: true });
            requestAnimationFrame(() => { contentInput.current?.focus(); contentInput.current?.setSelectionRange(start + emoji.length, start + emoji.length); });
          }} />
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
          {uploading ? (
            <ImageUploadStatus compact />
          ) : (
            <span className="muted text-xs">Ảnh tối đa 50 MB · Có hỗ trợ HEIC</span>
          )}
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
          placeholder="Ví dụ: Chuyện đầu ca"
          {...form.register("topic")}
        />
        <div className="topic-suggestions">
          {workplaceCopy.topicSuggestions.map(
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
          {saving ? "Đang chia sẻ…" : "Đăng bài"}
        </Button>
      </form>
    </Modal>
  );
}
function EditProfile() {
  const { data, update, saving } = useCommunity();
  const open = useAppStore((state) => state.open);
  const notify = useAppStore((state) => state.notify);
  const router = useRouter();
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
    resolver: zodResolver(profileIdentitySchema),
    defaultValues: {
      username: person?.username || "",
      name: person?.name || "",
      bio: person?.bio || "",
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
            if (input.username !== person?.username)
              router.replace(`/community/profile/${input.username}`);
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
          <p>Tối đa 50 MB.</p>
          {readingImage && <ImageUploadStatus label="Đang tải ảnh đại diện và ảnh bìa lên…" />}
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
        <label className="field-label" htmlFor="profile-username">
          Tellme ID
        </label>
        <Input
          id="profile-username"
          className="tellme-id-input"
          leading={<span className="tellme-id-prefix">@</span>}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          {...form.register("username")}
        />
        <p className="profile-field-hint">
          Mọi người có thể dùng Tellme ID này để tìm bạn.
        </p>
        {form.formState.errors.username && (
          <p className="field-error" role="alert">
            {form.formState.errors.username.message}
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
  const { data } = useCommunity();
  const router = useRouter();
  const pathname = usePathname();
  const { overlay, toast, clearToast, viewedStory, viewedStoryIndex, viewedStoryMomentId } =
    useAppStore();
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, 4500);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);
  useEffect(() => {
    if (overlay && overlay !== "support" && data?.authenticated === false) {
      useAppStore.getState().open(null);
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [overlay, data?.authenticated, pathname, router]);
  return (
    <>
      {overlay === "composer" && <Composer />}
      {overlay === "moment" && <MomentComposer />}
      {overlay === "support" && <SupportModal />}
      {overlay === "edit-profile" && <EditProfile />}
      {overlay === "edit-personal" && <EditPersonalInfo />}
      {viewedStory && (
        <StoryTimeline
          key={`${viewedStory}-${viewedStoryIndex}-${viewedStoryMomentId || ""}`}
          storyId={viewedStory}
          initialIndex={viewedStoryIndex}
          initialMomentId={viewedStoryMomentId}
        />
      )}
      <MusicOverlays />
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
