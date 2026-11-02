/** Center crop matches the 4:3 camera viewfinder without stretching the image. */
export function cameraCrop(width: number, height: number, zoom = 1) {
  if (width <= 0 || height <= 0) throw new Error("Camera chưa sẵn sàng. Bạn đợi một chút nhé.");
  const sourceWidth = Math.min(width, height * 4 / 3) / Math.max(1, Number.isFinite(zoom) ? zoom : 1);
  const sourceHeight = sourceWidth * 3 / 4;
  const outputWidth = Math.min(1600, Math.floor(sourceWidth));
  return {
    x: (width - sourceWidth) / 2,
    y: (height - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    width: outputWidth,
    height: Math.round(outputWidth * 3 / 4),
  };
}

export function cameraError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera chưa được cấp quyền. Bạn mở cài đặt quyền của trang web, cho phép camera rồi thử lại nhé.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Chưa tìm thấy camera. Bạn kiểm tra webcam hoặc mở Tellme trên điện thoại để chụp nhé.";
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return "Chưa mở được camera. Bạn thử đóng ứng dụng khác đang dùng camera rồi mở lại nhé.";
  }
  return error instanceof Error ? error.message : "Chưa mở được camera. Bạn thử lại nhé.";
}

export async function capturePhoto(video: HTMLVideoElement, mirrored = false, zoom = 1): Promise<File> {
  if (video.readyState < 2) throw new Error("Camera chưa sẵn sàng. Bạn đợi một chút nhé.");
  const crop = cameraCrop(video.videoWidth, video.videoHeight, zoom);
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Chưa chụp được ảnh trên trình duyệt này. Bạn thử trình duyệt khác nhé.");
  // Match the viewfinder pixels: CSS mirroring alone is not included by drawImage.
  if (mirrored) { context.translate(crop.width, 0); context.scale(-1, 1); }
  context.drawImage(video, crop.x, crop.y, crop.sourceWidth, crop.sourceHeight, 0, 0, crop.width, crop.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Chưa chụp được ảnh. Bạn thử lại nhé.");
  return new File([blob], `tellme-now-${Date.now()}.jpg`, { type: "image/jpeg" });
}
