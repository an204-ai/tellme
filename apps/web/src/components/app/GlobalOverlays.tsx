"use client";
import { FoundingWelcome } from "./FoundingWelcome";
import { MomentComposer } from "./MomentComposer";
import { SupportModal } from "./TellmeSupport";
import { MusicOverlays } from "@/components/music/StoryMusic";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Check, X } from "lucide-react";
import { useAppStore } from "@/stores/app.store";
import { useCommunity } from "@/hooks/use-community";
import { readImage } from "@/lib/api-repository";
import {
  profileSchema,
} from "@/lib/validation";
import {
  Avatar,
  Button,
  ImageUploadStatus,
  Input,
} from "@/components/ui/Primitives";
import { StoryMomentViewer } from "./StoryMomentViewer";
import { Modal } from "@/components/ui/Modal";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { IMAGE_ACCEPT, validateImage } from "@/lib/images";

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
    resolver: zodResolver(profileSchema),
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
            {cover && <img src={cover} alt="Xem trước ảnh bìa" />}
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
  const { overlay, toast, clearToast, viewedStory, viewedStoryIndex, viewedStoryMomentId, viewedStoryOrigin } =
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
      {overlay === "moment" && <MomentComposer />}
      {overlay === "support" && <SupportModal />}
      {overlay === "edit-profile" && <EditProfile />}
      {viewedStory && (
        <StoryMomentViewer
          key={`${viewedStory}-${viewedStoryIndex}-${viewedStoryMomentId || ""}`}
          storyId={viewedStory}
          initialIndex={viewedStoryIndex}
          initialMomentId={viewedStoryMomentId}
          allowMusic={viewedStoryOrigin === "today"}
        />
      )}
      <MusicOverlays />
      <FoundingWelcome />
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
