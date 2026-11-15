"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UsersRound } from "lucide-react";
import { photoGroupsKey, usePhotoGroups } from "@/hooks/use-photo-groups";
import { request } from "@/lib/api-repository";
import { Avatar, Button } from "@/components/ui/Primitives";
import { useAppStore } from "@/stores/app.store";

export function PhotoGroupInvitations({ onAccepted }: { onAccepted?: () => void }) {
  const groups = usePhotoGroups(), query = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState("");
  const items = groups.data?.invitations || [];
  if (!items.length) return null;
  const respond = async (id: string, accept: boolean) => {
    if (busy) return;
    setBusy(id); setError("");
    try {
      await request(`/photo-groups/${id}/invitations/${accept ? "accept" : "decline"}`, { method: "POST" });
      await query.invalidateQueries({ queryKey: photoGroupsKey });
      if (accept) { useAppStore.getState().notify("Đã tham gia nhóm."); onAccepted?.(); }
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  };
  return <section className="photo-group-invitations" aria-label="Lời mời nhóm ảnh">
    <h3><UsersRound size={18}/>Lời mời nhóm ảnh</h3>
    {items.map((item) => <article key={item.id} className="photo-group-invitation">
      <div className="photo-group-invitation-heading"><Avatar person={{ id: `group:${item.id}`, name: item.title, avatar: item.avatar }} size="md"/><div><strong>{item.title}</strong><small>{item.owner.name} mời bạn · {new Date(item.expiresAt).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}</small></div></div>
      <div className="photo-group-invitation-actions"><Button variant="secondary" disabled={!!busy} onClick={() => void respond(item.id, false)}>Từ chối</Button><Button disabled={!!busy} onClick={() => void respond(item.id, true)}>{busy === item.id ? "Đang xử lý…" : "Tham gia"}</Button></div>
    </article>)}
    {error && <p className="field-error" role="alert">{error}</p>}
  </section>;
}
