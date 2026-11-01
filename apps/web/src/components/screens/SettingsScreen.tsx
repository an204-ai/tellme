"use client";
import { AccountSecurity } from "@/components/app/AccountSecurity";
import { AccountBlockPicker } from "@/components/app/AccountBlockPicker";
import { useEffect, useState } from "react";
import {
  Bell,
  LockKeyhole,
  Shield,
  SlidersHorizontal,
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
import { request } from "@/lib/api-repository";

export function SettingsScreen() {
  const { data, update } = useCommunity();
  const notify = useAppStore((state) => state.notify);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const pushAvailable = !!data?.features?.pushPublicKey && typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  useEffect(() => {
    if (!pushAvailable) return;
    void navigator.serviceWorker.getRegistration().then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      setPushEnabled(!!subscription);
    });
  }, [pushAvailable]);
  if (!data) return <Loader />;
  const toggle = async (
    key: "notifyLikes" | "notifyMessages" | "notifySystem" | "reducedMotion",
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
      <div className="settings-sections settings-layout">
        <div className="settings-column">
        <AccountSecurity />
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
        </div>
        <div className="settings-column">
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
              key: "notifySystem" as const,
              title: "Lời nhắc từ Tellme",
              text: "Nhắc nhẹ theo giờ trong ngày và khi thời tiết quanh bạn thay đổi.",
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
                checked={data.settings[setting.key] !== false}
                onChange={(checked) => toggle(setting.key, checked)}
                label={setting.title}
              />
            </div>
          ))}
          {pushAvailable && (
            <div className="setting-toggle-row">
              <div>
                <strong>Thông báo trên thiết bị</strong>
                <p>Nhận thông báo Tellme ngay cả khi bạn đang ở trang khác.</p>
              </div>
              <Switch
                checked={pushEnabled}
                disabled={pushBusy}
                onChange={async (checked) => {
                  setPushBusy(true);
                  let created: PushSubscription | undefined;
                  try {
                    const registration = await navigator.serviceWorker.register("/sw.js");
                    const current = await registration.pushManager.getSubscription();
                    if (!checked) {
                      if (current) {
                        await request("/users/me/push-subscription", { method: "DELETE", body: JSON.stringify({ endpoint: current.endpoint }) });
                        await current.unsubscribe();
                      }
                      setPushEnabled(false);
                      notify("Đã tắt thông báo trên thiết bị.");
                    } else {
                      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
                      if (permission !== "granted") throw new Error("Bạn chưa cho phép thông báo trên trình duyệt.");
                      const base64Key = data.features!.pushPublicKey!.replace(/-/g, "+").replace(/_/g, "/");
                      const key = Uint8Array.from(atob(base64Key + "=".repeat((4 - base64Key.length % 4) % 4)), (char) => char.charCodeAt(0));
                      const subscription = current || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
                      if (!current) created = subscription;
                      await request("/users/me/push-subscription", { method: "PUT", body: JSON.stringify(subscription) });
                      setPushEnabled(true);
                      notify("Đã bật thông báo trên thiết bị.");
                    }
                  } catch (error) {
                    if (created) await created.unsubscribe().catch(() => false);
                    notify(error instanceof Error ? error.message : "Chưa cập nhật được thông báo.");
                  } finally {
                    setPushBusy(false);
                  }
                }}
                label="Thông báo trên thiết bị"
              />
            </div>
          )}
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
        </div>
        <section className="settings-section settings-blocking">
          <h2>
            <Shield size={21} />
            Tài khoản đã chặn
          </h2>
          <div className="settings-blocked-list">
          {data.blocked.length ? (
            data.blocked.map((id) => {
              const person = data.people.find((entry) => entry.id === id);
              return (
                <div className="blocked-person" key={id}>
                  <Avatar person={person} size="sm" />
                  <span className="blocked-person-name"><strong>{person?.name || "Tài khoản"}</strong>{person?.username && <small>@{person.username}</small>}</span>
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
          </div>
          <AccountBlockPicker
            blocked={data.blocked}
            friends={data.connections}
            viewer={data.people.find((person) => person.id === "me")?.username}
            onBlock={async (id) => {
              await update((draft) => { if (!draft.blocked.includes(id)) draft.blocked.push(id); });
              notify("Đã chặn tài khoản.");
            }}
          />
        </section>
      </div>
    </>
  );
}
