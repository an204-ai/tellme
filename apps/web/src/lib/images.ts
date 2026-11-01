export const IMAGE_ACCEPT = "image/*,.heic,.heif,.avif,.jfif,.tif,.tiff,.bmp";
export const IMAGE_FORMAT_HINT = "JPG, HEIC, PNG, WebP, GIF, AVIF, BMP, TIFF · Tối đa 50 MB";
const extensions = /\.(jpe?g|jfif|png|webp|gif|avif|heic|heif|bmp|tiff?)$/i;

export function validateImage(file: File) {
  if (!file.size) throw new Error("Ảnh đang trống. Chọn lại ảnh nhé.");
  if (file.size > 50 * 1024 * 1024) throw new Error("Chọn ảnh nhỏ hơn hoặc bằng 50 MB.");
  if (!extensions.test(file.name) && !/^image\/(jpeg|pjpeg|png|webp|gif|avif|heic|heif|heic-sequence|heif-sequence|bmp|x-ms-bmp|tiff)$/i.test(file.type))
    throw new Error("Chọn ảnh JPG, HEIC/HEIF, PNG, WebP, GIF, AVIF, BMP hoặc TIFF.");
}

// Crop previews stay on the device. Load the HEIC decoder only when needed.
export async function localImage(file: File): Promise<string> {
  validateImage(file);
  const nativeUrl = URL.createObjectURL(file);
  try {
    await loadImage(nativeUrl);
    return nativeUrl;
  } catch { URL.revokeObjectURL(nativeUrl); }
  let blob: Blob = file;
  if (/\.hei[cf]$/i.test(file.name) || /^image\/hei[cf]/i.test(file.type)) {
    try {
      const { heicTo } = await import("heic-to");
      blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.95 }) as Blob;
    } catch {
      throw new Error("Chưa mở được ảnh HEIC này. Thử xuất ảnh sang JPG rồi chọn lại nhé.");
    }
  } else if (/\.tiff?$/i.test(file.name) || file.type === "image/tiff") {
    try {
      const { default: decoder } = await import("utif");
      const buffer = await file.arrayBuffer();
      const frame = decoder.decode(buffer)[0];
      if (!frame || (frame.t256?.[0] || 0) * (frame.t257?.[0] || 0) > 80000000) throw new Error("TiffTooLarge");
      decoder.decodeImage(buffer, frame);
      const canvas = document.createElement("canvas");
      canvas.width = frame.width;
      canvas.height = frame.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("CanvasUnavailable");
      ctx.putImageData(new ImageData(new Uint8ClampedArray(decoder.toRGBA8(frame)), frame.width, frame.height), 0, 0);
      blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        (value) => value ? resolve(value) : reject(new Error("TiffConversionFailed")), "image/png",
      ));
    } catch { throw new Error("Chưa mở được ảnh TIFF này. Thử xuất sang JPG rồi chọn lại nhé."); }
  }
  const url = URL.createObjectURL(blob);
  try {
    await loadImage(url);
    return url;
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Trình duyệt chưa đọc được ảnh để căn chỉnh. Chọn bản JPG, PNG hoặc HEIC của ảnh này nhé.");
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export async function cropImage(src: string, area: { x: number; y: number; width: number; height: number }, kind: "avatar" | "cover") {
  const image = await loadImage(src);
  const maxWidth = kind === "avatar" ? 1200 : 2400;
  const scale = Math.min(1, maxWidth / area.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width * scale));
  canvas.height = Math.max(1, Math.round(area.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Chưa căn chỉnh được ảnh. Thử lại nhé.");
  // Keep the full selected frame when zoomed out; the browser clips source pixels
  // outside the image while preserving the matching destination spacing.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (value) => value ? resolve(value) : reject(new Error("Chưa lưu được ảnh. Thử lại nhé.")),
    "image/webp", 0.94,
  ));
  return new File([blob], `${kind}.webp`, { type: blob.type });
}

export function feedImageUrl(src: string) {
  if (!/^https:\/\/res\.cloudinary\.com\//.test(src)) return src;
  return src.replace("/image/upload/", "/image/upload/c_limit,w_1280/");
}
