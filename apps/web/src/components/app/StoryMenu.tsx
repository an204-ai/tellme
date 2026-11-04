"use client";
import { playInterfaceSound } from "@/lib/interface-sounds";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Music2, Bookmark, Flag, MoreHorizontal, ShieldOff, Trash2, Users, EyeOff } from "lucide-react";
import { useCommunity, communityKey } from "@/hooks/use-community";
import { request } from "@/lib/api-repository";
import type { DayStory, Person, Privacy } from "@/lib/types";
import { useAppStore } from "@/stores/app.store";
import { AudiencePicker, Button } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

export function StoryMenu({ story, person }: { story: DayStory; person?: Person }) {
  const { data, update, saving } = useCommunity();
  const [dialog, setDialog] = useState<"privacy" | "delete" | "report" | null>(null);
  const [privacy, setPrivacy] = useState<Privacy>(story.privacy);
  const [reason, setReason] = useState("spam");
  const [busy, setBusy] = useState(false);
  const notify = useAppStore((s) => s.notify);
  const query = useQueryClient();
  const router = useRouter();
  const action = async (task: () => Promise<unknown>, message: string, sound?: "blocked") => {
    if (data?.authenticated === false) { router.push("/auth/login?next=%2Fcommunity%2Ftoday"); return; }
    setBusy(true);
    try { await task(); if (sound) playInterfaceSound(sound); await query.invalidateQueries({ queryKey: communityKey }); await query.invalidateQueries({ queryKey: ["tellme", "stories"] }); await query.invalidateQueries({ queryKey: ["tellme", "story"] }); await query.invalidateQueries({ queryKey: ["tellme", "saved-stories"] }); await query.invalidateQueries({ queryKey: ["tellme", "archive"] }); setDialog(null); notify(message); }
    catch (error) { notify(error instanceof Error ? error.message : "Chưa lưu được thay đổi."); }
    finally { setBusy(false); }
  };
  const own = story.userId === "me";
  const saved = data?.savedStories?.includes(story.id);
  return <>
    <details className="post-menu daily-story-menu">
      <summary aria-label="Tùy chọn chuỗi khoảnh khắc"><MoreHorizontal size={21} /></summary>
      <div className="menu-panel" onClick={(event) => { const details = event.currentTarget.closest("details"); if (details) details.open = false; }}>
        <button disabled={busy} onClick={() => void action(() => request(`/stories/${story.id}/saved`, { method: "PUT", body: JSON.stringify({ saved: !saved }) }), saved ? "Đã bỏ lưu chuỗi." : "Đã lưu chuỗi vào Kho lưu trữ.")}><Bookmark size={16} /> {saved ? "Bỏ lưu chuỗi" : "Lưu vào kho lưu trữ"}</button>
        <button disabled={busy} onClick={() => void action(() => request(`/stories/${story.id}/hidden`, { method: "PUT" }), "Đã ẩn chuỗi khỏi trang của bạn. Có thể hiện lại trong Kho lưu trữ.")}><EyeOff size={16} /> Ẩn chuỗi khỏi trang của bạn</button>
        {own ? <>
          <button onClick={() => useAppStore.getState().editStoryMusic(story.id)}><Music2 size={16} /> {story.music ? "Đổi nhạc của ngày" : "Thêm nhạc của ngày"}</button>
          <button onClick={() => { setPrivacy(story.privacy); setDialog("privacy"); }}><Users size={16} /> Đổi quyền riêng tư</button>
          <button className="danger-text" onClick={() => setDialog("delete")}><Trash2 size={16} /> Xóa chuỗi khoảnh khắc</button>
        </> : <>
          <button onClick={() => setDialog("report")}><Flag size={16} /> Báo cáo</button>
          {data?.connections.includes(story.userId)
            ? <button disabled={busy} onClick={() => void action(() => update((draft) => { if (!draft.blocked.includes(story.userId)) draft.blocked.push(story.userId); }), `Đã chặn ${person?.name || "tài khoản"}.`, "blocked")}><ShieldOff size={16} /> Chặn tài khoản</button>
            : person && <button onClick={() => router.push(`/community/profile/${person.username}`)}><Users size={16} /> Tùy chọn tài khoản trên hồ sơ</button>}
        </>}
      </div>
    </details>
    {dialog === "privacy" && <Modal title="Ai có thể xem chuỗi này?" onClose={() => setDialog(null)}><form className="dialog-body story-settings-form" onSubmit={(event) => { event.preventDefault(); void action(() => request(`/stories/${story.id}/privacy`, { method: "PUT", body: JSON.stringify({ privacy }) }), "Đã cập nhật quyền riêng tư của chuỗi."); }}><AudiencePicker value={privacy} onChange={setPrivacy} /><p>Áp dụng cho cả chuỗi ngày. Lựa chọn riêng của từng ảnh vẫn được giữ.</p><Button disabled={busy || saving} type="submit">{busy ? "Đang lưu…" : "Lưu thay đổi"}</Button></form></Modal>}
    {dialog === "delete" && <Modal title="Xóa chuỗi khoảnh khắc?" onClose={() => setDialog(null)}><div className="dialog-body story-settings-form"><p>Toàn bộ {story.items.length} ảnh trong chuỗi sẽ bị xóa. Bạn không thể hoàn tác thao tác này.</p><div className="moment-edit-actions"><Button variant="secondary" disabled={busy} onClick={() => setDialog(null)}>Giữ lại</Button><Button disabled={busy} onClick={() => void action(() => request(`/stories/${story.id}`, { method: "DELETE" }), "Đã xóa chuỗi khoảnh khắc.")}>{busy ? "Đang xóa…" : "Xóa chuỗi"}</Button></div></div></Modal>}
    {dialog === "report" && <Modal title="Báo cáo chuỗi khoảnh khắc" onClose={() => setDialog(null)}><form className="dialog-body story-settings-form" onSubmit={(event) => { event.preventDefault(); void action(() => request(`/stories/${story.id}/report`, { method: "POST", body: JSON.stringify({ reason }) }), "Đã gửi báo cáo."); }}><label htmlFor={`story-report-${story.id}`}>Lý do báo cáo</label><Select id={`story-report-${story.id}`} className="select-control" value={reason} onValueChange={(value) => setReason(value)}><option value="spam">Spam hoặc nội dung lặp lại</option><option value="harassment">Quấy rối hoặc bắt nạt</option><option value="inappropriate">Nội dung không phù hợp</option><option value="other">Lý do khác</option></Select><Button type="submit" disabled={busy}>{busy ? "Đang gửi…" : "Gửi báo cáo"}</Button></form></Modal>}
  </>;
}
