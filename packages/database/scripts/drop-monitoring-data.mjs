import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

if (!process.argv.includes("--confirm-drop-monitoring")) {
  throw new Error("Thêm --confirm-drop-monitoring để xóa đúng dữ liệu giám sát cũ.");
}

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Thiếu MONGODB_URI trong .env.");
const databaseName = process.env.MONGODB_DB || "tellme";
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
const obsoleteCollections = ["server_logs", "activity_days"];

try {
  await client.connect();
  const db = client.db(databaseName);
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name));
  for (const name of obsoleteCollections) {
    if (!existing.has(name)) {
      console.log(`Đã bỏ qua collection không tồn tại: ${name}`);
      continue;
    }
    await db.collection(name).drop();
    console.log(`Đã xóa collection giám sát cũ: ${name}`);
  }

  if (existing.has("users")) {
    await db.collection("users").dropIndex("lastActiveAt_-1").catch((error) => {
      if (error?.code !== 27 && error?.codeName !== "IndexNotFound") throw error;
    });
    const result = await db.collection("users").updateMany(
      { lastActiveAt: { $exists: true } },
      { $unset: { lastActiveAt: "" } },
    );
    if (result.modifiedCount) console.log(`Đã bỏ trường lastActiveAt khỏi ${result.modifiedCount} tài khoản.`);
  }
} finally {
  await client.close();
}
