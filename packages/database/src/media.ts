import type { ClientSession } from "mongodb";
import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import { encode } from "blurhash";
import { config } from "./config.js";
import { media, mongo, posts, stories, users, conversations } from "./database.js";
import type { User } from "./models.js";
import { enqueue } from "./queue.js";

const cloud = new URL(config.CLOUDINARY_URL);
cloudinary.config({ cloud_name: cloud.hostname, api_key: decodeURIComponent(cloud.username), api_secret: decodeURIComponent(cloud.password), secure: true });
export { cloudinary };
export class MediaUnavailable extends Error {}
export async function withMediaChange<T>(me: User, urls: string[], write: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = mongo.startSession();
  try {
    return await session.withTransaction(async () => {
      for (const url of new Set(urls.filter(Boolean))) {
        const item = await media.findOneAndUpdate({ ownerId: me._id, url, state: { $ne: "deleting" } }, { $set: { state: "active", lastReferencedAt: new Date().toISOString() } }, { session });
        if (!item) {
          const current = await users.findOne({ _id: me._id }, { session });
          if (!url.startsWith("/") || (url !== current?.avatar && url !== current?.cover)) throw new MediaUnavailable("Ảnh không khả dụng. Vui lòng tải ảnh lên lại.");
        }
      }
      return write(session);
    });
  } finally { await session.endSession(); }
}
export async function scheduleCleanup(ownerId: string, urls: string[], session?: ClientSession) {
  for (const url of new Set(urls.filter(Boolean))) await enqueue("media.cleanup", { ownerId, url }, { session, delay: 1500 });
}
export async function cleanMedia(ownerId: string, url: string) {
  const item = await media.findOne({ ownerId, url });
  if (!item) return;
  const session = mongo.startSession();
  let canDelete = false;
  try {
    await session.withTransaction(async () => {
      canDelete = false;
      const record = await media.findOne({ _id: item._id, ownerId }, { session });
      if (!record) return;
      const referenced = (await conversations.findOne({ avatar: url }, { session })) || (await posts.findOne({ image: url }, { session })) || (await stories.findOne({ "items.image": url }, { session })) || (await users.findOne({ $or: [{ avatar: url }, { cover: url }] }, { session }));
      if (referenced) return;
      await media.updateOne({ _id: item._id }, { $set: { state: "deleting" } }, { session });
      canDelete = true;
    });
  } finally { await session.endSession(); }
  if (!canDelete) return;
  const result = await cloudinary.uploader.destroy(item._id, { invalidate: true, resource_type: "image" });
  if (result.result !== "ok" && result.result !== "not found") throw new Error("Cloudinary cleanup not acknowledged");
  await media.deleteOne({ _id: item._id, ownerId, state: "deleting" });
}
export async function sweepMedia() {
  const cutoff = new Date(Date.now() - config.MEDIA_ORPHAN_HOURS * 3600000).toISOString();
  for await (const item of media.find({ createdAt: { $lt: cutoff } }).batchSize(100)) await cleanMedia(item.ownerId, item.url);
}
export async function processMedia(id: string) {
  const item = await media.findOne({ _id: id, state: { $ne: "deleting" } });
  if (!item) return;
  const thumb = cloudinary.url(id, { secure: true, transformation: [{ width: 400, height: 400, crop: "limit", fetch_format: "auto", quality: "auto" }] });
  const feed = cloudinary.url(id, { secure: true, transformation: [{ width: 1280, crop: "limit", fetch_format: "auto", quality: "auto" }] });
  const small = cloudinary.url(id, { secure: true, format: "png", transformation: [{ width: 32, height: 32, crop: "limit" }] });
  const response = await fetch(small, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error("Cannot build image preview");
  const buffer = Buffer.from(await response.arrayBuffer());
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const original = await cloudinary.api.resource(id);
  await media.updateOne({ _id: id, state: { $ne: "deleting" } }, { $set: { variants: { thumbnail: thumb, feed, blurhash: encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3), width: Number(original.width), height: Number(original.height) } } });
}
