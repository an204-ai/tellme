#!/usr/bin/env node
/** Run only after deploying the API and media worker that support authenticated images. */
import { open } from "node:fs/promises";
import {
  cloudinary, config, connectDatabase, conversations, enqueue, media, mongo,
  protectedMediaUrl, redis, stories, users,
} from "../../packages/database/dist/index.js";

const args = process.argv.slice(2);
const value = (flag) => args[args.indexOf(flag) + 1];
const apply = args.includes("--apply");
if (apply && (!args.includes("--expect-db") || value("--expect-db") !== config.MONGODB_DB || !args.includes("--backup"))) {
  throw new Error("Apply requires --expect-db matching the configured database and --backup /absolute/path.jsonl.");
}
let backup;
let inspected = 0, referenced = 0, changed = 0;
try {
  if (apply) backup = await open(value("--backup"), "ax", 0o600);
  await connectDatabase();
  for await (const record of media.find({ deliveryType: { $ne: "authenticated" }, state: { $ne: "deleting" }, url: { $not: /^pending:/ } }).batchSize(100)) {
    inspected++;
    const inUse = await stories.findOne({ "items.image": record.url }, { projection: { _id: 1 } })
      || await users.findOne({ $or: [{ avatar: record.url }, { cover: record.url }] }, { projection: { _id: 1 } })
      || await conversations.findOne({ avatar: record.url }, { projection: { _id: 1 } });
    if (!inUse) continue;
    referenced++;
    if (!apply) continue;
    const url = protectedMediaUrl(record._id);
    await backup.write(JSON.stringify({ id: record._id, ownerId: record.ownerId, oldUrl: record.url, newUrl: url, at: new Date().toISOString() }) + "\n");
    await backup.sync();
    // An interrupted run may already have renamed this asset. Resume without exposing it.
    const exists = await cloudinary.api.resource(record._id, { type: "authenticated" }).then(() => true).catch((error) => {
      if (error?.http_code === 404 || error?.error?.http_code === 404) return false;
      throw new Error("Could not inspect authenticated media; no database references changed.");
    });
    if (!exists) await cloudinary.uploader.rename(record._id, record._id, { type: "upload", to_type: "authenticated", resource_type: "image", invalidate: true });
    const session = mongo.startSession();
    try {
      await session.withTransaction(async () => {
        await stories.updateMany({ "items.image": record.url }, { $set: { "items.$[item].image": url } }, { arrayFilters: [{ "item.image": record.url }], session });
        await users.updateMany({ avatar: record.url }, { $set: { avatar: url } }, { session });
        await users.updateMany({ cover: record.url }, { $set: { cover: url } }, { session });
        await conversations.updateMany({ avatar: record.url }, { $set: { avatar: url } }, { session });
        await media.updateOne({ _id: record._id, url: record.url }, { $set: { url, deliveryType: "authenticated" }, $unset: { variants: "" } }, { session });
        await enqueue("media.process", { mediaId: record._id }, { session });
      });
    } finally { await session.endSession(); }
    changed++;
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", database: config.MONGODB_DB, inspected, referenced, changed, legacyCdnInvalidation: apply ? "requested; propagation is asynchronous" : "not requested" }, null, 2));
} catch {
  process.exitCode = 1;
  console.error("Media privacy migration stopped. Keep the backup and rerun to resume; no raw service errors or credentials are printed.");
} finally {
  await backup?.close();
  await mongo.close();
  redis.disconnect();
}
