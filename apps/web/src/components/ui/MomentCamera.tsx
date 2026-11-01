"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, LoaderCircle, RefreshCw, SwitchCamera } from "lucide-react";
import { cameraError, capturePhoto } from "@/lib/camera";
import { Button } from "./Primitives";
import { Select } from "./Select";

type CameraState = "opening" | "ready" | "paused" | "error";

/** Camera input is isolated so a future mobile-only creation policy stays outside the composer. */
export function MomentCamera({ onCapture }: { onCapture: (file: File) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const selected = useRef("");
  const capturing = useRef(false);
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  const [state, setState] = useState<CameraState>("opening");
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [mirrored, setMirrored] = useState(false);
  const [taking, setTaking] = useState(false);

  const stop = useCallback(() => {
    generation.current += 1;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  const start = useCallback(async (id?: string) => {
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
          ...(id ? { deviceId: { exact: id } } : { facingMode: { ideal: "environment" } }),
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
      selected.current = settings.deviceId || id || "";
      setDeviceId(selected.current);
      setMirrored(settings.facingMode === "user" || (!settings.facingMode && !/back|rear|environment|sau/i.test(track.label)));
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
      try {
        const available = await navigator.mediaDevices.enumerateDevices();
        if (request === generation.current) setDevices(available.filter((entry) => entry.kind === "videoinput"));
      } catch { /* Camera selection is optional; capture still works. */ }
    } catch (failure) {
      if (request !== generation.current) return;
      stop();
      setError(cameraError(failure));
      setState("error");
    }
  }, [stop]);

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
      const file = await capturePhoto(video.current, mirrored);
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

  return <div className="moment-camera">
    <div className="moment-viewfinder" data-state={state}>
      <video ref={video} autoPlay muted playsInline aria-label="Xem trước camera" className={mirrored ? "is-mirrored" : ""} onLoadedData={() => { if (stream.current && !document.hidden) setState("ready"); }} />
      {state !== "ready" && <div className="moment-camera-message" role="status">
        {state === "opening" ? <><LoaderCircle size={28} className="camera-spinner" /><strong>Đang mở camera…</strong><p>Cho phép Tellme dùng camera để ghi lại khoảnh khắc.</p></> : <>
          <CameraOff size={30} /><strong>{state === "paused" ? "Camera đang tạm nghỉ" : "Chưa kết nối được camera"}</strong>
          <p>{state === "paused" ? "Mở lại camera khi bạn sẵn sàng chụp nhé." : error}</p>
          <Button variant="secondary" type="button" onClick={() => void start()}><RefreshCw size={16} />Mở lại camera</Button>
        </>}
      </div>}
      {state === "ready" && <span className="moment-camera-live"><span />Camera đang bật</span>}
    </div>
    <p className="moment-camera-note">Một khoảnh khắc ngay lúc này. Chụp xong, mình xem lại nhé.</p>
    {state === "ready" && error && <p role="alert" className="field-error">{error}</p>}
    <div className="moment-camera-controls">
      <span className="moment-camera-control-space" aria-hidden="true" />
      <button type="button" className="moment-shutter" aria-label="Chụp khoảnh khắc" disabled={state !== "ready" || taking} onClick={() => void takePhoto()}><Camera size={26} /></button>
      {devices.length > 1 ? <button type="button" className="moment-flip" aria-label="Đổi camera" disabled={state !== "ready" || taking} onClick={() => {
        const index = devices.findIndex((device) => device.deviceId === deviceId);
        void start(devices[(index + 1) % devices.length]?.deviceId);
      }}><SwitchCamera size={23} /></button> : <span className="moment-camera-control-space" />}
    </div>
    {devices.length > 1 && <Select aria-label="Chọn camera" value={deviceId} disabled={state !== "ready" || taking} onValueChange={(id) => void start(id)}>
      {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
    </Select>}
  </div>;
}
