import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { media, stories, users, conversations } from "../../backend/database.js";
import { fail, type Env } from "../../backend/security.js";
import { now, relations, visibility } from "../../backend/domain.js";
import { imageFormat, IMAGE_FORMAT_NAMES, MAX_IMAGE_BYTES } from "../../backend/image-formats.js";
import { enqueue, mongo, protectedMediaUrl } from "@tellme/database";
export function registerMediaRoutes(api: Hono<Env>) {
  api.get("/media/images/:key", async (c) => {
    const key = c.req.param("key");
    if (!/^[A-Za-z0-9_-]{1,250}$/.test(key)) fail(404, "Ảnh không khả dụng.");
    const id = Buffer.from(key, "base64url").toString("utf8");
    const item = await media.findOne({ _id: id, state: { $ne: "deleting" } });
    if (!item) fail(404, "Ảnh không khả dụng.");
    const me = c.get("user");
    if (item.ownerId !== me._id) {
      const r = await relations(me);
      if (r.blocked.includes(item.ownerId)) fail(404, "Ảnh không khả dụng.");
      // Avatars are the limited identity shown by an exact-ID lookup or a request.
      const avatar = await users.findOne({ _id: item.ownerId, avatar: item.url }, { projection: { _id: 1 } });
      const cover = r.mutual.includes(item.ownerId) && await users.findOne({ _id: item.ownerId, cover: item.url }, { projection: { _id: 1 } });
      const story = await stories.findOne({ $and: [await visibility(me, "userId"), {
        items: { $elemMatch: { image: item.url, privacy: { $ne: "private" } } },
      }] }, { projection: { _id: 1 } });
      const group = await conversations.findOne({ participants: me._id, avatar: item.url }, { projection: { participants: 1 } });
      if (!avatar && !cover && !story && !(group && !group.participants.some((personId) => r.blocked.includes(personId)))) fail(404, "Ảnh không khả dụng.");
    }
    const size = c.req.query("size");
    if (size && size !== "thumbnail" && size !== "feed") fail(400, "Kích thước ảnh không hợp lệ.");
    const upstream = cloudinary.url(item._id, {
      secure: true, type: item.deliveryType || "upload", sign_url: item.deliveryType === "authenticated",
      transformation: [{ ...(size === "thumbnail" ? { width: 400, height: 400, crop: "limit" } : { width: 1600, crop: "limit" }), fetch_format: "auto", quality: "auto" }],
    });
    const response = await fetch(upstream, { headers: { Accept: c.req.header("accept") || "image/*" }, redirect: "error", signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) fail(404, "Ảnh chưa tải được. Bạn thử lại nhé.");
    return new Response(response.body, { headers: {
      "Content-Type": response.headers.get("content-type")!, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  });
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
    const pendingUrl = `pending:${publicId}`;
    await media.insertOne({ _id: publicId, ownerId: c.get("user")._id, url: pendingUrl, createdAt: now(), state: "active", deliveryType: "authenticated" });
    const result = await new Promise<{ secure_url: string; public_id: string; format: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: "image",
            type: "authenticated",
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
    ).catch(async () => {
      await enqueue("media.cleanup", { ownerId: c.get("user")._id, url: pendingUrl }, { delay: 600000 });
      return fail(400, "Chưa đọc được ảnh này. Thử xuất ảnh sang JPG/PNG hoặc chọn ảnh khác rồi tải lại.");
    });
    // The browser receives a session-checked URL, never Cloudinary's signed URL.
    const url = protectedMediaUrl(result.public_id);
    try {
      const session = mongo.startSession();
      try {
        await session.withTransaction(async () => {
          await media.updateOne({ _id: publicId }, { $set: { url } }, { session });
          await enqueue("media.process", { mediaId: publicId }, { session });
        });
      } finally { await session.endSession(); }
    } catch (error) {
      await cloudinary.uploader
        .destroy(result.public_id, { type: "authenticated", invalidate: true })
        .catch(() => undefined);
      throw error;
    }
    return c.json({ url }, 201);
  });
}
