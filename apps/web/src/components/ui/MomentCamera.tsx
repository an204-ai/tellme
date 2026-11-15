"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, CameraOff, Images, LoaderCircle, RefreshCw, SwitchCamera } from "lucide-react";
import { cameraError, capturePhoto, clampCameraZoom } from "@/lib/camera";
import { Button } from "./Primitives";
import { SurfacePresence } from "./SurfaceTransition";

type CameraFacing = "user" | "environment";
type ZoomTrack = Omit<MediaStreamTrack, "getCapabilities"> & {
  getCapabilities: () => MediaTrackCapabilities & { zoom?: { min: number; max: number; step?: number } };
};
type CameraState = "opening" | "ready" | "paused" | "error";

/** Camera input is isolated so a future mobile-only creation policy stays outside the composer. */
export function MomentCamera({ onCapture, onBrowse, active = true, autoStart = true, destination }: { onCapture: (file: File) => void; onBrowse?: () => void; active?: boolean; autoStart?: boolean; destination?: ReactNode }) {
  const viewfinder = useRef<HTMLDivElement>(null);
  const zoomHide = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [showZoom, setShowZoom] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const facing = useRef<CameraFacing>("environment");
  const nativeZoom = useRef<{ min: number; max: number; base: number } | null>(null);
  const zoomRequest = useRef(0);
  const zoomQueue = useRef(Promise.resolve());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const capturing = useRef(false);
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  const opened = useRef(false);
  const [state, setState] = useState<CameraState>(autoStart ? "opening" : "paused");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [digitalZoom, setDigitalZoom] = useState(1);
  const captureZoom = useRef(1);
  const setCropZoom = useCallback((value: number) => { captureZoom.current = value; setDigitalZoom(value); }, []);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 2 });
  const [frontFacing, setFrontFacing] = useState(false);
  const [taking, setTaking] = useState(false);

  const stop = useCallback(() => {
    generation.current += 1;
    zoomRequest.current += 1;
    pinch.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  const start = useCallback(async (direction: CameraFacing = facing.current, strict = false) => {
    stop();
    opened.current = true;
    const request = generation.current;
    setState("opening");
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera cần kết nối HTTPS. Bạn mở Tellme bằng địa chỉ HTTPS hoặc localhost nhé.");
      setState("error");
      return;
    }
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: strict ? { exact: direction } : { ideal: direction },
          width: { ideal: 1600 }, height: { ideal: 1200 }, frameRate: { ideal: 24, max: 30 },
        },
      });
      // A permission prompt may resolve after the modal has already closed.
      if (request !== generation.current || document.hidden) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = next;
      const track = next.getVideoTracks()[0];
      if (!track) throw new Error("Camera chưa gửi được hình ảnh. Bạn mở lại camera nhé.");
      const settings = track.getSettings();
      facing.current = settings.facingMode === "user" ? "user" : settings.facingMode === "environment" ? "environment" : direction;
      setFrontFacing(facing.current === "user");
      const caps = (track as ZoomTrack).getCapabilities?.().zoom;
      const base = (settings as MediaTrackSettings & { zoom?: number }).zoom || 1;
      nativeZoom.current = caps && caps.max > caps.min ? { min: caps.min, max: caps.max, base } : null;
      setZoom(1); setCropZoom(1);
      setZoomRange(nativeZoom.current ? { min: caps!.min / base, max: caps!.max / base } : { min: 1, max: 2 });
      setShowZoom(false);
      track.addEventListener("ended", () => {
        if (request !== generation.current) return;
        stop();
        setState("error");
        setError("Camera đã ngắt kết nối. Bạn kiểm tra lại rồi mở camera nhé.");
      }, { once: true });
      if (!video.current) { stop(); return; }
      video.current.srcObject = next;
      await video.current.play();
      if (request !== generation.current) return;
      // Readiness comes from loaded video frames, not a delay.
      if (video.current.readyState >= 2) setState("ready");

    } catch (failure) {
      if (request !== generation.current) return;
      stop();
      setError(cameraError(failure));
      setState("error");
    }
  }, [stop, setCropZoom]);

  useEffect(() => {
    if (!active) { stop(); setState("paused"); return; }
    let cancelled = false;
    if (autoStart || opened.current) void start();
    else {
      // A first visit explains camera access; returning users with permission go straight to preview.
      void navigator.permissions?.query({ name: "camera" as PermissionName }).then((permission) => {
        if (!cancelled && permission.state === "granted") void start();
      }).catch(() => undefined);
    }
    const pause = () => {
      if (!document.hidden) return;
      stop();
      setState("paused");
    };
    const pageExit = () => { stop(); setState("paused"); };
    document.addEventListener("visibilitychange", pause);
    window.addEventListener("pagehide", pageExit);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", pause);
      window.removeEventListener("pagehide", pageExit);
    };
  }, [start, stop, active, autoStart]);

  useEffect(() => {
    const node = viewfinder.current;
    // React touch listeners are passive. Cancel browser pinch only on this viewfinder.
    const preventPageZoom = (event: TouchEvent) => { if (event.touches.length === 2 && event.cancelable) event.preventDefault(); };
    node?.addEventListener("touchstart", preventPageZoom, { passive: false });
    node?.addEventListener("touchmove", preventPageZoom, { passive: false });
    return () => { clearTimeout(zoomHide.current); node?.removeEventListener("touchstart", preventPageZoom); node?.removeEventListener("touchmove", preventPageZoom); };
  }, []);

  async function takePhoto() {
    if (capturing.current || state !== "ready" || !video.current) return;
    capturing.current = true;
    setTaking(true);
    setError("");
    const request = generation.current;
    try {
      await zoomQueue.current;
      if (request !== generation.current || !video.current) return;
      const file = await capturePhoto(video.current, captureZoom.current);
      if (request !== generation.current) return;
      stop();
      onCaptureRef.current(file);
    } catch (failure) {
      if (request === generation.current) setError(cameraError(failure));
    } finally {
      setTaking(false);
      capturing.current = false;
    }
  }

  const changeZoom = (value: number) => {
    const target = clampCameraZoom(value, zoomRange);
    const track = stream.current?.getVideoTracks()[0];
    if (!track || state !== "ready" || capturing.current) return;
    const request = ++zoomRequest.current;
    const version = generation.current;
    const native = nativeZoom.current;
    setZoom(target);
    setShowZoom(true);
    clearTimeout(zoomHide.current);
    zoomHide.current = setTimeout(() => setShowZoom(false), 1400);
    // Some mobile browsers expose no hardware zoom. Digital crop stays truthful
    // because the exact same crop is used for preview and the captured file.
    if (!native) { setCropZoom(target); return; }
    zoomQueue.current = zoomQueue.current.catch(() => undefined).then(async () => {
      if (request !== zoomRequest.current || version !== generation.current) return;
      const hardware = Math.max(native.min, Math.min(native.max, target * native.base));
      try {
        await track.applyConstraints({ advanced: [{ zoom: hardware } as MediaTrackConstraintSet] });
      } catch { /* Read the actual hardware setting before falling back to a crop. */ }
      if (request !== zoomRequest.current || version !== generation.current) return;
      // Advanced constraints may be silently ignored; settings are the truth.
      const actual = (track.getSettings() as MediaTrackSettings & { zoom?: number }).zoom || native.base;
      const actualRatio = actual / native.base;
      if (target >= actualRatio) setCropZoom(target / actualRatio);
      else { setZoom(actualRatio); setCropZoom(1); setZoomRange((range) => ({ ...range, min: actualRatio })); }
    });
  };

  return <div className="moment-camera">
    <div ref={viewfinder} className="moment-viewfinder" data-state={state} tabIndex={state === "ready" ? 0 : undefined} aria-label="Camera, dùng hai ngón hoặc phím cộng trừ để thu phóng" onKeyDown={(event) => {
      if (event.key === "+" || event.key === "=" || event.key === "-") { event.preventDefault(); changeZoom(zoom + (event.key === "-" ? -.1 : .1)); }
    }} onTouchStart={(event) => {
      if (event.touches.length === 2 && state === "ready") {
        const [a, b] = Array.from(event.touches);
        pinch.current = { distance: Math.hypot(a!.clientX - b!.clientX, a!.clientY - b!.clientY), zoom };
      }
    }} onTouchMove={(event) => {
      if (!pinch.current || event.touches.length !== 2) return;
      const [a, b] = Array.from(event.touches);
      const distance = Math.hypot(a!.clientX - b!.clientX, a!.clientY - b!.clientY);
      if (pinch.current.distance > 0) changeZoom(pinch.current.zoom * distance / pinch.current.distance);
    }} onTouchEnd={() => { pinch.current = null; }} onTouchCancel={() => { pinch.current = null; }}>
      <video ref={video} autoPlay muted playsInline aria-label="Xem trước camera" style={{ transform: `scale(${digitalZoom})` }} onLoadedData={() => { if (stream.current && !document.hidden) setState("ready"); }} />
      {destination}
      {state !== "ready" && <div className="moment-camera-message" role="status">
        {state === "opening" ? <><LoaderCircle size={28} className="camera-spinner" /><strong>Đang mở camera…</strong><p>Cho phép Tellme dùng camera để ghi lại khoảnh khắc.</p></> : <>
          <CameraOff size={30} /><strong>{state === "paused" ? opened.current ? "Camera đang tạm nghỉ" : "Chụp khoảnh khắc" : "Chưa kết nối được camera"}</strong>
          {state !== "paused" && <p>{error}</p>}
          <Button variant="secondary" type="button" onClick={() => void start()}><RefreshCw size={16} />{opened.current ? "Mở lại camera" : "Bật camera"}</Button>
        </>}
      </div>}
      <SurfacePresence show={state === "ready" && showZoom} className="camera-zoom-presence">
        <div className="moment-camera-zoom glass-control">
          <output aria-label="Mức thu phóng camera" aria-live="polite">{zoom.toFixed(1)}×</output>
        </div>
      </SurfacePresence>
    </div>
    {state === "ready" && error && <p role="alert" className="field-error">{error}</p>}
    <div className="moment-camera-controls">
      {onBrowse ? <button type="button" className="moment-browse" aria-label="Khoảnh khắc của bạn bè hôm nay" onClick={onBrowse}><Images size={30} /></button> : <span className="moment-camera-control-space" aria-hidden="true" />}
      <button type="button" className="moment-shutter" aria-label="Chụp khoảnh khắc" disabled={state !== "ready" || taking} onClick={() => void takePhoto()}><Camera size={26} /></button>
      <button type="button" className="moment-flip" aria-label={frontFacing ? "Chuyển sang camera sau" : "Chuyển sang camera trước"} disabled={state !== "ready" || taking} onClick={() => void start(facing.current === "user" ? "environment" : "user", true)}><SwitchCamera size={30} /></button>
    </div>
  </div>;
}
