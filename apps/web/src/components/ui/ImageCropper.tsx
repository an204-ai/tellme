"use client";
import { useEffect, useId, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { cropImage, localImage } from "@/lib/images";
import { Button, IconButton, ImageUploadSpinner } from "./Primitives";
import { Modal } from "./Modal";

export function ImageCropper({ file, kind, title, onCancel, onConfirm }: {
  file: File;
  title?: string;
  kind: "avatar" | "cover";
  onCancel: () => void;
  onConfirm: (image: File) => Promise<void>;
}) {
  const [src, setSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
  const [cropSize, setCropSize] = useState({ width: 0, height: 0 });
  // Always permit shrinking below 100%, including fitting a panorama inside an avatar.
  const minZoom = mediaSize.width && cropSize.width
    ? Math.min(.5, cropSize.width / mediaSize.width, cropSize.height / mediaSize.height)
    : .5;
  const [area, setArea] = useState<Area | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const zoomId = useId();
  useEffect(() => {
    let live = true;
    let objectUrl = "";
    void localImage(file).then((url) => {
      objectUrl = url;
      if (live) setSrc(url);
      else URL.revokeObjectURL(url);
    }).catch((failure: Error) => { if (live) setError(failure.message); });
    return () => { live = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file]);
  return <Modal title={title || (kind === "avatar" ? "Căn chỉnh ảnh đại diện" : "Căn chỉnh ảnh bìa")}
    onClose={() => { if (!busy) onCancel(); }} className="image-crop-dialog">
    <div className="image-crop-body">
      <p>Kéo ảnh để căn khung. Dùng thanh thu phóng hoặc hai ngón tay để thu nhỏ, phóng to. Phần trống trong khung sẽ có nền trắng.</p>
      <div className={`image-crop-stage is-${kind}`} aria-busy={(!src && !error) || busy}>
        {src ? <Cropper image={src} crop={crop} zoom={zoom} minZoom={minZoom} maxZoom={3} restrictPosition={false} aspect={kind === "avatar" ? 1 : 3}
          cropShape={kind === "avatar" ? "round" : "rect"} showGrid={kind === "cover"}
          objectFit={kind === "avatar" ? "cover" : "contain"}
          cropperProps={{ "aria-label": "Vùng căn chỉnh ảnh; dùng phím mũi tên để dịch chuyển" }}
          onCropChange={setCrop} onZoomChange={setZoom}
          onMediaLoaded={setMediaSize} onCropSizeChange={setCropSize}
          onCropComplete={(_, pixels) => setArea(pixels)}
          keyboardStep={8} zoomWithScroll={!busy} onInteractionStart={() => setError("")}
          style={{ containerStyle: { pointerEvents: busy ? "none" : "auto" } }}
        /> : <p role="status">{error ? "Chưa mở được ảnh" : "Đang mở ảnh…"}</p>}
      </div>
      <div className="image-crop-zoom">
        <label htmlFor={zoomId}>Thu phóng</label>
        <IconButton label="Thu nhỏ ảnh" disabled={!src || busy || zoom <= minZoom} onClick={() => setZoom(Math.max(minZoom, zoom - 0.2))}><Minus size={18}/></IconButton>
        <input id={zoomId} type="range" min={minZoom} max={3} step={0.01} value={zoom} disabled={!src || busy}
          onChange={(event) => setZoom(Number(event.target.value))} />
        <IconButton label="Phóng to ảnh" disabled={!src || busy || zoom >= 3} onClick={() => setZoom(Math.min(3, zoom + 0.2))}><Plus size={18}/></IconButton>
        <output htmlFor={zoomId}>{Math.round(zoom * 100)}%</output>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="image-crop-actions">
        <Button variant="ghost" disabled={!src || busy} onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); }}><RotateCcw size={16}/>Đặt lại</Button>
        <Button variant="secondary" disabled={busy} onClick={onCancel}>Hủy</Button>
        <Button disabled={!src || !area || busy} onClick={async () => {
          if (!area || busy) return;
          setBusy(true); setError("");
          try { await onConfirm(await cropImage(src, area, kind)); }
          catch (failure) { setError((failure as Error).message); }
          finally { setBusy(false); }
        }}>{busy ? <><ImageUploadSpinner /><span role="status">Đang tải ảnh lên…</span></> : "Dùng ảnh này"}</Button>
      </div>
    </div>
  </Modal>;
}
