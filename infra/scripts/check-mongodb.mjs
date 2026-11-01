import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
try { process.loadEnvFile(`${root}.env`); }
catch { console.error("Không đọc được .env gốc. Kiểm tra lại file rồi chạy pnpm db:check."); process.exit(1); }
if (!process.env.MONGODB_URI) { console.error("Thiếu MONGODB_URI trong .env gốc."); process.exit(1); }
const require = createRequire(new URL("../../packages/database/package.json", import.meta.url));
const { MongoClient } = require("mongodb");
let client;
const start = Date.now();
try {
  client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 5000, maxPoolSize: 1, appName: "tellme-db-check" });
  await client.connect();
  await client.db(process.env.MONGODB_DB || "tellme").command({ ping: 1 });
  console.log(`MongoDB kết nối thành công (${Date.now() - start} ms).`);
} catch (error) {
  // Do not print the original message, URI, nested errors or credentials.
  const nodes = [...(error.reason?.servers?.values?.() || [])];
  const codes = [...new Set([error.code, error.cause?.code, ...nodes.flatMap((node) => [node.error?.code, node.error?.cause?.code])])]
    .filter((code) => typeof code === "number" || typeof code === "string" && /^[A-Z][A-Z0-9_]{1,79}$/.test(code));
  console.error("MongoDB chưa kết nối được.", { type: error.name, topology: error.reason?.type, codes });
  if (codes.includes(18) || codes.includes(8000)) console.error("Kiểm tra tên tài khoản và mật khẩu database trong .env gốc.");
  else console.error("Kiểm tra Atlas IP Access List, trạng thái cluster và mạng/VPN. Log TLS không đủ để kết luận duy nhất một nguyên nhân.");
  process.exitCode = 1;
} finally { await client?.close(); }
