"use client";
import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, Images, Plus, Search, Send, Trash2, LogOut, X, Upload, UserPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { canPostToPhotoGroup, photoGroupIsActive, PHOTO_GROUP_DAYS } from "@tellme/shared/photo-groups";
import { useCommunity } from "@/hooks/use-community";
import { photoGroupsKey, usePhotoGroups } from "@/hooks/use-photo-groups";
import { useAppStore } from "@/stores/app.store";
import { newId, request, readImage } from "@/lib/api-repository";
import { DEFAULT_GROUP_AVATAR, groupAvatarPresets } from "@/lib/social-assets";
import { Avatar, Button, Loader } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { PhotoGroupInvitations } from "./PhotoGroupInvitations";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { IMAGE_ACCEPT, validateImage } from "@/lib/images";
import { useSurfaceArrival } from "@/components/ui/SurfaceTransition";
import type { PhotoGroup } from "@/lib/types";

const groupStatus = (group: PhotoGroup) => group.endedAt ? "Đã hủy" : !photoGroupIsActive(group) ? "Đã kết thúc" : !group.canPost ? group.isJoined ? "Không thể đăng vào nhóm" : "Bạn đã rời nhóm" : `Đến ${new Date(group.expiresAt!).toLocaleString("vi-VN", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}`;
const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();

