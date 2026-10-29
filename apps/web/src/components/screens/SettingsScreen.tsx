"use client";
import {
  Bell,
  LockKeyhole,
  Shield,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { useAppStore } from "@/stores/app.store";
import {
  AudiencePicker,
  Avatar,
  Button,
  Loader,
  Switch,
} from "@/components/ui/Primitives";

export function SettingsScreen() {
  const { data, update } = useCommunity();
  const notify = useAppStore((state) => state.notify);
  if (!data) return <Loader />;
  const toggle = async (
    key: "notifyLikes" | "notifyMessages" | "emailUpdates" | "reducedMotion",
    checked: boolean,
  ) => {
    try {
      await update((draft) => {
        draft.settings[key] = checked;
      });
      notify("Đã lưu tùy chọn.");
    } catch {
      /* The mutation error is announced by useCommunity. */
    }
  };
  return (
    <>
      <header className="page-heading social-page-title">
        <h1>Không gian của bạn, cách của bạn.</h1>
        <p>Chọn điều bạn chia sẻ và cách bạn muốn kết nối.</p>
      </header>
      <div className="settings-sections">
        <section className="settings-section">
          <h2>
            <LockKeyhole size={21} />
            Quyền riêng tư
          </h2>
          <p className="muted text-sm">
            Đối tượng xem mặc định cho bài viết và chuỗi ảnh mới. Bạn vẫn có thể
            đổi khi đăng.
          </p>
          <AudiencePicker
            value={data.settings.audience}
            onChange={async (audience) => {
              try {
                await update((draft) => {
                  draft.settings.audience = audience;
                });
                notify("Đã lưu đối tượng xem mặc định.");
              } catch {
                /* The mutation error is announced by useCommunity. */
              }
            }}
          />
        </section>
        <section className="settings-section">
          <h2>
            <Bell size={21} />
            Thông báo
          </h2>
          {[
            {
              key: "notifyLikes" as const,
              title: "Tương tác trên câu chuyện",
              text: "Ghi nhớ tùy chọn về lượt thích và bình luận.",
            },
            {
              key: "notifyMessages" as const,
              title: "Tin nhắn mới",
              text: "Ghi nhớ tùy chọn thông báo tin nhắn.",
            },
          ].map((setting) => (
            <div className="setting-toggle-row" key={setting.key}>
              <div>
                <strong>{setting.title}</strong>
                <p>{setting.text}</p>
              </div>
              <Switch
                checked={data.settings[setting.key]}
                onChange={(checked) => toggle(setting.key, checked)}
                label={setting.title}
              />
            </div>
          ))}
        </section>
        <section className="settings-section">
          <h2>
            <SlidersHorizontal size={21} />
            Trải nghiệm
          </h2>
          <div className="setting-toggle-row">
            <div>
              <strong>Giảm chuyển động</strong>
              <p>Hạn chế animation trong giao diện.</p>
            </div>
            <Switch
              checked={data.settings.reducedMotion}
              onChange={(checked) => toggle("reducedMotion", checked)}
              label="Giảm chuyển động"
            />
          </div>
        </section>
        <section className="settings-section">
          <h2>
            <Shield size={21} />
            Nội dung và tài khoản
          </h2>
          <div className="setting-toggle-row">
            <div>
              <strong>Bài viết đã ẩn</strong>
              <p>
                {data.hiddenPosts.length} bài viết · {data.reports.length} báo
                cáo đã ghi nhận.
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={data.hiddenPosts.length === 0}
              onClick={async () => {
                try {
                  await update((draft) => {
                    draft.hiddenPosts = [];
                  });
                  notify("Các bài viết đã xuất hiện trở lại.");
                } catch {
                  /* The mutation error is announced by useCommunity. */
                }
              }}
            >
              <Undo2 size={15} />
              Khôi phục
            </Button>
          </div>
          <h3 className="field-label mt-5">Tài khoản đã chặn</h3>
          {data.blocked.length ? (
            data.blocked.map((id) => {
              const person = data.people.find((entry) => entry.id === id);
              return (
                <div className="blocked-person" key={id}>
                  <Avatar person={person} size="sm" />
                  <span>{person?.name}</span>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void update((draft) => {
                        draft.blocked = draft.blocked.filter(
                          (entry) => entry !== id,
                        );
                      }).catch(() => undefined)
                    }
                  >
                    Bỏ chặn
                  </Button>
                </div>
              );
            })
          ) : (
            <p className="muted text-sm mt-2">Bạn chưa chặn tài khoản nào.</p>
          )}
          <label className="field-label mt-5" htmlFor="block-person">
            Chặn một tài khoản
          </label>
          <select
            id="block-person"
            className="standard-select mt-2"
            value=""
            onChange={async (event) => {
              try {
                const id = event.target.value;
                if (id) {
                  await update((draft) => {
                    draft.blocked.push(id);
                  });
                  notify("Đã chặn tài khoản.");
                }
              } catch {
                /* The mutation error is announced by useCommunity. */
              }
            }}
          >
            <option value="">Chọn tài khoản…</option>
            {data.people
              .filter(
                (person) =>
                  person.id !== "me" && !data.blocked.includes(person.id),
              )
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
          </select>
        </section>
      </div>
    </>
  );
}
