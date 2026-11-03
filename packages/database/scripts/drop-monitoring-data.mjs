import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Thiếu MONGODB_URI.");
const databaseName = process.env.MONGODB_DB || "tellme";
const dropping = process.argv.includes("--confirm-drop-monitoring");
if (dropping && !process.argv.includes(`--database=${databaseName}`)) {
  throw new Error(`Xác nhận đúng cơ sở dữ liệu bằng --database=${databaseName}.`);
}

const obsoleteCollections = ["admin_audit", "server_logs", "activity_days"];
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
try {
  const db = client.db(databaseName);
  const existing = await db.listCollections({ name: { $in: obsoleteCollections } }, { nameOnly: true }).toArray();
  console.log(`Cơ sở dữ liệu: ${databaseName}. Chế độ: ${dropping ? "xóa" : "xem trước"}.`);
  for (const { name } of existing) {
    if (!dropping) {
      console.log(`Collection cần dọn: ${name}`);
      continue;
    }
    await db.collection(name).drop();
    console.log(`Đã xóa: ${name}`);
  }
  if (!existing.length) console.log("Không còn collection giám sát cũ.");
} catch (error) {
  console.error(`Không thể hoàn tất thao tác MongoDB (${error?.name || "Error"}${error?.code ? `, code ${error.code}` : ""}).`);
  process.exitCode = 1;
} finally {
  await client.close();
}
