"use client";
import { useEffect, useRef, useState } from "react";
import { Expand, Minus, Plus } from "lucide-react";
import { feedImageUrl } from "@/lib/images";
import { Modal } from "./Modal";
import { IconButton } from "./Primitives";

function PhotoViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const root = stage.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  const fit = natural.width && size.width ? Math.min(size.width / natural.width, size.height / natural.height, 1) : 1;
  const width = natural.width * fit * zoom;
  const height = natural.height * fit * zoom;
  return <Modal title="Xem ảnh" onClose={onClose} className="photo-viewer-dialog">
    <div ref={stage} className="photo-viewer-stage" tabIndex={0} aria-label="Ảnh đầy đủ; có thể thu phóng và cuộn để xem" aria-busy={!natural.width && !failed}>
      <div className="photo-viewer-canvas" style={{ width: Math.max(size.width, width), height: Math.max(size.height, height) }}>
        <img src={src} alt={alt} style={natural.width ? { width, height } : { maxWidth: "100%", maxHeight: "100%" }}
          onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          onError={() => setFailed(true)} />
        {!natural.width && !failed && <p role="status">Đang tải ảnh đầy đủ…</p>}
        {failed && <p role="alert">Chưa tải được ảnh. Đóng rồi mở lại để thử lại nhé.</p>}
      </div>
    </div>
    <div className="photo-viewer-tools">
      <IconButton label="Thu nhỏ" disabled={zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - 0.5))}><Minus size={19}/></IconButton>
      <button type="button" onClick={() => setZoom(1)} aria-label="Hiển thị trọn ảnh">{Math.round(zoom * 100)}%</button>
      <IconButton label="Phóng to" disabled={zoom >= 4 || !natural.width} onClick={() => setZoom(Math.min(4, zoom + 0.5))}><Plus size={19}/></IconButton>
      <span>Ảnh đầy đủ</span>
    </div>
  </Modal>;
}

export function PostPhoto({ src, alt, preview = false }: { src: string; alt: string; preview?: boolean }) {
  const [ratio, setRatio] = useState<number>();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={`post-photo ${preview ? "is-preview" : ""}`} style={{ aspectRatio: ratio || 4 / 3 }}
      aria-label="Xem ảnh đầy đủ" onClick={() => setOpen(true)}>
      <img src={feedImageUrl(src)} alt={alt} loading={preview ? "eager" : "lazy"}
        onLoad={(event) => setRatio(Math.max(0.8, Math.min(1.91, event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)))} />
      <span className="post-photo-expand"><Expand size={17}/><span>Xem ảnh</span></span>
    </button>
    {open && <PhotoViewer src={src} alt={alt} onClose={() => setOpen(false)}/>}
  </>;
}
