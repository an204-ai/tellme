"use client";
import { playInterfaceSound } from "@/lib/interface-sounds";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, MoreHorizontal, ShieldOff } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { useAppStore } from "@/stores/app.store";
import { request } from "@/lib/api-repository";
import type { Person } from "@/lib/types";
import { Button } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

export function ProfileAccountMenu({ person }: { person: Person }) {
  const { data, update, saving } = useCommunity();
  const notify = useAppStore((state) => state.notify);
  const router = useRouter();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("spam");
  const [busy, setBusy] = useState(false);
  const reasonId = useId();
  const authenticated = () => {
    if (data?.authenticated === false) {
      router.push(`/auth/login?next=${encodeURIComponent(`/community/profile/${person.username}`)}`);
      return false;
    }
    return !!data;
  };
  return <>
    <details className="post-menu profile-account-menu">
      <summary aria-label={`Tùy chọn tài khoản ${person.name}`}><MoreHorizontal size={20} /></summary>
      <div className="menu-panel" onClick={(event) => { const menu = event.currentTarget.closest("details"); if (menu) menu.open = false; }}>
        <button disabled={saving || busy} onClick={async () => {
          if (!authenticated()) return;
          try {
            await update((draft) => { if (!draft.blocked.includes(person.id)) draft.blocked.push(person.id); });
            playInterfaceSound("blocked");
            notify(`Đã chặn ${person.name}. Bạn có thể bỏ chặn trong Cài đặt.`);
          } catch { /* useCommunity announces mutation errors. */ }
        }}><ShieldOff size={16} />Chặn tài khoản</button>
        <button disabled={busy} onClick={() => { if (authenticated()) setReporting(true); }}><Flag size={16} />Báo cáo tài khoản</button>
      </div>
    </details>
    {reporting && <Modal title="Báo cáo tài khoản" onClose={() => { if (!busy) setReporting(false); }}>
      <form className="dialog-body story-settings-form" onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
          await request(`/users/${person.id}/report`, { method: "POST", body: JSON.stringify({ reason }) });
          setReporting(false);
          notify("Đã gửi báo cáo tài khoản để xem xét.");
        } catch (error) { notify(error instanceof Error ? error.message : "Chưa gửi được báo cáo. Bạn thử lại nhé."); }
        finally { setBusy(false); }
      }}>
        <div className="profile-report-person"><strong>{person.name}</strong><span>@{person.username}</span></div>
        <label htmlFor={reasonId}>Lý do báo cáo</label>
        <Select id={reasonId} value={reason} onValueChange={setReason} disabled={busy}>
          <option value="spam">Spam hoặc làm phiền</option>
          <option value="impersonation">Giả mạo người khác</option>
          <option value="harassment">Quấy rối hoặc bắt nạt</option>
          <option value="scam">Lừa đảo</option>
          <option value="inappropriate">Nội dung không phù hợp</option>
          <option value="other">Lý do khác</option>
        </Select>
        <Button type="submit" disabled={busy}>{busy ? "Đang gửi…" : "Gửi báo cáo"}</Button>
      </form>
    </Modal>}
  </>;
}
