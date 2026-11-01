"use client";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { Plus, Check } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import { canMessagePerson } from "@/lib/chat-policy";
import { newId, readImage, request } from "@/lib/api-repository";
import { DEFAULT_GROUP_AVATAR, groupAvatarPresets } from "@/lib/social-assets";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { IMAGE_ACCEPT } from "@/lib/images";
import type { AppData, Conversation } from "@/lib/types";
import { Avatar, Button, Input, SearchInput, ImageUploadStatus } from "@/components/ui/Primitives";

/** Shared by the Messages composer and the Share dialog. */
export function GroupComposer({ data, onCreated, editGroup }: { data: AppData; onCreated: (id: string) => void; editGroup?: Conversation }) {
  const { update, saving, refetch } = useCommunity();
  const [name, setName] = useState(editGroup?.title || "");
  const [avatar, setAvatar] = useState(editGroup?.avatar || DEFAULT_GROUP_AVATAR);
  const [members, setMembers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const nameId = useId();
  const file = useRef<HTMLInputElement>(null);
  const friends = data.people.filter((person) => canMessagePerson(person.id, data));
  const chosen = members.filter((id) => friends.some((person) => person.id === id));
  const query = search.trim().replace(/^@/, "").toLocaleLowerCase("vi");
  const busy = uploading || submitting || saving;
  return <><form className="group-composer" onSubmit={async (event) => {
    event.preventDefault();
    if (busy || !name.trim() || (!editGroup && chosen.length < 2)) return;
    setSubmitting(true);
    setError("");
    try {
      if (editGroup) {
        await request(`/conversations/${editGroup.id}`, { method: "PATCH", body: JSON.stringify({ title: name.trim(), avatar }) });
        await refetch({ throwOnError: true });
        onCreated(editGroup.id);
        return;
      }
      const id = newId();
      await update((draft) => {
        draft.conversations.unshift({ id, kind: "group", title: name.trim(), avatar, participantIds: ["me", ...chosen], userId: "me", unread: 0, messages: [] });
      });
      onCreated(id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Chưa tạo được nhóm. Bạn thử lại nhé.");
    } finally { setSubmitting(false); }
  }}>
    <div className="group-identity">
      <div className="group-avatar-upload">
        <Avatar person={{ name: name || "Nhóm của bạn", avatar }} size="lg" />
        <button type="button" className="group-avatar-add" aria-label="Tải và căn chỉnh avatar nhóm" disabled={busy} onClick={() => file.current?.click()}><Plus size={18} aria-hidden="true" /></button>
      </div>
      <div><label className="field-label" htmlFor={nameId}>Tên nhóm</label><Input id={nameId} placeholder="Đặt tên cho hội của bạn…" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required disabled={busy} /></div>
    </div>
    <fieldset className="group-avatar-choices" disabled={busy}>
      <legend>Avatar nhóm</legend>
      <div className="group-avatar-presets">
        {groupAvatarPresets.map((preset) => <button key={preset.id} type="button" aria-label={preset.label} aria-pressed={avatar === preset.image} onClick={() => setAvatar(preset.image)}><Image src={preset.image} alt="" width={68} height={68} sizes="72px" />{avatar === preset.image && <span className="avatar-choice-check"><Check size={12} /></span>}</button>)}
      </div>
      <small className="group-avatar-limit">Ảnh tải lên tối đa 50 MB</small>
      <input ref={file} type="file" hidden accept={IMAGE_ACCEPT} aria-label="Tải avatar nhóm" onChange={(event) => {
        const image = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (image) { setError(""); setCropFile(image); }
      }} />
    </fieldset>
    {uploading && <ImageUploadStatus label="Đang tải avatar nhóm…" />}
    {!editGroup && <>
    <div className="group-members-heading"><strong>Chọn bạn vào nhóm</strong><span>{chosen.length}/29</span></div>
    <SearchInput aria-label="Tìm bạn để tạo nhóm" placeholder="Tên hoặc @Tellme ID…" value={search} onChange={(event) => setSearch(event.target.value)} />
    <p className="group-members-hint">Chọn ít nhất 2 người bạn.</p>
    <div className="group-member-options">
      {friends.filter((person) => `${person.name} ${person.username}`.toLocaleLowerCase("vi").includes(query)).map((person) => <label key={person.id}>
        <input type="checkbox" checked={chosen.includes(person.id)} disabled={busy || (!chosen.includes(person.id) && chosen.length >= 29)} onChange={() => setMembers((current) => current.includes(person.id) ? current.filter((id) => id !== person.id) : [...current, person.id])} />
        <Avatar person={person} size="sm" /><span className="group-member-name"><strong title={person.name}>{person.name}</strong><small title={`@${person.username}`}>@{person.username}</small></span>
      </label>)}
    </div>
    {!friends.length && <p>Chưa có bạn bè để tạo nhóm. Khi cùng follow nhau, các bạn có thể trò chuyện tại đây.</p>}
    {!!friends.length && !friends.some((person) => `${person.name} ${person.username}`.toLocaleLowerCase("vi").includes(query)) && <p>Chưa tìm thấy người bạn này.</p>}
    </>}
    {error && <p className="field-error" role="alert">{error}</p>}
    <Button type="submit" className="full-width" disabled={busy || (!editGroup && chosen.length < 2) || !name.trim()}>{uploading ? "Đang tải ảnh…" : submitting ? "Đang lưu…" : editGroup ? "Lưu thay đổi" : "Tạo nhóm chat"}</Button>
  </form>
    {cropFile && <ImageCropper file={cropFile} kind="avatar" title="Căn chỉnh avatar nhóm" onCancel={() => setCropFile(null)} onConfirm={async (image) => {
      setUploading(true);
      try { setAvatar(await readImage(image)); setCropFile(null); }
      finally { setUploading(false); }
    }} />}
  </>;
}
