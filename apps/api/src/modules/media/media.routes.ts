import { Hono } from "hono";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { config } from "../../backend/config.js";
import { media } from "../../backend/database.js";
import { fail, type Env } from "../../backend/security.js";
import { now } from "../../backend/domain.js";
import { imageFormat, IMAGE_FORMAT_NAMES, MAX_IMAGE_BYTES } from "../../backend/image-formats.js";
export function registerMediaRoutes(api: Hono<Env>) {
  api.post("/media/upload", async (c) => {
    const form = await c.req.formData(),
      file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > MAX_IMAGE_BYTES
    )
      fail(400, `Chọn ảnh ${IMAGE_FORMAT_NAMES}, tối đa 50 MB.`);
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!imageFormat(buffer)) fail(400, `Định dạng ảnh chưa được hỗ trợ. Chọn ảnh ${IMAGE_FORMAT_NAMES}.`);
    const publicId = `tellme/${c.get("user")._id}/${randomUUID()}`;
    const result = await new Promise<{ secure_url: string; public_id: string; format: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif", "bmp", "tif", "tiff"],
            overwrite: false,
            timeout: 120000,
          },
          (error, result) => {
            if (error || !result) reject(new Error("CloudinaryUploadError"));
            else resolve(result);
          },
        );
        stream.end(buffer);
      },
    ).catch(() => fail(400, "Chưa đọc được ảnh này. Thử xuất ảnh sang JPG/PNG hoặc chọn ảnh khác rồi tải lại."));
    // Preserve the original pixel dimensions; negotiate a browser-friendly delivery format.
    const url = cloudinary.url(result.public_id, {
      secure: true,
      resource_type: "image",
      version: Number(result.secure_url.match(/\/v(\d+)\//)?.[1]) || undefined,
      format: result.format,
      transformation: [{ fetch_format: "auto", quality: "auto" }],
    });
    try {
      await media.insertOne({
        _id: result.public_id,
        ownerId: c.get("user")._id,
        url,
        createdAt: now(),
      });
    } catch (error) {
      await cloudinary.uploader
        .destroy(result.public_id)
        .catch(() => undefined);
      throw error;
    }
    return c.json({ url }, 201);
  });
  api.get("/media/giphy", async (c) => {
    const input = z
      .object({
        kind: z.enum(["gif", "sticker"]),
        q: z.string().max(100).default(""),
        offset: z.coerce.number().int().min(0).max(4999).default(0),
      })
      .parse(c.req.query());
    const params = new URLSearchParams({
      api_key: config.GIPHY_API_KEY,
      limit: "18",
      offset: String(input.offset),
      rating: "g",
      bundle: "messaging_non_clips",
    });
    if (input.q) {
      params.set("q", input.q);
      params.set("lang", "vi");
    }
    const response = await fetch(
      `https://api.giphy.com/v1/${input.kind === "gif" ? "gifs" : "stickers"}/${input.q ? "search" : "trending"}?${params}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) fail(503, "Chưa tải được Giphy. Bạn thử lại sau nhé.");
    return c.json(await response.json());
  });
}
