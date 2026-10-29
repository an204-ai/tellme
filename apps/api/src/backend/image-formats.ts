export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const IMAGE_FORMAT_NAMES = "JPG, PNG, HEIC/HEIF, WebP, GIF, AVIF, BMP hoặc TIFF";

// Identify raster images by their bytes, including files with no MIME type on mobile.
export function imageFormat(bytes: Uint8Array): string | undefined {
  const b = Buffer.from(bytes);
  if (b.length < 12) return;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString())) return "gif";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "webp";
  if (b.subarray(0, 2).toString() === "BM") return "bmp";
  if (["49492a00", "4d4d002a", "49492b00", "4d4d002b"].includes(b.subarray(0, 4).toString("hex"))) return "tiff";
  if (b.subarray(4, 8).toString() === "ftyp") {
    const size = Math.min(b.readUInt32BE(0), b.length, 256);
    const brands = [b.subarray(8, 12).toString()];
    for (let at = 16; at + 4 <= size; at += 4) brands.push(b.subarray(at, at + 4).toString());
    if (brands.some((brand) => ["avif", "avis"].includes(brand))) return "avif";
    if (brands.some((brand) => ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"].includes(brand))) return "heic";
  }
  return undefined;
}
