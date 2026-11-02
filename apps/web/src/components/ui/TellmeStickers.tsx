"use client";

import { useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { TELLME_STICKERS, TELLME_STICKER_PACKS, getTellmeSticker, normalizeStickerText, suggestTellmeStickers } from "@tellme/shared/stickers";
import { IconButton } from "./Primitives";
import type { CommentMedia } from "@/lib/types";

export type TellmeSticker = (typeof TELLME_STICKERS)[number];
export function stickerMedia(sticker: TellmeSticker): CommentMedia {
  return { id: sticker.id, kind: "sticker", url: sticker.src, alt: sticker.label, width: sticker.width, height: sticker.height };
}

export function TellmeStickerButton({ label, onSelect, disabled = false, showLabels = true }: {
  label: string; onSelect: (sticker: TellmeSticker) => void; disabled?: boolean; showLabels?: boolean;
}) {
  const id = useId();
  const popup = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState("");
  const [packId, setPackId] = useState("tellme");
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const query = normalizeStickerText(search);
  const stickers = TELLME_STICKERS.filter((sticker) => sticker.packId === packId && normalizeStickerText(`${sticker.label} ${sticker.keywords.join(" ")}`).includes(query));
  function choosePack(nextId: string) {
    setPackId(nextId);
    setSearch("");
    if (popup.current) popup.current.querySelector(".tellme-sticker-panel")?.scrollTo(0, 0);
  }
  return <>
    <IconButton label={label} className="tellme-sticker-trigger" disabled={disabled} popoverTarget={id} aria-expanded={opened} aria-controls={id} onClick={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - Math.min(344, window.innerWidth - 24) - 12)), top: Math.max(12, rect.top - Math.min(420, window.innerHeight - 24) - 8) });
    }}>
      <img src="/brand/stickers/tellme-hello.png" alt="" width="32" height="32" draggable={false} />
    </IconButton>
    <div id={id} ref={popup} popover="auto" className="tellme-sticker-picker" aria-label="Bộ sticker Tellme và Bubu" style={{ left: position.left, top: position.top }} onToggle={(event) => {
      const next = event.newState === "open";
      setOpened(next);
      if (!next) setSearch("");
    }}>
      {opened && <>
        <header><strong>Sticker Tellme</strong><IconButton label="Đóng bộ sticker" onClick={() => popup.current?.hidePopover()}><X size={18} /></IconButton></header>
        <div className="tellme-sticker-tabs" role="tablist" aria-label="Chọn bộ sticker">
          {TELLME_STICKER_PACKS.map((pack, index) => <button key={pack.id} type="button" role="tab" id={`${id}-${pack.id}-tab`} aria-selected={packId === pack.id} aria-controls={`${id}-panel`} tabIndex={packId === pack.id ? 0 : -1} onClick={() => choosePack(pack.id)} onKeyDown={(event) => {
            const nextIndex = event.key === "ArrowRight" ? (index + 1) % TELLME_STICKER_PACKS.length : event.key === "ArrowLeft" ? (index + TELLME_STICKER_PACKS.length - 1) % TELLME_STICKER_PACKS.length : event.key === "Home" ? 0 : event.key === "End" ? TELLME_STICKER_PACKS.length - 1 : -1;
            if (nextIndex < 0) return;
            event.preventDefault();
            const next = TELLME_STICKER_PACKS[nextIndex]!;
            choosePack(next.id);
            popup.current?.querySelector<HTMLButtonElement>(`[id="${id}-${next.id}-tab"]`)?.focus();
          }}><img src={pack.cover} alt="" width="30" height="30" draggable={false} /><span>{pack.label}</span></button>)}
        </div>
        <label className="tellme-sticker-search"><Search size={17} /><input aria-label={`Tìm sticker ${TELLME_STICKER_PACKS.find((pack) => pack.id === packId)?.label}`} placeholder="Chào, cảm ơn, yêu nè…" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); } }} maxLength={60} /></label>
        <div id={`${id}-panel`} className="tellme-sticker-panel" role="tabpanel" aria-labelledby={`${id}-${packId}-tab`} tabIndex={0}>
        <div className="tellme-sticker-grid">
          {stickers.map((sticker) => <button type="button" key={sticker.id} aria-label={`Dùng sticker ${sticker.label}`} onClick={() => { popup.current?.hidePopover(); onSelect(sticker); }}>
            <img src={sticker.src} alt="" width="96" height="96" loading="lazy" draggable={false} />{showLabels && <span>{sticker.label}</span>}
          </button>)}
        </div>
        {!stickers.length && <p className="tellme-sticker-empty">Chưa thấy sticker này. Thử một từ khác nhé.</p>}
        </div>
      </>}
    </div>
  </>;
}

export function TellmeStickerSuggestions({ text, onSelect, showLabels = true }: { text: string; onSelect: (sticker: TellmeSticker) => void; showLabels?: boolean }) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const stickers = suggestTellmeStickers(text);
  if (!stickers.length || dismissed === text) return null;
  return <div className="tellme-sticker-suggestions" role="group" aria-label="Sticker gợi ý theo nội dung đang nhập">
    <div className="tellme-sticker-suggestion-heading"><span>Kể bằng sticker nè</span><IconButton label="Ẩn gợi ý sticker" onClick={() => setDismissed(text)}><X size={15} /></IconButton></div>
    <div className="tellme-sticker-suggestion-list">{stickers.map((sticker) => <button type="button" key={sticker.id} aria-label={`Dùng sticker gợi ý ${sticker.label}`} onClick={() => onSelect(sticker)}>
      <img src={sticker.src} alt="" width="60" height="60" loading="lazy" draggable={false} />{showLabels && <span>{sticker.label}</span>}
    </button>)}</div>
  </div>;
}

export function TellmeStickerDraft({ id, onRemove }: { id: string; onRemove: () => void }) {
  const sticker = getTellmeSticker(id);
  if (!sticker) return null;
  return <div className="tellme-sticker-draft" aria-label={`Sticker đã chọn: ${sticker.label}`}>
    <img src={sticker.src} alt={sticker.label} width="80" height="80" />
    <IconButton label="Bỏ sticker đã chọn" onClick={onRemove}><X size={17} /></IconButton>
  </div>;
}