export function PhotoGroupsDialog({ onClose, onChoose, initialGroup, createFirst = false }: { onClose: () => void; onChoose?: (id: string | null) => void; initialGroup?: PhotoGroup; createFirst?: boolean }) {
  const groups = usePhotoGroups(), { data } = useCommunity(), query = useQueryClient(), router = useRouter();
  const current = groups.data?.items.find((group) => photoGroupIsActive(group) && (group.isJoined || group.canPost));
  const [mode, setMode] = useState<"list" | "create" | "detail" | "invite">(initialGroup ? "detail" : createFirst ? "create" : "list");
  const [selectedId, setSelectedId] = useState(initialGroup?.id);
  const selected = groups.data?.items.find((group) => group.id === selectedId) || initialGroup;
  const [crop, setCrop] = useState<File | null>(null);
  const [avatarTarget, setAvatarTarget] = useState<"create" | "detail">("create");
  const [step, setStep] = useState<"info" | "members" | "avatar">("info");
  const [title, setTitle] = useState(""), [avatar, setAvatar] = useState(DEFAULT_GROUP_AVATAR), [members, setMembers] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState<1 | 3 | 7>(1), [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [confirmEnd, setConfirmEnd] = useState(false);
  const id = useRef(newId()), body = useRef<HTMLDivElement>(null);
  useSurfaceArrival(body, `${mode}:${step}:${confirmEnd}`);
  const friends = data?.people.filter((p) => data.connections.includes(p.id) && !data.blocked.includes(p.id)) || [];
  const suggestions = useMemo(() => search.trim() ? friends.filter((p) => !members.includes(p.id) && (mode !== "invite" || ![...(selected?.memberIds || []), ...(selected?.pendingMembers || []).map((p) => p.id)].includes(p.id)) && fold(`${p.name} ${p.username}`).includes(fold(search.trim().replace(/^@/, "")))).slice(0, 8) : [], [friends, members, search, mode, selected]);
  const choose = (groupId: string) => {
    if (onChoose) onChoose(groupId);
    else { useAppStore.getState().setPhotoDestination(groupId); useAppStore.getState().setMomentView("photos"); router.push("/community/today"); }
    onClose();
  };
  const create = async () => {
    if (busy || !members.length || (mode !== "invite" && (!title.trim() || current))) return;
    setBusy(true); setError("");
    try {
      if (mode === "invite" && selected) {
        await request(`/photo-groups/${selected.id}/invitations`, { method: "POST", body: JSON.stringify({ memberIds: members }) });
        await query.invalidateQueries({ queryKey: photoGroupsKey });
        setMembers([]); setSearch(""); setMode("detail"); return;
      }
      await request("/photo-groups", { method: "POST", body: JSON.stringify({ id: id.current, title: title.trim(), avatar, memberIds: members, durationDays }) });
      await query.invalidateQueries({ queryKey: photoGroupsKey });
      choose(id.current);
    } catch (e) { setError(e instanceof Error ? e.message : "Chưa tạo được nhóm. Thử lại nhé."); }
    finally { setBusy(false); }
  };
  const end = async () => {
    if (!selected || busy) return;
    setBusy(true); setError("");
    try {
      await request(`/photo-groups/${selected.id}/${selected.ownerId === "me" ? "end" : "leave"}`, { method: "POST" });
      await query.invalidateQueries({ queryKey: photoGroupsKey });
      setConfirmEnd(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Chưa kết thúc được nhóm. Thử lại nhé."); }
    finally { setBusy(false); }
  };
  const back = () => { setError(""); setConfirmEnd(false); if (mode === "invite") { setMode("detail"); setStep("info"); } else if (mode === "detail" && step === "avatar") setStep("info"); else if (mode === "create" && step !== "info") setStep("info"); else setMode("list"); };
  const showGroup = (group: PhotoGroup) => { setStep("info"); setSelectedId(group.id); setMode("detail"); setError(""); };
  const saveAvatar = async (url: string) => {
    if (avatarTarget === "create") { setAvatar(url); setStep("info"); return; }
    if (!selected) return;
    await request(`/photo-groups/${selected.id}/avatar`, { method: "PATCH", body: JSON.stringify({ avatar: url }) });
    await query.invalidateQueries({ queryKey: photoGroupsKey });
    setStep("info");
  };
  const avatarChoices = <><div className="group-avatar-presets">{groupAvatarPresets.map((preset) => <button key={preset.id} type="button" disabled={busy} aria-label={preset.label} aria-pressed={(avatarTarget === "create" ? avatar : selected?.avatar) === preset.image} onClick={() => { setError(""); setBusy(true); void saveAvatar(preset.image).catch((e) => setError(e.message)).finally(() => setBusy(false)); }}><Image src={preset.image} alt="" width={64} height={64} /></button>)}</div><label className="photo-group-upload glass-action"><Upload size={18}/><span>Tải ảnh lên</span><input type="file" accept={IMAGE_ACCEPT} aria-label="Tải ảnh đại diện nhóm" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; try { validateImage(file); setCrop(file); } catch (e) { setError((e as Error).message); } }}/></label></>;
  return <><Modal fitViewport closeDisabled={busy || !!crop} leading={mode === "detail" ? <button type="button" className="photo-group-header-back glass-control" aria-label="Nhóm ảnh" disabled={busy} onClick={back}><ArrowLeft size={20} /></button> : undefined} title={mode === "invite" ? "Mời bạn" : mode === "create" && !current ? step === "avatar" ? "Ảnh nhóm" : step === "members" ? "Mời bạn" : "Tạo nhóm ảnh" : mode === "detail" ? selected?.title || "Nhóm ảnh" : "Nhóm ảnh"} className={`photo-groups-dialog ${mode === "invite" ? "photo-group-wizard is-members" : mode === "create" && !current ? `photo-group-wizard is-${step}` : mode === "detail" ? "is-detail" : ""} ${error ? "has-form-error" : ""}`} onClose={() => { if (!busy) onClose(); }}>
    <div className="photo-groups-layout">
      <div ref={body} className={`photo-groups-scroll ${mode === "list" && !current && !groups.data?.invitations?.length ? "photo-group-start" : ""}`}>
        {groups.isPending ? <Loader /> : groups.isError ? <div className="photo-groups-status" role="alert"><p>Chưa tải được nhóm ảnh.</p><Button variant="secondary" onClick={() => void groups.refetch()}>Thử lại</Button></div> : mode === "list" || mode === "create" && current ? <>
          <PhotoGroupInvitations onAccepted={onClose} />
          {current ? <button type="button" className="photo-group-row" onClick={() => showGroup(current)}><Avatar person={{ name: current.title, avatar: current.avatar }} /><span><strong>{current.title}</strong><small>{groupStatus(current)}</small></span><ChevronRight size={19} /></button> : <button type="button" className="photo-group-create" onClick={() => { setMode("create"); setStep("info"); }}><span className="photo-group-symbol glass-control"><Plus size={40} /></span><strong>Tạo nhóm</strong></button>}
        </> : mode === "create" || mode === "invite" ? <form id="photo-group-create" className={`photo-group-form is-${step}`} onSubmit={(event) => { event.preventDefault(); if (step === "info" && mode !== "invite") { if (title.trim()) setStep("members"); } else if (step === "members") void create(); }}>
          {step === "info" ? <><div className="photo-group-name-row"><button type="button" className="photo-group-avatar-picker" aria-label="Chọn ảnh nhóm" onClick={() => { setAvatarTarget("create"); setStep("avatar"); }}><Image unoptimized={!avatar.startsWith("/images/group-avatars/")} src={avatar} alt="" width={56} height={56} /><span><Plus size={13} /></span></button><label>Tên nhóm<input className="input glass-field" placeholder="Hội đi ăn…" maxLength={40} value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} autoComplete="off" required /></label></div><fieldset className="photo-group-duration"><legend>Thời gian nhóm</legend><div>{PHOTO_GROUP_DAYS.map((days) => <button key={days} type="button" aria-pressed={durationDays === days} className="glass-option" onClick={() => setDurationDays(days)}>{durationDays === days && <Check size={15} />}{days} ngày</button>)}</div></fieldset></> : step === "avatar" ? avatarChoices : <>
            <label className="photo-group-search glass-field"><Search size={19} /><input className="input" aria-label="Tìm bạn bằng tên hoặc Tellme ID" placeholder="Tên hoặc @Tellme ID" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" disabled={busy || members.length >= 29} /></label>
            <div className="photo-group-picked" hidden={!!search.trim()} aria-label={`Đã chọn ${members.length} bạn`}>{members.map((memberId) => { const person = friends.find((friend) => friend.id === memberId); return <button key={memberId} type="button" disabled={busy} onClick={() => setMembers((ids) => ids.filter((id) => id !== memberId))} aria-label={`Bỏ ${person?.name || "thành viên"}`}><Avatar person={person} size="xs" /><span>{person?.name || "Thành viên"}</span><X size={14} /></button>; })}</div>
            {search.trim() ? <div className="photo-group-suggestions" aria-label="Bạn được tìm thấy">{suggestions.length ? suggestions.map((person) => <button key={person.id} type="button" disabled={busy} onClick={() => { setMembers((ids) => [...ids, person.id]); setSearch(""); }}><Avatar person={person} size="sm" /><span><strong>{person.name}</strong><small>@{person.username}{groups.data?.busyMemberIds?.includes(person.id) ? " · Tham gia sau khi rời nhóm cũ" : ""}</small></span><Plus size={18} /></button>) : <p className="photo-groups-hint">Không tìm thấy bạn phù hợp.</p>}</div> : !members.length && <p className="photo-groups-hint">Tìm và chọn bạn đã kết nối.</p>}
          </>}
        </form> : selected && step === "avatar" ? <div className="photo-group-detail-avatar">{avatarChoices}</div> : selected && <div className="photo-group-detail">{confirmEnd ? <><h3>{selected.ownerId === "me" ? "Hủy nhóm này?" : "Rời nhóm này?"}</h3><p>Chồng ảnh đã đăng vẫn được giữ.</p></> : <><div className="photo-group-detail-heading"><button type="button" className="photo-group-avatar-picker" aria-label="Đổi ảnh nhóm" disabled={busy || selected.ownerId !== "me" || !canPostToPhotoGroup(selected)} onClick={() => { setAvatarTarget("detail"); setStep("avatar"); }}><Avatar person={{ id: `group:${selected.id}`, name: selected.title, avatar: selected.avatar }} size="lg" />{selected.ownerId === "me" && canPostToPhotoGroup(selected) && <span><Plus size={13}/></span>}</button><span><strong>{selected.count} ảnh · {selected.memberIds.length} thành viên</strong><small>{groupStatus(selected)}</small></span></div><div className="photo-group-member-avatars">{selected.memberIds.map((memberId) => { const person = selected.members?.find((p) => p.id === memberId) || data?.people.find((p) => p.id === memberId); return <span key={memberId}><Avatar person={person} size="sm" /><small>{memberId === "me" ? "Bạn" : person?.name || "Thành viên"}</small></span>; })}{selected.pendingMembers?.map((person) => <span key={person.id} className="photo-group-pending"><Avatar person={person} size="sm"/><small>{person.name}</small><small>Đang chờ</small></span>)}</div></>}</div>}
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
      {!groups.isPending && !groups.isError && <footer className={`photo-groups-footer ${(mode === "invite" || mode === "create" && !current) && step !== "info" ? "has-back" : ""}`}>{mode === "invite" || mode === "create" && !current ? <>{step !== "info" && <button type="button" className="photo-group-footer-back" aria-label={mode === "invite" ? "Nhóm ảnh" : "Thông tin nhóm"} disabled={busy} onClick={back}><ArrowLeft size={21} /></button>}{step !== "avatar" && <Button className="full-width" type="submit" form="photo-group-create" disabled={busy || (step === "info" && mode !== "invite" ? !title.trim() : !members.length)}>{busy ? "Đang gửi…" : mode === "invite" ? `Gửi lời mời${members.length ? ` · ${members.length}` : ""}` : step === "info" ? "Mời bạn" : `Tạo nhóm · ${durationDays} ngày`}</Button>}</> : mode === "detail" && selected ? step === "avatar" ? <Button variant="secondary" onClick={() => setStep("info")}>Quay lại</Button> : confirmEnd ? <><Button variant="secondary" disabled={busy} onClick={() => setConfirmEnd(false)}>Giữ lại</Button><Button variant="danger" disabled={busy} onClick={() => void end()}>{busy ? "Đang xử lý…" : selected.ownerId === "me" ? "Hủy nhóm" : "Rời nhóm"}</Button></> : <><div className="photo-group-detail-actions">{canPostToPhotoGroup(selected) && <button type="button" className="glass-action" onClick={() => choose(selected.id)}><Send size={21} /><span>Đăng vào nhóm</span></button>}{selected.count > 0 && <button type="button" className="glass-action" onClick={() => { router.push(`/community/today?group=${selected.id}`); onClose(); }}><Images size={21} /><span>Xem ảnh</span></button>}</div>{selected.ownerId === "me" && canPostToPhotoGroup(selected) && <button type="button" className="photo-group-invite glass-action" onClick={() => { setMembers([]); setSearch(""); setStep("members"); setMode("invite"); }}><UserPlus size={19}/><span>Mời bạn</span></button>}{photoGroupIsActive(selected) && (selected.isJoined || selected.canPost) && <button type="button" className="photo-group-end glass-action is-danger" onClick={() => setConfirmEnd(true)}>{selected.ownerId === "me" ? <Trash2 size={20} /> : <LogOut size={20} />}<span>{selected.ownerId === "me" ? "Hủy nhóm" : "Rời nhóm"}</span></button>}</> : <small>Mỗi người tham gia một nhóm đang hoạt động.</small>}</footer>}
    </div>
  </Modal>{crop && <ImageCropper file={crop} kind="avatar" title="Ảnh đại diện nhóm" onCancel={() => setCrop(null)} onConfirm={async (file) => { await saveAvatar(await readImage(file)); setCrop(null); }} />}</>;
}
