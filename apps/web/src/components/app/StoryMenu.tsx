"use client";
import { playInterfaceSound } from "@/lib/interface-sounds";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Music2, Flag, MoreHorizontal, Pencil, ShieldOff, Trash2, Users } from "lucide-react";
import { useCommunity, communityKey } from "@/hooks/use-community";
import { request } from "@/lib/api-repository";
import type { DayStory, MomentItem, Person } from "@/lib/types";
import { useAppStore } from "@/stores/app.store";
import { Button } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

export function StoryMenu({ story, person, item, allowMusic = false }: { story: DayStory; person?: Person; item?: MomentItem; allowMusic?: boolean }) {
  const { data, update, saving } = useCommunity();
  const [dialog, setDialog] = useState<"report" | "edit" | "delete-moment" | null>(null);
  const [caption, setCaption] = useState("");
  const [reason, setReason] = useState("spam");
  const [busy, setBusy] = useState(false);
  const notify = useAppStore((s) => s.notify);
  const query = useQueryClient();
  const router = useRouter();
  const action = async (task: () => Promise<unknown>, message: string, sound?: "blocked") => {
    if (data?.authenticated === false) { router.push("/auth/login?next=%2Fcommunity%2Ftoday"); return; }
    setBusy(true);
    try { await task(); if (sound) playInterfaceSound(sound); await query.invalidateQueries({ queryKey: communityKey }); await query.invalidateQueries({ queryKey: ["tellme", "stories"] }); await query.invalidateQueries({ queryKey: ["tellme", "story"] }); setDialog(null); notify(message); }
    catch (error) { notify(error instanceof Error ? error.message : "Chưa lưu được thay đổi."); }
    finally { setBusy(false); }
  };
  const own = story.userId === "me";
  return <>
    <details className="content-menu daily-story-menu">
      <summary aria-label={item ? "Tùy chọn khoảnh khắc" : "Tùy chọn chuỗi khoảnh khắc"}><MoreHorizontal size={21} /></summary>
      <div className="menu-panel" onClick={(event) => { const details = event.currentTarget.closest("details"); if (details) details.open = false; }}>
        {own ? <>
          {item && <>
            <button onClick={() => { setCaption(item.caption); setDialog("edit"); }}><Pencil size={16} /> Chỉnh sửa khoảnh khắc</button>
            <button className="danger-text" onClick={() => setDialog("delete-moment")}><Trash2 size={16} /> Xóa khoảnh khắc này</button>
          </>}
          {allowMusic && <button onClick={() => useAppStore.getState().editStoryMusic(story.id)}><Music2 size={16} /> {story.music ? "Đổi nhạc của ngày" : "Thêm nhạc của ngày"}</button>}
        </> : <>
          <button onClick={() => setDialog("report")}><Flag size={16} /> Báo cáo</button>
          {data?.connections.includes(story.userId)
            ? <button disabled={busy} onClick={() => void action(() => update((draft) => { if (!draft.blocked.includes(story.userId)) draft.blocked.push(story.userId); }), `Đã chặn ${person?.name || "tài khoản"}.`, "blocked")}><ShieldOff size={16} /> Chặn tài khoản</button>
            : person && <button onClick={() => router.push(`/community/profile/${person.username}`)}><Users size={16} /> Tùy chọn tài khoản trên hồ sơ</button>}
        </>}
      </div>
    </details>
    {dialog === "edit" && item && <Modal title="Chỉnh sửa khoảnh khắc" onClose={() => { if (!busy) setDialog(null); }} className="moment-edit-dialog">
      <img className="moment-edit-preview" src={item.image} alt="Khoảnh khắc đang chỉnh sửa" />
      <form className="dialog-body story-settings-form" onSubmit={(event) => { event.preventDefault(); void action(() => request(`/stories/${story.id}/moments/${item.id}`, { method: "PATCH", body: JSON.stringify({ caption: caption.trim() }) }), "Đã cập nhật khoảnh khắc."); }}>
        <label htmlFor={`moment-caption-${item.id}`}>Chú thích của khoảnh khắc</label>
        <textarea className="standard-textarea" id={`moment-caption-${item.id}`} value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={300} disabled={busy} />
        <Button type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</Button>
      </form>
    </Modal>}
    {dialog === "delete-moment" && item && <Modal title="Xóa khoảnh khắc này?" onClose={() => { if (!busy) setDialog(null); }}>
      <div className="dialog-body story-settings-form"><p>Ảnh sẽ bị gỡ khỏi chuỗi ngày của bạn.</p><div className="moment-edit-actions">
        <Button variant="secondary" disabled={busy} onClick={() => setDialog(null)}>Giữ lại</Button>
        <Button disabled={busy} onClick={() => void action(async () => { await request(`/stories/${story.id}/moments/${item.id}`, { method: "DELETE" }); if (story.items.length === 1) useAppStore.getState().viewStory(null); }, "Đã xóa khoảnh khắc.")}>{busy ? "Đang xóa…" : "Xóa ảnh"}</Button>
      </div></div>
    </Modal>}
    {dialog === "report" && <Modal title="Báo cáo chuỗi khoảnh khắc" onClose={() => setDialog(null)}><form className="dialog-body story-settings-form" onSubmit={(event) => { event.preventDefault(); void action(() => request(`/stories/${story.id}/report`, { method: "POST", body: JSON.stringify({ reason }) }), "Đã gửi báo cáo."); }}><label htmlFor={`story-report-${story.id}`}>Lý do báo cáo</label><Select id={`story-report-${story.id}`} className="select-control" value={reason} onValueChange={(value) => setReason(value)}><option value="spam">Spam hoặc nội dung lặp lại</option><option value="harassment">Quấy rối hoặc bắt nạt</option><option value="inappropriate">Nội dung không phù hợp</option><option value="other">Lý do khác</option></Select><Button type="submit" disabled={busy}>{busy ? "Đang gửi…" : "Gửi báo cáo"}</Button></form></Modal>}
  </>;
}
