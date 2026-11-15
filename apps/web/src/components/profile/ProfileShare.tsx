"use client";

import { useState } from "react";
import { Check, Copy, Share } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Avatar, Brand } from "@/components/ui/Primitives";
import type { Person } from "@/lib/types";

export function ProfileShare({ person }: { person: Person }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const copy = async () => {
    setError("");
    try { await navigator.clipboard.writeText(person.username); setCopied(true); }
    catch { setError("Chưa sao chép được. Bạn có thể chọn Tellme ID bên trên để sao chép nhé."); }
  };
  const share = async () => {
    setError(""); setSharing(true);
    try {
      // One text item avoids duplicate share previews on desktop share sheets.
      await navigator.share({ text: `Kết bạn với mình trên Tellme: @${person.username}` });
    } catch (failure) {
      if (!(failure instanceof DOMException && failure.name === "AbortError")) setError("Chưa chia sẻ được. Bạn thử sao chép ID nhé.");
    } finally { setSharing(false); }
  };
  return <>
    <button type="button" aria-haspopup="dialog" onClick={() => { setExpanded(true); setCopied(false); setError(""); }}><span><Share size={24} /></span><strong>Chia sẻ ID</strong></button>
    {expanded && <Modal title="Kết bạn trên Tellme" className="profile-share-dialog" onClose={() => setExpanded(false)}>
      <div className="profile-share-body">
        <div className="profile-share-identity">
          <Brand compact />
          <Avatar person={person} size="xl" />
          <h3>{person.name}</h3>
          <p className="profile-share-id">@{person.username}</p>
        </div>
        <p className="profile-share-hint">Tìm Tellme ID này trong mục Bạn bè<br />để gửi lời mời kết bạn cho mình.</p>
        <div className="profile-share-buttons">
          <button type="button" onClick={() => void copy()}>{copied ? <Check size={21} /> : <Copy size={21} />}{copied ? "Đã sao chép ID" : "Sao chép ID"}</button>
          {typeof navigator !== "undefined" && !!navigator.share && <button type="button" disabled={sharing} onClick={() => void share()}><Share size={21} />{sharing ? "Đang chia sẻ…" : "Chia sẻ qua…"}</button>}
        </div>
        <div className="profile-share-status" role="status">{error || (copied ? "Tellme ID đã sẵn sàng để gửi cho bạn bè." : "")}</div>
      </div>
    </Modal>}
  </>;
}
