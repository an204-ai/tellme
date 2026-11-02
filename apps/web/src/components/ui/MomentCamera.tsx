"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, LoaderCircle, RefreshCw, SwitchCamera } from "lucide-react";
import { cameraError, capturePhoto } from "@/lib/camera";
import { Button } from "./Primitives";

type CameraFacing = "user" | "environment";
type ZoomTrack = Omit<MediaStreamTrack, "getCapabilities"> & {
  getCapabilities: () => MediaTrackCapabilities & { zoom?: { min: number; max: number; step?: number } };
};
type CameraState = "opening" | "ready" | "paused" | "error";

/** Camera input is isolated so a future mobile-only creation policy stays outside the composer. */
export function MomentCamera({ onCapture }: { onCapture: (file: File) => void }) {
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
  const [state, setState] = useState<CameraState>("opening");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [digitalZoom, setDigitalZoom] = useState(1);
  const captureZoom = useRef(1);
  const setCropZoom = useCallback((value: number) => { captureZoom.current = value; setDigitalZoom(value); }, []);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 2 });
  const [mirrored, setMirrored] = useState(false);
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
      setMirrored(facing.current === "user");
      const caps = (track as ZoomTrack).getCapabilities?.().zoom;
      const base = (settings as MediaTrackSettings & { zoom?: number }).zoom || 1;
      nativeZoom.current = caps && caps.max > caps.min ? { min: caps.min, max: caps.max, base } : null;
      setZoom(1); setCropZoom(1);
      setZoomRange(nativeZoom.current ? { min: caps!.min / base, max: Math.max(2, caps!.max / base) } : { min: 1, max: 2 });
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
    void start();
    const pause = () => {
      if (!document.hidden) return;
      stop();
      setState("paused");
    };
    const pageExit = () => { stop(); setState("paused"); };
    document.addEventListener("visibilitychange", pause);
    window.addEventListener("pagehide", pageExit);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", pause);
      window.removeEventListener("pagehide", pageExit);
    };
  }, [start, stop]);

  async function takePhoto() {
    if (capturing.current || state !== "ready" || !video.current) return;
    capturing.current = true;
    setTaking(true);
    setError("");
    const request = generation.current;
    try {
      await zoomQueue.current;
      if (request !== generation.current || !video.current) return;
      const file = await capturePhoto(video.current, mirrored, captureZoom.current);
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
    const target = Math.max(zoomRange.min, Math.min(zoomRange.max, value));
    const track = stream.current?.getVideoTracks()[0];
    if (!track || state !== "ready" || capturing.current) return;
    const request = ++zoomRequest.current;
    const version = generation.current;
    const native = nativeZoom.current;
    setZoom(target);
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
    <div className="moment-viewfinder" data-state={state} onTouchStart={(event) => {
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
      <video ref={video} autoPlay muted playsInline aria-label="Xem trước camera" style={{ transform: `${mirrored ? "scaleX(-1) " : ""}scale(${digitalZoom})` }} onLoadedData={() => { if (stream.current && !document.hidden) setState("ready"); }} />
      {state !== "ready" && <div className="moment-camera-message" role="status">
        {state === "opening" ? <><LoaderCircle size={28} className="camera-spinner" /><strong>Đang mở camera…</strong><p>Cho phép Tellme dùng camera để ghi lại khoảnh khắc.</p></> : <>
          <CameraOff size={30} /><strong>{state === "paused" ? "Camera đang tạm nghỉ" : "Chưa kết nối được camera"}</strong>
          <p>{state === "paused" ? "Mở lại camera khi bạn sẵn sàng chụp nhé." : error}</p>
          <Button variant="secondary" type="button" onClick={() => void start()}><RefreshCw size={16} />Mở lại camera</Button>
        </>}
      </div>}
      {state === "ready" && <span className="moment-camera-live"><span />Camera đang bật</span>}
    </div>
    {state === "ready" && <div className="moment-camera-zoom" role="group" aria-label="Thu phóng camera">
      {[.5, 1, 2].filter((value) => value >= zoomRange.min && value <= zoomRange.max).map((value) => <button key={value} type="button" aria-label={`Thu phóng ${value}x`} aria-pressed={Math.abs(zoom - value) < .08} disabled={taking} onClick={() => changeZoom(value)}>{value}×</button>)}
    </div>}
    <p className="moment-camera-note">Một khoảnh khắc ngay lúc này. Chụp xong, mình xem lại nhé.</p>
    {state === "ready" && error && <p role="alert" className="field-error">{error}</p>}
    <div className="moment-camera-controls">
      <span className="moment-camera-control-space" aria-hidden="true" />
      <button type="button" className="moment-shutter" aria-label="Chụp khoảnh khắc" disabled={state !== "ready" || taking} onClick={() => void takePhoto()}><Camera size={26} /></button>
      <button type="button" className="moment-flip" aria-label={mirrored ? "Chuyển sang camera sau" : "Chuyển sang camera trước"} disabled={state !== "ready" || taking} onClick={() => void start(facing.current === "user" ? "environment" : "user", true)}><SwitchCamera size={23} /></button>
    </div>
  </div>;
}
